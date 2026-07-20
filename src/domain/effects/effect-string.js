function parseInlineJsonValue(value) {
  const trimmed = value.trim()

  if (!trimmed || (!trimmed.startsWith('{') && !trimmed.startsWith('['))) {
    return null
  }

  try {
    return JSON.parse(trimmed)
  } catch {
    return null
  }
}

function isJsonObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isNumberishToken(value) {
  if (typeof value !== 'string') {
    return false
  }

  const trimmed = value.trim()
  return trimmed.length > 0 && Number.isFinite(Number(trimmed))
}

function getPrimaryAmountToken(payload) {
  return payload.args.find(isNumberishToken) ?? payload.args[0] ?? null
}

/**
 * 从（可能 malformed 的）JSON 对象串中正则提取 effect_string 字段值。
 * 真实数据里 upgrade.effectReference 偶尔是字段间缺逗号的 malformed JSON，
 * JSON.parse 会失败。effect_string 字段值本身不含 `"`，可用简单正则兜底恢复，
 * 避免 buff_upgrade(s) wrapper 信号整条丢失。
 * ponytail: 只兜底 effect_string 一个字段；description / data 等其余字段放弃。
 */
function extractEffectStringFromJsonObject(raw) {
  const match = raw.match(/"effect_string"\s*:\s*"([^"]+)"/)
  return match ? match[1] : null
}

export function parseEffectPayload(value) {
  const trimmed = value.trim()

  if (!trimmed) {
    return null
  }

  if (trimmed.startsWith('{')) {
    const parsed = parseInlineJsonValue(trimmed)
    const effectString = typeof parsed?.effect_string === 'string'
      ? parsed.effect_string
      : extractEffectStringFromJsonObject(trimmed)

    if (!effectString) {
      return null
    }

    const [kind, ...args] = effectString.split(',')

    if (!kind || !/^[a-z_][a-z0-9_]*$/i.test(kind)) {
      return null
    }

    return {
      raw: trimmed,
      effectString,
      description: typeof parsed?.description === 'string' ? parsed.description : null,
      data: parsed?.data ?? null,
      meta: parsed,
      kind,
      args,
    }
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

export function buildEffectKeyPayload(effectKey) {
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
export function resolveSimpleAmountExpr(expr, resolveSourcePayload) {
  const trimmed = expr.trim()

  if (!trimmed) {
    return null
  }

  const match = trimmed.match(/^upgrade_amount\((\d+),\s*(\d+)\)$/)

  if (!match) {
    return null
  }

  const sourcePayload = resolveSourcePayload(match[1], Number(match[2]))

  return sourcePayload ? getPrimaryAmountToken(sourcePayload) : null
}

export function resolveEffectPayloadAmountToken(payload, payloads = [payload], upgradePayloadsById) {
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

export function extractTargetIdsFromParsedEffectPayload(payload) {
  const { kind, args } = payload

  if (
    kind === 'buff_upgrade' ||
    kind === 'buff_upgrade_add_flat_amount' ||
    kind === 'buff_upgrade_effect_stacks_max_mult' ||
    kind === 'buff_upgrade_per_any_tagged_crusader_mult' ||
    kind === 'buff_upgrade_per_any_crusader_where_mult' ||
    kind === 'buff_upgrade_by_distance_from_source' ||
    kind === 'buff_upgrade_mult_by_distance_from_source' ||
    kind === 'buff_upgrade_mult_by_distance_from_source_mult' ||
    kind === 'change_upgrade_data' ||
    kind === 'change_upgrade_targets'
  ) {
    return [args[1] ?? args[0]].filter(Boolean)
  }

  if (kind === 'buff_upgrades' || kind === 'damage_buff_on_upgrade_tag_targets') {
    return args.slice(1)
  }

  if (kind === 'buff_upgrade_per_any_tagged_crusader') {
    return [args[1]].filter(Boolean)
  }

  return []
}

export function extractTargetIdsFromEffectString(effectString) {
  const payload = parseEffectPayload(effectString)
  return payload ? extractTargetIdsFromParsedEffectPayload(payload) : []
}
