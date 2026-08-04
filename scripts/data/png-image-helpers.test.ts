import { it, expect } from 'vitest'
import { PNG } from 'pngjs'
import { findOpaqueBounds, cropOpaqueBounds } from './png-image-helpers.ts'

type RGBA = [number, number, number, number]

function makePng(width: number, height: number, painter: (x: number, y: number) => RGBA): PNG {
  const png = new PNG({ width, height })
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const idx = (width * y + x) * 4
      const [r, g, b, a] = painter(x, y)
      png.data[idx] = r
      png.data[idx + 1] = g
      png.data[idx + 2] = b
      png.data[idx + 3] = a
    }
  }
  return png
}

it('findOpaqueBounds 返回非透明区域包围盒（含 right/bottom）', () => {
  // 5x5，仅 (1,1)-(3,3) 不透明
  const png = makePng(5, 5, (x, y) =>
    x >= 1 && x <= 3 && y >= 1 && y <= 3 ? [255, 0, 0, 255] : [0, 0, 0, 0],
  )
  expect(findOpaqueBounds(png)).toEqual({ left: 1, top: 1, right: 3, bottom: 3, width: 3, height: 3 })
})

it('findOpaqueBounds 全透明返回 null', () => {
  const png = makePng(3, 3, () => [0, 0, 0, 0])
  expect(findOpaqueBounds(png)).toBe(null)
})

it('cropOpaqueBounds 裁剪到包围盒并标记 cropped', () => {
  const png = makePng(5, 5, (x, y) =>
    x >= 2 && x <= 3 && y >= 2 && y <= 3 ? [0, 255, 0, 255] : [0, 0, 0, 0],
  )
  const result = cropOpaqueBounds(PNG.sync.write(png))
  expect(result.width).toBe(2)
  expect(result.height).toBe(2)
  expect(result.cropped).toBe(true)
})

it('cropOpaqueBounds 无可见像素时原样返回且 cropped=false', () => {
  const png = makePng(3, 3, () => [0, 0, 0, 0])
  const original = PNG.sync.write(png)
  const result = cropOpaqueBounds(original)
  expect(result.width).toBe(3)
  expect(result.height).toBe(3)
  expect(result.cropped).toBe(false)
})

it('cropOpaqueBounds 已紧凑时 cropped=false', () => {
  const png = makePng(2, 2, () => [0, 0, 255, 255])
  const result = cropOpaqueBounds(PNG.sync.write(png))
  expect(result.cropped).toBe(false)
  expect(result.width).toBe(2)
})
