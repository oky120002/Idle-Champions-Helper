import test from 'node:test'
import assert from 'node:assert/strict'
import os from 'node:os'
import path from 'node:path'
import zlib from 'node:zlib'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { PNG } from 'pngjs'
import { syncChampionEquipmentIcons } from './sync-idle-champions-equipment-icons.mjs'

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

async function writeJson(filePath, value) {
  await mkdir(path.dirname(filePath), { recursive: true })
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, 'utf8'))
}

async function createTempDir(t) {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'ic-equipment-icons-'))
  t.after(async () => {
    await rm(tempDir, { recursive: true, force: true })
  })
  return tempDir
}

test('syncChampionEquipmentIcons 会从 champion-details 收集装备 graphicId 并输出本地图标清单', async (t) => {
  const tempDir = await createTempDir(t)
  const inputFile = path.join(tempDir, 'definitions.json')
  const outputDir = path.join(tempDir, 'data')
  const detailDir = path.join(outputDir, 'champion-details')
  const iconPng = createPng(6, 6, (x, y) => {
    if (x === 0 || y === 0 || x === 5 || y === 5) {
      return [0, 0, 0, 0]
    }

    return [235, 189, 92, 255]
  })
  const rawByUrl = new Map([
    [
      'https://example.test/mobile_assets/Items/HeroLoot/SwordEpic',
      zlib.deflateSync(iconPng),
    ],
  ])
  const originalFetch = globalThis.fetch

  globalThis.fetch = async (input) => {
    const url = String(input)
    const body = rawByUrl.get(url)

    if (!body) {
      return new Response('not found', { status: 404 })
    }

    return new Response(body, { status: 200 })
  }

  t.after(() => {
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
    concurrency: 1,
  })

  assert.equal(result.count, 1)
  assert.equal(result.outputDir, outputDir)

  const collection = await readJson(path.join(outputDir, 'champion-equipment-icons.json'))
  assert.equal(collection.items.length, 1)
  assert.equal(collection.items[0].graphicId, '1002')
  assert.equal(collection.items[0].image.path, 'v1/champion-equipment-icons/1002.png')

  const writtenPng = PNG.sync.read(await readFile(path.join(outputDir, 'champion-equipment-icons', '1002.png')))
  assert.equal(writtenPng.width, 4)
  assert.equal(writtenPng.height, 4)
})
