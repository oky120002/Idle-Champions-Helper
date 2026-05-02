import type { GameNumberValue } from './gameNumber'

/**
 * Maximum exponent difference below which the smaller term is still included
 * in the sum. Beyond this threshold the smaller value is too small to affect
 * display precision and is ignored.
 */
export const ADDITION_EXPONENT_THRESHOLD = 15

export function addGameNumbers(a: GameNumberValue, b: GameNumberValue): GameNumberValue {
  // If one value is zero, return the other directly.
  if (a.eq(0)) return b
  if (b.eq(0)) return a

  // Determine which is larger and which is smaller.
  const larger = a.gt(b) ? a : b
  const smaller = a.gt(b) ? b : a

  // If the exponent difference exceeds the threshold, the smaller term is
  // negligible for display and sort purposes — return the larger value.
  const expDiff = larger.e - smaller.e
  if (expDiff >= ADDITION_EXPONENT_THRESHOLD) {
    return larger
  }

  return a.add(b)
}
