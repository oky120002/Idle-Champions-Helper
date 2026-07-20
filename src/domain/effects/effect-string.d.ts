import type { JsonValue } from '../types'
import type { ParsedEffectPayload } from '../../pages/champion-detail/types'

export declare function parseEffectPayload(value: string): ParsedEffectPayload | null

export declare function buildEffectKeyPayload(
  effectKey: Record<string, JsonValue>,
): ParsedEffectPayload | null

export declare function resolveSimpleAmountExpr(
  expr: string,
  resolveSourcePayload: (upgradeId: string, effectIndex: number) => ParsedEffectPayload | null | undefined,
): string | null

export declare function resolveEffectPayloadAmountToken(
  payload: ParsedEffectPayload,
  payloads?: Array<ParsedEffectPayload | null | undefined>,
  upgradePayloadsById?: Map<string, Array<ParsedEffectPayload | null | undefined>> | null,
): string | null

export declare function extractTargetIdsFromParsedEffectPayload(payload: ParsedEffectPayload): string[]

export declare function extractTargetIdsFromEffectString(effectString: string): string[]
