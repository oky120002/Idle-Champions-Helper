import type { Champion } from '../../domain/types'

function createSeededRandom(seed: number) {
  let value = seed || 1

  return () => {
    value = (value * 16807) % 2147483647
    return (value - 1) / 2147483646
  }
}

export function shuffleChampions(champions: Champion[], seed: number): Champion[] {
  const nextChampions = champions.slice()
  const random = createSeededRandom(seed)

  for (let index = nextChampions.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1))
    const current = nextChampions[index]
    const swap = nextChampions[swapIndex]

    if (!current || !swap) {
      continue
    }

    nextChampions[index] = swap
    nextChampions[swapIndex] = current
  }

  return nextChampions
}
