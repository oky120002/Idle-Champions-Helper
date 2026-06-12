import type { JsonValue } from '../types'
import type { ParsedEffectPayload } from '../../pages/champion-detail/types'

export declare function parseEffectPayload(value: string): ParsedEffectPayload | null

export declare function buildEffectKeyPayload(
  effectKey: Record<string, JsonValue>,
): ParsedEffectPayload | null

export declare function resolveSimpleAmountExpr(
  expr: string,
  payloads: Array<ParsedEffectPayload | null | undefined>,
): string | null

export declare function resolveEffectPayloadAmountToken(
  payload: ParsedEffectPayload,
  payloads?: Array<ParsedEffectPayload | null | undefined>,
): string | null

export declare function extractTargetIdsFromParsedEffectPayload(payload: ParsedEffectPayload): string[]

export declare function extractTargetIdsFromEffectString(effectString: string): string[]
