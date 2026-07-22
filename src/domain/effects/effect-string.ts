import type { JsonValue } from '../types'
import type { ParsedEffectPayload } from '../../pages/champion-detail/types'

function isNumberishToken(value: unknown): boolean {
  if (typeof value !== 'string') {
    return false
  }

  const trimmed = value.trim()
  return trimmed.length > 0 && Number.isFinite(Number(trimmed))
}

function getPrimaryAmountToken(payload: ParsedEffectPayload): string | null {
  return payload.args.find(isNumberishToken) ?? payload.args[0] ?? null
}

// 解析 effect_string 标准串 'kind,arg1,arg2,...'。JSON 对象串（CNE upgrade_defines.effect
// 伪 JSON）已由 normalize 层 normalizeEffectReference 提前提取为干净标准串（见 AGENTS.md
// 「数据源格式追溯」），消费层不再处理 JSON——所有 effect 字段经 normalize 后均非 `{` 开头。
export function parseEffectPayload(value: string): ParsedEffectPayload | null {
  const trimmed = value.trim()

  if (!trimmed) {
    return null
  }

  const [kind, ...args] = trimmed.split(',')

  if (!kind || !/^[a-z_][a-z0-9_]*$/i.test(kind)) {
    return null
  }

  return {
    raw: trimmed,
    effectString: trimmed,
    description: null,
    data: null,
    meta: null,
    kind,
    args,
  }
}

export function buildEffectKeyPayload(effectKey: Record<string, JsonValue>): ParsedEffectPayload | null {
  if (typeof effectKey?.effect_string !== 'string') {
    return null
  }

  const parsed = parseEffectPayload(effectKey.effect_string)

  if (!parsed) {
    return null
  }

  return {
    ...parsed,
    description: typeof effectKey.description === 'string' ? effectKey.description : parsed.description,
    data: effectKey.data ?? parsed.data,
    meta: effectKey,
  }
}

/**
 * 解析 amount_expr 中的 upgrade_amount(id, index) 引用。
 * resolveSourcePayload(upgradeId, effectIndex) 由调用方提供，按 upgrade id 跨 upgrade
 * 查找目标 effect 的 payload——真实数据有少量跨 upgrade 引用（如 hero 106/141），
 * 旧实现忽略 id 只取当前 upgrade 的 payloads[index] 会解析到错误 upgrade。
 */
export function resolveSimpleAmountExpr(
  expr: string,
  resolveSourcePayload: (upgradeId: string, effectIndex: number) => ParsedEffectPayload | null | undefined,
): string | null {
  const trimmed = expr.trim()

  if (!trimmed) {
    return null
  }

  const match = trimmed.match(/^upgrade_amount\((\d+),\s*(\d+)\)$/)

  if (!match) {
    return null
  }

  const sourcePayload = resolveSourcePayload(match[1]!, Number(match[2]!))

  return sourcePayload ? getPrimaryAmountToken(sourcePayload) : null
}

export function resolveEffectPayloadAmountToken(
  payload: ParsedEffectPayload,
  payloads: Array<ParsedEffectPayload | null | undefined> = [payload],
  upgradePayloadsById?: Map<string, Array<ParsedEffectPayload | null | undefined>> | null,
): string | null {
  const fromExpr =
    typeof payload.meta?.amount_expr === 'string'
      ? resolveSimpleAmountExpr(payload.meta.amount_expr, (upgradeId, effectIndex) =>
        // 优先按 upgrade id 跨 upgrade 查找；map 缺失时回退当前 upgrade payloads[index]
        //（兼容无 id upgrade 的自引用 / 引用缺失 upgrade 的边界）。
        upgradePayloadsById?.get(upgradeId)?.[effectIndex] ?? payloads[effectIndex] ?? null)
      : null

  if (fromExpr) {
    return fromExpr
  }

  return getPrimaryAmountToken(payload)
}

export function extractTargetIdsFromParsedEffectPayload(payload: ParsedEffectPayload): string[] {
  const { kind, args } = payload

  if (
    kind === 'buff_upgrade'
    || kind === 'buff_upgrade_add_flat_amount'
    || kind === 'buff_upgrade_effect_stacks_max_mult'
    || kind === 'buff_upgrade_per_any_tagged_crusader_mult'
    || kind === 'buff_upgrade_per_any_crusader_where_mult'
    || kind === 'buff_upgrade_by_distance_from_source'
    || kind === 'buff_upgrade_mult_by_distance_from_source'
    || kind === 'buff_upgrade_mult_by_distance_from_source_mult'
    || kind === 'change_upgrade_data'
    || kind === 'change_upgrade_targets'
  ) {
    return [args[1] ?? args[0]].filter((id): id is string => Boolean(id))
  }

  if (kind === 'buff_upgrades' || kind === 'damage_buff_on_upgrade_tag_targets') {
    return args.slice(1)
  }

  if (kind === 'buff_upgrade_per_any_tagged_crusader') {
    return [args[1]].filter((id): id is string => Boolean(id))
  }

  return []
}

export function extractTargetIdsFromEffectString(effectString: string): string[] {
  const payload = parseEffectPayload(effectString)
  return payload ? extractTargetIdsFromParsedEffectPayload(payload) : []
}
