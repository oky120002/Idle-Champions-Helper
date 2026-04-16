import { PNG } from 'pngjs'

const NEIGHBOR_OFFSETS_8 = [
  [-1, -1],
  [0, -1],
  [1, -1],
  [-1, 0],
  [1, 0],
  [-1, 1],
  [0, 1],
  [1, 1],
]

function getAlphaAt(png, x, y) {
  return png.data[(png.width * y + x) * 4 + 3]
}

function computeComponentBboxGap(left, right) {
  const deltaX = Math.max(0, right.minX - left.maxX - 1, left.minX - right.maxX - 1)
  const deltaY = Math.max(0, right.minY - left.maxY - 1, left.minY - right.maxY - 1)
  return Math.hypot(deltaX, deltaY)
}

function collectAlphaComponents(png, alphaThreshold) {
  const visited = new Uint8Array(png.width * png.height)
  const components = []

  for (let y = 0; y < png.height; y += 1) {
    for (let x = 0; x < png.width; x += 1) {
      const index = y * png.width + x

      if (visited[index]) {
        continue
      }

      visited[index] = 1

      if (getAlphaAt(png, x, y) < alphaThreshold) {
        continue
      }

      const queue = [[x, y]]
      let cursor = 0
      let area = 0
      let minX = x
      let minY = y
      let maxX = x
      let maxY = y

      while (cursor < queue.length) {
        const [currentX, currentY] = queue[cursor]
        cursor += 1
        area += 1
        minX = Math.min(minX, currentX)
        minY = Math.min(minY, currentY)
        maxX = Math.max(maxX, currentX)
        maxY = Math.max(maxY, currentY)

        for (const [offsetX, offsetY] of NEIGHBOR_OFFSETS_8) {
          const nextX = currentX + offsetX
          const nextY = currentY + offsetY

          if (nextX < 0 || nextY < 0 || nextX >= png.width || nextY >= png.height) {
            continue
          }

          const nextIndex = nextY * png.width + nextX

          if (visited[nextIndex]) {
            continue
          }

          visited[nextIndex] = 1

          if (getAlphaAt(png, nextX, nextY) >= alphaThreshold) {
            queue.push([nextX, nextY])
          }
        }
      }

      components.push({
        area,
        minX,
        minY,
        maxX,
        maxY,
      })
    }
  }

  return components.sort((left, right) => right.area - left.area)
}

export function analyzeIllustrationAlphaPngBuffer(buffer, options = {}) {
  const alphaThreshold = Math.max(1, Math.min(255, Number(options.alphaThreshold ?? 128)))
  const png = PNG.sync.read(buffer)
  const components = collectAlphaComponents(png, alphaThreshold)
  const solidPixelCount = components.reduce((sum, component) => sum + component.area, 0)

  if (solidPixelCount === 0) {
    return {
      width: png.width,
      height: png.height,
      alphaThreshold,
      solidPixelCount: 0,
      fillRatio: 0,
      componentCount: 0,
      significantComponentCount: 0,
      largestComponentRatio: 0,
      secondComponentRatio: 0,
      detachedSignificantAreaRatio: 0,
      isolationScore: 0,
    }
  }

  const minComponentPixels = Math.max(1, Number(options.minComponentPixels ?? 25))
  const minComponentRatio = Math.max(0, Number(options.minComponentRatio ?? 0.002))
  const significantComponents = components.filter((component) => component.area >= Math.max(minComponentPixels, solidPixelCount * minComponentRatio))
  const mainComponent = significantComponents[0] ?? components[0]
  const detachedComponents = significantComponents.slice(1)
  const detachedSignificantArea = detachedComponents.reduce((sum, component) => sum + component.area, 0)
  const maxCanvasEdge = Math.max(png.width, png.height)
  const isolationScore =
    maxCanvasEdge > 0
      ? detachedComponents.reduce(
          (sum, component) =>
            sum +
            (component.area / solidPixelCount) * (computeComponentBboxGap(mainComponent, component) / maxCanvasEdge),
          0,
        )
      : 0

  return {
    width: png.width,
    height: png.height,
    alphaThreshold,
    solidPixelCount,
    fillRatio: solidPixelCount / (png.width * png.height),
    componentCount: components.length,
    significantComponentCount: significantComponents.length,
    largestComponentRatio: components[0].area / solidPixelCount,
    secondComponentRatio: components[1] ? components[1].area / solidPixelCount : 0,
    detachedSignificantAreaRatio: detachedSignificantArea / solidPixelCount,
    isolationScore,
  }
}
