import type { GameNumberValue } from './gameNumber'

export function multiplyGameNumbers(a: GameNumberValue, b: GameNumberValue): GameNumberValue {
  return a.mul(b)
}

export function divideGameNumbers(a: GameNumberValue, b: GameNumberValue): GameNumberValue {
  return a.div(b)
}

export function powerGameNumber(base: GameNumberValue, exponent: number): GameNumberValue {
  return base.pow(exponent)
}

export function log10GameNumber(value: GameNumberValue): number {
  return value.log10().toNumber()
}

export function compareGameNumbers(a: GameNumberValue, b: GameNumberValue): number {
  if (a.lt(b)) return -1
  if (a.gt(b)) return 1
  return 0
}

export function sortGameNumbers(values: GameNumberValue[]): GameNumberValue[] {
  return [...values].sort(compareGameNumbers)
}
