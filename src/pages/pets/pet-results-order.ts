import type { Pet } from '../../domain/types'

function createSeededRandom(seed: number) {
  // ponytail: 0 与 NaN 视作无效种子回退到 1，保持原 `seed || 1` 的 falsy 语义
  let value = seed !== 0 && !Number.isNaN(seed) ? seed : 1

  return () => {
    value = (value * 16807) % 2147483647
    return (value - 1) / 2147483646
  }
}

export function shufflePets(pets: Pet[], seed: number): Pet[] {
  const nextPets = pets.slice()
  const random = createSeededRandom(seed)

  for (let index = nextPets.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1))
    const current = nextPets[index]
    const swap = nextPets[swapIndex]

    if (!current || !swap) {
      continue
    }

    nextPets[index] = swap
    nextPets[swapIndex] = current
  }

  return nextPets
}
