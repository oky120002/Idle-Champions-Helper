import os from 'node:os'
import path from 'node:path'
import zlib from 'node:zlib'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { it, expect } from 'vitest'
import { PNG } from 'pngjs'
import { readJson, writeJson } from './data/io-utils.ts'
import { syncChampionSpecializationGraphics } from './sync-idle-champions-specialization-graphics.ts'

interface TestHooks {
  onTestFinished(fn: () => Promise<void> | void): void
}

function createPng(
  width: number,
  height: number,
  colorByPixel: (x: number, y: number) => [number, number, number, number],
): Buffer {
  const png = new PNG({ width, height })

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = (width * y + x) << 2
      const [r, g, b, a] = colorByPixel(x, y)
      png.data[index] = r
      png.data[index + 1] = g
      png.data[index + 2] = b
      png.data[index + 3] = a
    }
  }

  return PNG.sync.write(png)
}

async function createTempDir(hooks: TestHooks): Promise<string> {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'ic-specialization-graphics-'))
  hooks.onTestFinished(async () => {
    await rm(tempDir, { recursive: true, force: true })
  })
  return tempDir
}

it('syncChampionSpecializationGraphics 会输出专精图集合与裁剪后的 PNG', async (ctx) => {
  const tempDir = await createTempDir(ctx)
  const inputFile = path.join(tempDir, 'definitions.json')
  const outputDir = path.join(tempDir, 'data')
  const detailDir = path.join(outputDir, 'champion-details')
  const graphicPng = createPng(6, 6, (x, y) => {
    if (x === 0 || y === 0 || x === 5 || y === 5) {
      return [0, 0, 0, 0]
    }

    return [72, 168, 236, 255]
  })
  const originalFetch = globalThis.fetch

  globalThis.fetch = async () => new Response(zlib.deflateSync(graphicPng), { status: 200 })
  ctx.onTestFinished(() => {
    globalThis.fetch = originalFetch
  })

  await writeJson(inputFile, {
    current_time: Date.parse('2026-02-02T00:00:00Z') / 1000,
    graphic_defines: [
      {
        id: 2001,
        graphic: 'UI/Specializations/Choice_1',
        v: 4,
        export_params: { uses: ['crusader'] },
      },
    ],
  })
  await writeJson(path.join(detailDir, '1.json'), {
    upgrades: [{ specializationGraphicId: '2001' }],
    attacks: { ultimate: { graphicId: null } },
  })

  const result = await syncChampionSpecializationGraphics({
    input: inputFile,
    outputDir,
    detailDir,
    currentVersion: 'v1',
    masterApiUrl: 'https://example.test/',
  })

  expect(result.count).toBe(1)
  const collection = (await readJson(path.join(outputDir, 'champion-specialization-graphics.json'))) as {
    updatedAt: string
    items: Array<{ graphicId: string }>
  }
  expect(collection.updatedAt).toBe('2026-02-02')
  expect(collection.items[0]?.graphicId).toBe('2001')
  const writtenPng = PNG.sync.read(
    await readFile(path.join(outputDir, 'champion-specialization-graphics', '2001.png')),
  )
  expect(writtenPng.width).toBe(4)
  expect(writtenPng.height).toBe(4)
})

it('syncChampionSpecializationGraphics 在集合 updatedAt 未变新时整批跳过', async (ctx) => {
  const tempDir = await createTempDir(ctx)
  const inputFile = path.join(tempDir, 'definitions.json')
  const outputDir = path.join(tempDir, 'data')
  const assetDir = path.join(outputDir, 'champion-specialization-graphics')

  await mkdir(assetDir, { recursive: true })
  await writeFile(path.join(assetDir, '2001.png'), Buffer.from('existing-specialization'))
  await writeJson(path.join(outputDir, 'champion-specialization-graphics.json'), {
    updatedAt: '2026-02-02',
    items: [
      {
        graphicId: '2001',
        sourceGraphic: 'UI/Specializations/Choice_1',
        sourceVersion: 4,
        image: {
          path: 'v1/champion-specialization-graphics/2001.png',
          width: 4,
          height: 4,
          bytes: 23,
          format: 'png',
        },
      },
    ],
  })
  await writeJson(inputFile, {
    current_time: Date.parse('2026-02-02T00:00:00Z') / 1000,
    graphic_defines: [],
  })

  const originalFetch = globalThis.fetch
  globalThis.fetch = async () => {
    throw new Error('不应触发下载')
  }
  ctx.onTestFinished(() => {
    globalThis.fetch = originalFetch
  })

  const result = await syncChampionSpecializationGraphics({
    input: inputFile,
    outputDir,
    detailDir: path.join(outputDir, 'missing-details'),
  })

  expect(result.skipped).toBe(true)
  expect(result.count).toBe(1)
  expect(await readFile(path.join(assetDir, '2001.png'))).toEqual(
    Buffer.from('existing-specialization'),
  )
})

it('syncChampionSpecializationGraphics 在资源 source 未变化时复用已有 PNG', async (ctx) => {
  const tempDir = await createTempDir(ctx)
  const inputFile = path.join(tempDir, 'definitions.json')
  const outputDir = path.join(tempDir, 'data')
  const detailDir = path.join(outputDir, 'champion-details')
  const assetDir = path.join(outputDir, 'champion-specialization-graphics')
  const existingPng = createPng(4, 4, () => [72, 168, 236, 255])

  await mkdir(assetDir, { recursive: true })
  await writeFile(path.join(assetDir, '2001.png'), existingPng)
  await writeJson(path.join(outputDir, 'champion-specialization-graphics.json'), {
    updatedAt: '2026-02-02',
    items: [
      {
        graphicId: '2001',
        sourceGraphic: 'UI/Specializations/Choice_1',
        sourceVersion: 4,
        remotePath: 'mobile_assets/UI/Specializations/Choice_1',
        remoteUrl: 'https://example.test/mobile_assets/UI/Specializations/Choice_1',
        delivery: 'wrapped-png',
        uses: ['crusader'],
        image: {
          path: 'v1/champion-specialization-graphics/2001.png',
          width: 4,
          height: 4,
          bytes: existingPng.length,
          format: 'png',
        },
      },
    ],
  })
  await writeJson(path.join(detailDir, '1.json'), {
    upgrades: [{ specializationGraphicId: '2001' }],
    attacks: { ultimate: { graphicId: null } },
  })
  await writeJson(inputFile, {
    current_time: Date.parse('2026-02-03T00:00:00Z') / 1000,
    graphic_defines: [
      {
        id: 2001,
        graphic: 'UI/Specializations/Choice_1',
        v: 4,
        export_params: { uses: ['crusader'] },
      },
    ],
  })

  const originalFetch = globalThis.fetch
  globalThis.fetch = async () => {
    throw new Error('命中单资源复用时不应重新下载')
  }
  ctx.onTestFinished(() => {
    globalThis.fetch = originalFetch
  })

  const result = await syncChampionSpecializationGraphics({
    input: inputFile,
    outputDir,
    detailDir,
    currentVersion: 'v1',
    masterApiUrl: 'https://example.test/',
  })

  expect(result.count).toBe(1)
  expect(await readFile(path.join(assetDir, '2001.png'))).toEqual(existingPng)
  const collection = (await readJson(path.join(outputDir, 'champion-specialization-graphics.json'))) as {
    updatedAt: string
    items: Array<{ image: { path: string } }>
  }
  expect(collection.updatedAt).toBe('2026-02-03')
  expect(collection.items[0]?.image.path).toBe('v1/champion-specialization-graphics/2001.png')
})
