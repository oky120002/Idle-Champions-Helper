import os from 'node:os'
import path from 'node:path'
import zlib from 'node:zlib'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { it, expect } from 'vitest'
import { PNG } from 'pngjs'
import { readJson, writeJson } from './data/io-utils.ts'
import { syncChampionEquipmentIcons } from './sync-idle-champions-equipment-icons.ts'

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
  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'ic-equipment-icons-'))
  hooks.onTestFinished(async () => {
    await rm(tempDir, { recursive: true, force: true })
  })
  return tempDir
}

it('syncChampionEquipmentIcons 会从 champion-details 收集装备 graphicId 并输出本地图标清单', async (ctx) => {
  const tempDir = await createTempDir(ctx)
  const inputFile = path.join(tempDir, 'definitions.json')
  const outputDir = path.join(tempDir, 'data')
  const detailDir = path.join(outputDir, 'champion-details')
  const iconPng = createPng(6, 6, (x, y) => {
    if (x === 0 || y === 0 || x === 5 || y === 5) {
      return [0, 0, 0, 0]
    }

    return [235, 189, 92, 255]
  })
  const rawByUrl = new Map<string, Buffer>([
    [
      'https://example.test/mobile_assets/Items/HeroLoot/SwordEpic',
      zlib.deflateSync(iconPng),
    ],
  ])
  const originalFetch = globalThis.fetch

  globalThis.fetch = async (input) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
    const body = rawByUrl.get(url)

    if (!body) {
      return new Response('not found', { status: 404 })
    }

    return new Response(body as unknown as BodyInit, { status: 200 })
  }

  ctx.onTestFinished(() => {
    globalThis.fetch = originalFetch
  })

  await writeJson(inputFile, {
    current_time: 1770000000,
    graphic_defines: [
      {
        id: 1002,
        graphic: 'Items/HeroLoot/SwordEpic',
        export_params: { uses: ['hero_loot'] },
      },
    ],
  })

  await writeJson(path.join(detailDir, '1.json'), {
    loot: [
      { slotId: 1, graphicId: '1002' },
      { slotId: 2, graphicId: '1002' },
      { slotId: 3, graphicId: null },
    ],
  })

  const result = await syncChampionEquipmentIcons({
    input: inputFile,
    outputDir,
    detailDir,
    currentVersion: 'v1',
    masterApiUrl: 'https://example.test/',
    concurrency: '1',
  })

  expect(result.count).toBe(1)
  expect(result.outputDir).toBe(outputDir)

  const collection = (await readJson(path.join(outputDir, 'champion-equipment-icons.json'))) as {
    items: Array<{ graphicId: string; image: { path: string } }>
  }
  expect(collection.items.length).toBe(1)
  expect(collection.items[0]?.graphicId).toBe('1002')
  expect(collection.items[0]?.image.path).toBe('v1/champion-equipment-icons/1002.png')

  const writtenPng = PNG.sync.read(await readFile(path.join(outputDir, 'champion-equipment-icons', '1002.png')))
  expect(writtenPng.width).toBe(4)
  expect(writtenPng.height).toBe(4)
})

it('syncChampionEquipmentIcons 在集合 updatedAt 未变新时整批跳过，不清目录也不发下载', async (ctx) => {
  const tempDir = await createTempDir(ctx)
  const inputFile = path.join(tempDir, 'definitions.json')
  const outputDir = path.join(tempDir, 'data')
  const assetDir = path.join(outputDir, 'champion-equipment-icons')

  await mkdir(assetDir, { recursive: true })
  await writeFile(path.join(assetDir, '1002.png'), Buffer.from('existing-icon'))
  await writeJson(path.join(outputDir, 'champion-equipment-icons.json'), {
    updatedAt: '2026-02-02',
    items: [
      {
        graphicId: '1002',
        sourceGraphic: 'Items/HeroLoot/SwordEpic',
        sourceVersion: 3,
        image: {
          path: 'v1/champion-equipment-icons/1002.png',
          width: 4,
          height: 4,
          bytes: 13,
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

  const result = await syncChampionEquipmentIcons({
    input: inputFile,
    outputDir,
    detailDir: path.join(outputDir, 'missing-details'),
  })

  expect(result.skipped).toBe(true)
  expect(result.count).toBe(1)
  expect(await readFile(path.join(assetDir, '1002.png'))).toEqual(Buffer.from('existing-icon'))
})

it('syncChampionEquipmentIcons 在 definitions 更新时间变新但单资源 source 未变化时复用本地文件', async (ctx) => {
  const tempDir = await createTempDir(ctx)
  const inputFile = path.join(tempDir, 'definitions.json')
  const outputDir = path.join(tempDir, 'data')
  const detailDir = path.join(outputDir, 'champion-details')
  const assetDir = path.join(outputDir, 'champion-equipment-icons')
  const existingPng = createPng(4, 4, () => [235, 189, 92, 255])

  await mkdir(assetDir, { recursive: true })
  await writeFile(path.join(assetDir, '1002.png'), existingPng)
  await writeJson(path.join(outputDir, 'champion-equipment-icons.json'), {
    updatedAt: '2026-02-02',
    items: [
      {
        graphicId: '1002',
        sourceGraphic: 'Items/HeroLoot/SwordEpic',
        sourceVersion: 3,
        remotePath: 'mobile_assets/Items/HeroLoot/SwordEpic',
        remoteUrl: 'https://example.test/mobile_assets/Items/HeroLoot/SwordEpic',
        delivery: 'wrapped-png',
        uses: ['hero_loot'],
        image: {
          path: 'v1/champion-equipment-icons/1002.png',
          width: 4,
          height: 4,
          bytes: existingPng.length,
          format: 'png',
        },
      },
    ],
  })
  await writeJson(path.join(detailDir, '1.json'), {
    loot: [{ slotId: 1, graphicId: '1002' }],
  })
  await writeJson(inputFile, {
    current_time: Date.parse('2026-02-03T00:00:00Z') / 1000,
    graphic_defines: [
      {
        id: 1002,
        graphic: 'Items/HeroLoot/SwordEpic',
        v: 3,
        export_params: { uses: ['hero_loot'] },
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

  const result = await syncChampionEquipmentIcons({
    input: inputFile,
    outputDir,
    detailDir,
    currentVersion: 'v1',
    masterApiUrl: 'https://example.test/',
  })

  expect(result.skipped).toBe(undefined)
  expect(result.count).toBe(1)
  expect(await readFile(path.join(assetDir, '1002.png'))).toEqual(existingPng)
  const collection = (await readJson(path.join(outputDir, 'champion-equipment-icons.json'))) as {
    updatedAt: string
    items: Array<{ image: { path: string } }>
  }
  expect(collection.updatedAt).toBe('2026-02-03')
  expect(collection.items[0]?.image.path).toBe('v1/champion-equipment-icons/1002.png')
})
