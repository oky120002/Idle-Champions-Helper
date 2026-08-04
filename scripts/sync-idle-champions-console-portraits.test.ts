import os from 'node:os'
import path from 'node:path'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { it, expect } from 'vitest'
import { PNG } from 'pngjs'
import { readJson, writeJson } from './data/io-utils.ts'
import { syncChampionConsolePortraits } from './sync-idle-champions-console-portraits.ts'

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

function createWrappedPngBody(pngBuffer: Buffer): Buffer {
  return Buffer.concat([Buffer.from([9, 8, 7, 6]), pngBuffer])
}

async function createTempDir(hooks: TestHooks): Promise<string> {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'ic-console-portraits-'))
  hooks.onTestFinished(async () => {
    await rm(tempDir, { recursive: true, force: true })
  })
  return tempDir
}

it('syncChampionConsolePortraits 会生成正面图文件与同步 manifest', async (ctx) => {
  const tempDir = await createTempDir(ctx)
  const inputFile = path.join(tempDir, 'definitions.json')
  const outputDir = path.join(tempDir, 'data')
  const portraitPng = createPng(5, 5, (x, y) => {
    if (x === 0 || y === 0) {
      return [0, 0, 0, 0]
    }

    return [108, 201, 172, 255]
  })
  const originalFetch = globalThis.fetch

  globalThis.fetch = async () => new Response(createWrappedPngBody(portraitPng) as unknown as BodyInit, { status: 200 })
  ctx.onTestFinished(() => {
    globalThis.fetch = originalFetch
  })

  await writeJson(inputFile, {
    current_time: Date.parse('2026-02-02T00:00:00Z') / 1000,
    hero_defines: [{ id: 101, seat_id: 1, console_portrait: 4001 }],
    graphic_defines: [{ id: 4001, graphic: 'Portraits/Console/Hero_101', v: 7 }],
  })

  const result = await syncChampionConsolePortraits({
    input: inputFile,
    outputDir,
    masterApiUrl: 'https://example.test/',
  })

  expect(result.count).toBe(1)
  const manifest = (await readJson(path.join(outputDir, 'champion-console-portraits.manifest.json'))) as {
    updatedAt: string
    items: Array<{ sourceGraphic: string; image: { path: string } }>
  }
  expect(manifest.updatedAt).toBe('2026-02-02')
  expect(manifest.items[0]?.sourceGraphic).toBe('Portraits/Console/Hero_101')
  expect(manifest.items[0]?.image.path).toBe('v1/champion-console-portraits/101.png')
  const writtenPng = PNG.sync.read(
    await readFile(path.join(outputDir, 'champion-console-portraits', '101.png')),
  )
  expect(writtenPng.width).toBe(4)
  expect(writtenPng.height).toBe(4)
})

it('syncChampionConsolePortraits 在资源未更新时整批跳过', async (ctx) => {
  const tempDir = await createTempDir(ctx)
  const inputFile = path.join(tempDir, 'definitions.json')
  const outputDir = path.join(tempDir, 'data')
  const assetDir = path.join(outputDir, 'champion-console-portraits')

  await mkdir(assetDir, { recursive: true })
  await writeFile(path.join(assetDir, '101.png'), Buffer.from('existing-console-portrait'))
  await writeJson(path.join(outputDir, 'champion-console-portraits.manifest.json'), {
    updatedAt: '2026-02-02',
    items: [
      {
        championId: '101',
        sourceGraphic: 'Portraits/Console/Hero_101',
        sourceVersion: 7,
        image: {
          path: 'v1/champion-console-portraits/101.png',
          width: 4,
          height: 4,
          bytes: 24,
          format: 'png',
        },
      },
    ],
  })
  await writeJson(inputFile, {
    current_time: Date.parse('2026-02-02T00:00:00Z') / 1000,
    hero_defines: [],
    graphic_defines: [],
  })

  const originalFetch = globalThis.fetch
  globalThis.fetch = async () => {
    throw new Error('不应触发下载')
  }
  ctx.onTestFinished(() => {
    globalThis.fetch = originalFetch
  })

  const result = await syncChampionConsolePortraits({
    input: inputFile,
    outputDir,
  })

  expect(result.skipped).toBe(true)
  expect(result.count).toBe(1)
  expect(await readFile(path.join(assetDir, '101.png'))).toEqual(
    Buffer.from('existing-console-portrait'),
  )
})

it('syncChampionConsolePortraits 在单资源 source 未变化时复用已有 PNG', async (ctx) => {
  const tempDir = await createTempDir(ctx)
  const inputFile = path.join(tempDir, 'definitions.json')
  const outputDir = path.join(tempDir, 'data')
  const assetDir = path.join(outputDir, 'champion-console-portraits')
  const existingPng = createPng(4, 4, () => [108, 201, 172, 255])

  await mkdir(assetDir, { recursive: true })
  await writeFile(path.join(assetDir, '101.png'), existingPng)
  await writeJson(path.join(outputDir, 'champion-console-portraits.manifest.json'), {
    updatedAt: '2026-02-02',
    items: [
      {
        championId: '101',
        sourceGraphic: 'Portraits/Console/Hero_101',
        sourceVersion: 7,
        image: {
          path: 'v1/champion-console-portraits/101.png',
          width: 4,
          height: 4,
          bytes: existingPng.length,
          format: 'png',
        },
      },
    ],
  })
  await writeJson(inputFile, {
    current_time: Date.parse('2026-02-03T00:00:00Z') / 1000,
    hero_defines: [{ id: 101, seat_id: 1, console_portrait: 4001 }],
    graphic_defines: [{ id: 4001, graphic: 'Portraits/Console/Hero_101', v: 7 }],
  })

  const originalFetch = globalThis.fetch
  globalThis.fetch = async () => {
    throw new Error('命中单资源复用时不应重新下载')
  }
  ctx.onTestFinished(() => {
    globalThis.fetch = originalFetch
  })

  const result = await syncChampionConsolePortraits({
    input: inputFile,
    outputDir,
    masterApiUrl: 'https://example.test/',
  })

  expect(result.count).toBe(1)
  expect(await readFile(path.join(assetDir, '101.png'))).toEqual(existingPng)
  const manifest = (await readJson(path.join(outputDir, 'champion-console-portraits.manifest.json'))) as {
    updatedAt: string
    items: Array<{ image: { path: string } }>
  }
  expect(manifest.updatedAt).toBe('2026-02-03')
  expect(manifest.items[0]?.image.path).toBe('v1/champion-console-portraits/101.png')
})
