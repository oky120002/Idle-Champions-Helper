import test from 'node:test'
import assert from 'node:assert/strict'
import os from 'node:os'
import path from 'node:path'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { PNG } from 'pngjs'
import { syncChampionConsolePortraits } from './sync-idle-champions-console-portraits.mjs'

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
  return Buffer.concat([Buffer.from([9, 8, 7, 6]), pngBuffer])
}

async function writeJson(filePath, value) {
  await mkdir(path.dirname(filePath), { recursive: true })
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, 'utf8'))
}

async function createTempDir(t) {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'ic-console-portraits-'))
  t.after(async () => {
    await rm(tempDir, { recursive: true, force: true })
  })
  return tempDir
}

test('syncChampionConsolePortraits 会生成正面图文件与同步 manifest', async (t) => {
  const tempDir = await createTempDir(t)
  const inputFile = path.join(tempDir, 'definitions.json')
  const outputDir = path.join(tempDir, 'data')
  const portraitPng = createPng(5, 5, (x, y) => {
    if (x === 0 || y === 0) {
      return [0, 0, 0, 0]
    }

    return [108, 201, 172, 255]
  })
  const originalFetch = globalThis.fetch

  globalThis.fetch = async () => new Response(createWrappedPngBody(portraitPng), { status: 200 })
  t.after(() => {
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

  assert.equal(result.count, 1)
  const manifest = await readJson(path.join(outputDir, 'champion-console-portraits.manifest.json'))
  assert.equal(manifest.updatedAt, '2026-02-02')
  assert.equal(manifest.items[0].sourceGraphic, 'Portraits/Console/Hero_101')
  assert.equal(manifest.items[0].image.path, 'v1/champion-console-portraits/101.png')
  const writtenPng = PNG.sync.read(
    await readFile(path.join(outputDir, 'champion-console-portraits', '101.png')),
  )
  assert.equal(writtenPng.width, 4)
  assert.equal(writtenPng.height, 4)
})

test('syncChampionConsolePortraits 在资源未更新时整批跳过', async (t) => {
  const tempDir = await createTempDir(t)
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
  t.after(() => {
    globalThis.fetch = originalFetch
  })

  const result = await syncChampionConsolePortraits({
    input: inputFile,
    outputDir,
  })

  assert.equal(result.skipped, true)
  assert.equal(result.count, 1)
  assert.deepEqual(
    await readFile(path.join(assetDir, '101.png')),
    Buffer.from('existing-console-portrait'),
  )
})

test('syncChampionConsolePortraits 在单资源 source 未变化时复用已有 PNG', async (t) => {
  const tempDir = await createTempDir(t)
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
  t.after(() => {
    globalThis.fetch = originalFetch
  })

  const result = await syncChampionConsolePortraits({
    input: inputFile,
    outputDir,
    masterApiUrl: 'https://example.test/',
  })

  assert.equal(result.count, 1)
  assert.deepEqual(await readFile(path.join(assetDir, '101.png')), existingPng)
  const manifest = await readJson(path.join(outputDir, 'champion-console-portraits.manifest.json'))
  assert.equal(manifest.updatedAt, '2026-02-03')
  assert.equal(manifest.items[0].image.path, 'v1/champion-console-portraits/101.png')
})
