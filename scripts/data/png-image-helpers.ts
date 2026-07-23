import { PNG } from 'pngjs'

/**
 * PNG 不透明区域定位与裁剪。
 * 多个 sync 脚本（头像、装备图标、专精图、宠物、主机头像）各自复制了相同实现，统一在此维护。
 */

export interface OpaqueBounds {
  left: number
  top: number
  right: number
  bottom: number
  width: number
  height: number
}

export interface CroppedPng {
  pngBuffer: Buffer
  width: number
  height: number
  cropped: boolean
}

/**
 * 扫描 pngjs PNG 对象，返回最外层非透明像素包围盒；全透明返回 null。
 */
export function findOpaqueBounds(png: PNG): OpaqueBounds | null {
  let left = png.width
  let top = png.height
  let right = -1
  let bottom = -1

  for (let y = 0; y < png.height; y += 1) {
    for (let x = 0; x < png.width; x += 1) {
      const alpha = png.data[(png.width * y + x) * 4 + 3]

      if (alpha === 0) {
        continue
      }

      left = Math.min(left, x)
      top = Math.min(top, y)
      right = Math.max(right, x)
      bottom = Math.max(bottom, y)
    }
  }

  if (right < left || bottom < top) {
    return null
  }

  return {
    left,
    top,
    right,
    bottom,
    width: right - left + 1,
    height: bottom - top + 1,
  }
}

/**
 * 裁剪 PNG buffer 到不透明包围盒；无可见像素时原样返回。
 */
export function cropOpaqueBounds(pngBuffer: Buffer): CroppedPng {
  const source = PNG.sync.read(pngBuffer)
  const bounds = findOpaqueBounds(source)

  if (!bounds) {
    return {
      pngBuffer,
      width: source.width,
      height: source.height,
      cropped: false,
    }
  }

  const output = new PNG({ width: bounds.width, height: bounds.height })

  for (let y = 0; y < bounds.height; y += 1) {
    for (let x = 0; x < bounds.width; x += 1) {
      const sourceIndex = ((bounds.top + y) * source.width + (bounds.left + x)) * 4
      const outputIndex = (y * output.width + x) * 4

      // 索引在 source 尺寸内，noUncheckedIndexedAccess 下 data[i] 为 number|undefined，
      // 读侧用 ! 断言（循环边界保证在范围内）。
      output.data[outputIndex] = source.data[sourceIndex]!
      output.data[outputIndex + 1] = source.data[sourceIndex + 1]!
      output.data[outputIndex + 2] = source.data[sourceIndex + 2]!
      output.data[outputIndex + 3] = source.data[sourceIndex + 3]!
    }
  }

  return {
    pngBuffer: PNG.sync.write(output),
    width: output.width,
    height: output.height,
    cropped:
      bounds.width !== source.width ||
      bounds.height !== source.height ||
      bounds.left > 0 ||
      bounds.top > 0,
  }
}
