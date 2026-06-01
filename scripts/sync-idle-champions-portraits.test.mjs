import test from 'node:test'
import assert from 'node:assert/strict'
import os from 'node:os'
import path from 'node:path'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { PNG } from 'pngjs'
import { syncChampionPortraits } from './sync-idle-champions-portraits.mjs'

function createPng(width, height, colorByPixel) {
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

function createWrappedPngBody(pngBuffer) {
  return Buffer.concat([Buffer.from([1, 2, 3, 4]), pngBuffer])
}

async function writeJson(filePath, value) {
  await mkdir(path.dirname(filePath), { recursive: true })
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, 'utf8'))
}

async function createTempDir(t) {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'ic-portraits-'))
  t.after(async () => {
    await rm(tempDir, { recursive: true, force: true })
  })
  return tempDir
}

test('syncChampionPortraits 会生成头像文件与同步 manifest', async (t) => {
  const tempDir = await createTempDir(t)
  const inputFile = path.join(tempDir, 'definitions.json')
  const outputDir = path.join(tempDir, 'data')
  const portraitPng = createPng(6, 4, (x, y) => {
    if (x === 0 || x === 5) {
      return [0, 0, 0, 0]
    }

    return y === 0 ? [0, 0, 0, 0] : [201, 166, 94, 255]
  })
  const originalFetch = globalThis.fetch

  globalThis.fetch = async () => new Response(createWrappedPngBody(portraitPng), { status: 200 })
  t.after(() => {
    globalThis.fetch = originalFetch
  })

  await writeJson(inputFile, {
    current_time: Date.parse('2026-02-02T00:00:00Z') / 1000,
    hero_defines: [{ id: 101, seat_id: 1, portrait_graphic_id: 3001 }],
    graphic_defines: [{ id: 3001, graphic: 'Portraits/Hero_101', v: 5 }],
  })

  const result = await syncChampionPortraits({
    input: inputFile,
    outputDir,
    masterApiUrl: 'https://example.test/',
  })

  assert.equal(result.count, 1)
  const manifest = await readJson(path.join(outputDir, 'champion-portraits.manifest.json'))
  assert.equal(manifest.updatedAt, '2026-02-02')
  assert.equal(manifest.items[0].sourceGraphic, 'Portraits/Hero_101')
  assert.equal(manifest.items[0].image.path, 'v1/champion-portraits/101.png')
  const writtenPng = PNG.sync.read(await readFile(path.join(outputDir, 'champion-portraits', '101.png')))
  assert.equal(writtenPng.width, 4)
  assert.equal(writtenPng.height, 4)
})

test('syncChampionPortraits 在资源未更新时整批跳过', async (t) => {
  const tempDir = await createTempDir(t)
  const inputFile = path.join(tempDir, 'definitions.json')
  const outputDir = path.join(tempDir, 'data')
  const assetDir = path.join(outputDir, 'champion-portraits')

  await mkdir(assetDir, { recursive: true })
  await writeFile(path.join(assetDir, '101.png'), Buffer.from('existing-portrait'))
  await writeJson(path.join(outputDir, 'champion-portraits.manifest.json'), {
    updatedAt: '2026-02-02',
    items: [
      {
        championId: '101',
        sourceGraphic: 'Portraits/Hero_101',
        sourceVersion: 5,
        image: {
          path: 'v1/champion-portraits/101.png',
          width: 3,
          height: 3,
          bytes: 16,
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
  t.after(() => {
    globalThis.fetch = originalFetch
  })

  const result = await syncChampionPortraits({
    input: inputFile,
    outputDir,
  })

  assert.equal(result.skipped, true)
  assert.equal(result.count, 1)
  assert.deepEqual(await readFile(path.join(assetDir, '101.png')), Buffer.from('existing-portrait'))
})

test('syncChampionPortraits 在单头像 source 未变化时复用已有 PNG', async (t) => {
  const tempDir = await createTempDir(t)
  const inputFile = path.join(tempDir, 'definitions.json')
  const outputDir = path.join(tempDir, 'data')
  const assetDir = path.join(outputDir, 'champion-portraits')
  const existingPng = createPng(3, 3, () => [201, 166, 94, 255])

  await mkdir(assetDir, { recursive: true })
  await writeFile(path.join(assetDir, '101.png'), existingPng)
  await writeJson(path.join(outputDir, 'champion-portraits.manifest.json'), {
    updatedAt: '2026-02-02',
    items: [
      {
        championId: '101',
        sourceGraphic: 'Portraits/Hero_101',
        sourceVersion: 5,
        image: {
          path: 'v1/champion-portraits/101.png',
          width: 3,
          height: 3,
          bytes: existingPng.length,
          format: 'png',
        },
      },
    ],
  })
  await writeJson(inputFile, {
    current_time: Date.parse('2026-02-03T00:00:00Z') / 1000,
    hero_defines: [{ id: 101, seat_id: 1, portrait_graphic_id: 3001 }],
    graphic_defines: [{ id: 3001, graphic: 'Portraits/Hero_101', v: 5 }],
  })

  const originalFetch = globalThis.fetch
  globalThis.fetch = async () => {
    throw new Error('命中单头像复用时不应重新下载')
  }
  t.after(() => {
    globalThis.fetch = originalFetch
  })

  const result = await syncChampionPortraits({
    input: inputFile,
    outputDir,
    masterApiUrl: 'https://example.test/',
  })

  assert.equal(result.count, 1)
  assert.deepEqual(await readFile(path.join(assetDir, '101.png')), existingPng)
  const manifest = await readJson(path.join(outputDir, 'champion-portraits.manifest.json'))
  assert.equal(manifest.updatedAt, '2026-02-03')
  assert.equal(manifest.items[0].image.path, 'v1/champion-portraits/101.png')
})
