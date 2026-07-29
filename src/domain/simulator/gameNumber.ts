import Decimal from 'decimal.js'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** The underlying big-number value used by the simulator layer. */
export type GameNumberValue = Decimal

/** Options for formatting a game number to a display string. */
export interface FormatOptions {
  /** Number of decimal places for the mantissa. Default: 2 */
  decimalPlaces?: number
}

/** Successful parse result. */
export interface GameNumberOk {
  ok: true
  value: GameNumberValue
}

/** Failed parse result – never throws. */
export interface GameNumberError {
  ok: false
  error: string
}

/** Discriminated union returned by `parseGameNumber`. */
export type GameNumberResult = GameNumberOk | GameNumberError

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const INPUT_EMPTY = 'input is empty'
const INPUT_NAN = 'input is NaN'
const INPUT_INFINITE = 'input is infinite'
const INPUT_UNPARSABLE = 'input is not a valid number string'

function isBlank(s: string): boolean {
  return s.trim().length === 0
}

// ---------------------------------------------------------------------------
// Parse
// ---------------------------------------------------------------------------

/**
 * Parse a string or number into a `GameNumberValue`.
 *
 * Returns a discriminated union: `{ ok: true, value }` on success,
 * `{ ok: false, error }` on failure – never throws.
 */
export function parseGameNumber(input: string | number): GameNumberResult {
  // --- number path ---
  if (typeof input === 'number') {
    if (Number.isNaN(input)) {
      return { ok: false, error: INPUT_NAN }
    }
    if (!Number.isFinite(input)) {
      return { ok: false, error: INPUT_INFINITE }
    }
    return { ok: true, value: new Decimal(input) }
  }

  // --- string path ---
  if (isBlank(input)) {
    return { ok: false, error: INPUT_EMPTY }
  }

  // decimal.js throws on unparseable strings (unlike a NaN-returning parser).
  let parsed: Decimal
  try {
    parsed = new Decimal(input)
  } catch {
    return { ok: false, error: INPUT_UNPARSABLE }
  }

  // Reject non-finite results produced from strings like "NaN" or "Infinity".
  if (!parsed.isFinite()) {
    return { ok: false, error: INPUT_UNPARSABLE }
  }

  return { ok: true, value: parsed }
}

// ---------------------------------------------------------------------------
// Format
// ---------------------------------------------------------------------------

/**
 * Format a `GameNumberValue` to a display string.
 *
 * - Zero → `"0"`.
 * - Small integers (|value| < 1e6) → plain notation (e.g. `"42"`).
 * - Otherwise → scientific notation `mantissa e exponent`
 *   (e.g. `"1.50e92"`, `"1.00e1000"`).
 *
 * mantissa/exponent are computed manually so the output stays stable
 * regardless of the underlying library's toString/toExponential quirks.
 */
export function formatGameNumber(
  value: GameNumberValue,
  options?: FormatOptions,
): string {
  const places = options?.decimalPlaces ?? 2

  // Zero is a special case – always plain "0".
  if (value.eq(0)) {
    return '0'
  }

  // Small integers: use plain notation.
  if (value.abs().lt(1e6) && value.eq(value.floor())) {
    return value.toNumber().toString()
  }

  // decimal.js exposes the base-10 exponent as `.e`
  // (value = mantissa × 10^e, mantissa ∈ [1,10)).
  const exponent = value.e
  const mantissa = value.div(new Decimal(10).pow(exponent))
  return mantissa.toFixed(places) + 'e' + exponent
}

// ---------------------------------------------------------------------------
// Arithmetic
// ---------------------------------------------------------------------------

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
  return value.log(10).toNumber()
}

export function compareGameNumbers(a: GameNumberValue, b: GameNumberValue): number {
  if (a.lt(b)) return -1
  if (a.gt(b)) return 1
  return 0
}

export function sortGameNumbers(values: GameNumberValue[]): GameNumberValue[] {
  return [...values].sort(compareGameNumbers)
}

// ---------------------------------------------------------------------------
// Addition
// ---------------------------------------------------------------------------

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
