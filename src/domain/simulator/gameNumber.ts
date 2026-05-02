import Decimal from 'break_eternity.js'

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

  const parsed = new Decimal(input)

  // break_eternity.js returns NaN Decimal for unparseable strings.
  if (Decimal.isNaN(parsed)) {
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
 * - Small integers (absolute value < 1e6) use plain notation (e.g. `"42"`).
 * - Values ≤ `Number.MAX_VALUE` use standard scientific notation
 *   (e.g. `"1.50e92"`).
 * - Values beyond `Number.MAX_VALUE` use the game-style notation
 *   produced by `break_eternity.js` (e.g. `"ee1000"`, `"e1e6"`).
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

  // Layer 0 values that fit in a JS number: mantissa.toFixed(N) + "e" + exponent.
  if (value.layer === 0) {
    return value.m.toFixed(places) + 'e' + value.e
  }

  // Layer 1 (e.g. 1e1000): mantissa.toFixed(N) + "e" + exponent.
  if (value.layer === 1) {
    return value.m.toFixed(places) + 'e' + value.e
  }

  // Layer 2+: delegate to break_eternity.js toString,
  // which produces "eeX", "eeeX", etc.
  return value.toStringWithDecimalPlaces(places)
}
