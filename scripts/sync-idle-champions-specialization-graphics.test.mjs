import test from 'node:test'
import assert from 'node:assert/strict'
import { PNG } from 'pngjs'
import { cropOpaqueBounds } from './sync-idle-champions-specialization-graphics.mjs'

function createPng(width, height, colorAt) {
  const png = new PNG({ width, height })

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = (width * y + x) << 2
      const [r, g, b, a] = colorAt(x, y)
      png.data[index] = r
      png.data[index + 1] = g
      png.data[index + 2] = b
      png.data[index + 3] = a
    }
  }

  return PNG.sync.write(png)
}

test('cropOpaqueBounds 会裁掉右侧和下侧留白，不再回填成方图', () => {
  const source = createPng(8, 8, (x, y) => {
    if (x <= 2 && y <= 4) {
      return [255, 255, 255, 255]
    }

    return [0, 0, 0, 0]
  })

  const cropped = cropOpaqueBounds(source)
  const png = PNG.sync.read(cropped.pngBuffer)

  assert.equal(png.width, 3)
  assert.equal(png.height, 5)

  for (let y = 0; y < png.height; y += 1) {
    for (let x = 0; x < png.width; x += 1) {
      assert.equal(png.data[(y * png.width + x) * 4 + 3], 255)
    }
  }
})

test('cropOpaqueBounds 在已经贴边的图片上保持原尺寸', () => {
  const source = createPng(4, 4, (x, y) => (x === 3 && y === 3 ? [255, 0, 0, 255] : [0, 0, 0, 0]))
  const cropped = cropOpaqueBounds(source)
  const png = PNG.sync.read(cropped.pngBuffer)

  assert.equal(png.width, 1)
  assert.equal(png.height, 1)
  assert.equal(cropped.cropped, true)
})
