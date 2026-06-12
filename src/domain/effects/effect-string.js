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

export function parseEffectPayload(value) {
  const trimmed = value.trim()

  if (!trimmed) {
    return null
  }

  if (trimmed.startsWith('{')) {
    const parsed = parseInlineJsonValue(trimmed)

    if (isJsonObject(parsed) && typeof parsed.effect_string === 'string') {
      const [kind, ...args] = parsed.effect_string.split(',')

      if (!kind || !/^[a-z_][a-z0-9_]*$/i.test(kind)) {
        return null
      }

      return {
        raw: trimmed,
        effectString: parsed.effect_string,
        description: typeof parsed.description === 'string' ? parsed.description : null,
        data: parsed.data ?? null,
        meta: parsed,
        kind,
        args,
      }
    }

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

export function resolveSimpleAmountExpr(expr, payloads) {
  const trimmed = expr.trim()

  if (!trimmed) {
    return null
  }

  const upgradeAmountMatch = trimmed.match(/^upgrade_amount\((\d+),\s*(\d+)\)$/)

  if (!upgradeAmountMatch) {
    return null
  }

  const effectIndex = Number(upgradeAmountMatch[2])
  const sourcePayload = payloads[effectIndex] ?? null

  if (!sourcePayload) {
    return null
  }

  return getPrimaryAmountToken(sourcePayload)
}

export function resolveEffectPayloadAmountToken(payload, payloads = [payload]) {
  const fromExpr =
    typeof payload.meta?.amount_expr === 'string'
      ? resolveSimpleAmountExpr(payload.meta.amount_expr, payloads)
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
