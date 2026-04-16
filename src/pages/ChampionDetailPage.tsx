import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { type AppLocale, useI18n } from '../app/i18n'
import { ChampionAvatar } from '../components/ChampionAvatar'
import { SurfaceCard } from '../components/SurfaceCard'
import { loadChampionDetail, loadCollection, resolveDataUrl } from '../data/client'
import {
  getPrimaryLocalizedText,
  getRoleLabel,
  getSecondaryLocalizedText,
} from '../domain/localizedText'
import type {
  ChampionAttackDetail,
  ChampionDetail,
  ChampionFeatDetail,
  ChampionIllustration,
  ChampionRawEntry,
  ChampionSkinDetail,
  ChampionUpgradeDetail,
  LocalizedText,
  JsonValue,
} from '../domain/types'

const DETAIL_SECTION_IDS = ['overview', 'character-sheet', 'combat', 'upgrades', 'feats'] as const
const DETAIL_HASH_PREFIX = 'section-'

type DetailSectionId = (typeof DETAIL_SECTION_IDS)[number]
type DetailSectionProgressState = 'completed' | 'active' | 'upcoming'

type ChampionDetailState =
  | { status: 'idle' }
  | { status: 'ready'; detail: ChampionDetail }
  | { status: 'not-found'; championId: string }
  | { status: 'error'; championId: string; message: string }

interface DetailFieldProps {
  label: string
  value: ReactNode
  hint?: ReactNode | null
}

interface StructuredPanelProps {
  title: string
  value: JsonValue
  locale: AppLocale
  effectContext?: EffectContext | null
}

interface AttackPanelProps {
  title: ReactNode
  attack: ChampionAttackDetail | null
  locale: AppLocale
}

interface UpgradeCardProps {
  upgrade: ChampionUpgradeDetail
  presentation: UpgradePresentation
  locale: AppLocale
}

interface NumericUpgradeRowProps {
  upgrade: ChampionUpgradeDetail
  presentation: UpgradePresentation
  locale: AppLocale
}

interface FeatCardProps {
  feat: ChampionFeatDetail
  locale: AppLocale
  effectContext: EffectContext
}

interface SkinArtworkIds {
  baseGraphicId: string | null
  largeGraphicId: string | null
  xlGraphicId: string | null
  portraitGraphicId: string | null
}

interface EffectContext {
  locale: AppLocale
  championName: string
  attackLabelById: Map<string, string>
  upgradeLabelById: Map<string, string>
}

interface ParsedEffectPayload {
  raw: string
  effectString: string
  description: string | null
  data: JsonValue | null
  kind: string
  args: string[]
}

interface EffectDescriptor {
  categoryLabel: string
  targetLabel: string | null
  targetHint: string | null
  summary: string
  detail: string | null
}

interface EffectDefinitionPresentation {
  summary: string | null
  detail: string | null
  bullets: string[]
}

interface UpgradePresentation {
  title: ReactNode
  typeLabel: string
  targetLabel: string | null
  targetHint: string | null
  summary: string | null
  detailLines: string[]
  prerequisiteLabel: string
  staticMultiplierLabel: string | null
}

function isJsonObject(value: JsonValue): value is Record<string, JsonValue> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isJsonPrimitive(value: JsonValue): value is string | number | boolean | null {
  return value === null || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'
}

function formatDigitString(value: string | null, locale: AppLocale): string {
  if (!value) {
    return locale === 'zh-CN' ? '暂无' : 'Not available'
  }

  if (/^-?\d+$/.test(value)) {
    return BigInt(value).toLocaleString(locale)
  }

  return value
}

function formatNumber(value: number | null, locale: AppLocale): string {
  if (value === null || Number.isNaN(value)) {
    return locale === 'zh-CN' ? '暂无' : 'Not available'
  }

  return new Intl.NumberFormat(locale).format(value)
}

function formatBoolean(value: boolean, locale: AppLocale): string {
  return value ? (locale === 'zh-CN' ? '是' : 'Yes') : locale === 'zh-CN' ? '否' : 'No'
}

function formatTimestamp(value: number | null, locale: AppLocale): string {
  if (value === null || value <= 0) {
    return locale === 'zh-CN' ? '未安排' : 'Not scheduled'
  }

  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value * 1000))
}

function formatNullableText(value: string | null, locale: AppLocale): string {
  return value?.trim() || (locale === 'zh-CN' ? '暂无' : 'Not available')
}

function formatNumberishToken(value: string | null, locale: AppLocale): string {
  if (!value) {
    return locale === 'zh-CN' ? '暂无' : 'Not available'
  }

  const numeric = Number(value)

  if (Number.isFinite(numeric)) {
    return new Intl.NumberFormat(locale, {
      maximumFractionDigits: 4,
    }).format(numeric)
  }

  return value
}

function formatMultiplierValue(value: string | null, locale: AppLocale): string | null {
  if (!value) {
    return null
  }

  const numeric = Number(value)

  if (!Number.isFinite(numeric)) {
    return value
  }

  if (numeric > 0 && numeric < 10) {
    const delta = numeric >= 1 ? (numeric - 1) * 100 : null
    const prefix = `x${new Intl.NumberFormat(locale, {
      maximumFractionDigits: 4,
    }).format(numeric)}`

    if (delta !== null) {
      return `${prefix} (${new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(delta)}%)`
    }

    return prefix
  }

  return `${new Intl.NumberFormat(locale, {
    maximumFractionDigits: 4,
  }).format(numeric)}%`
}

function containsCjkCharacters(value: string): boolean {
  return /[\u3400-\u9fff]/u.test(value)
}

function humanizeIdentifier(value: string): string {
  return value
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/_/g, ' ')
    .trim()
}

function toTitleCase(value: string): string {
  if (!value) {
    return value
  }

  return value.charAt(0).toUpperCase() + value.slice(1)
}

function localizeSourceType(value: string, locale: AppLocale): string {
  const normalized = value.trim().toLowerCase()
  const zhMap: Record<string, string> = {
    adventure: '冒险奖励',
    campaign: '战役奖励',
    chest: '宝箱',
    default: '默认解锁',
    dlc: 'DLC',
    emergence: 'Emergence',
    event: '活动',
    flash_sale: '闪促',
    free: '免费',
    gem_shop: '宝石商店',
    gems: '宝石商店',
    giveaway: '赠送',
    not_yet_available: '尚未开放',
    other: '其他',
    patron: '赞助商店',
    premium: '付费',
    promo: '促销',
    season: '赛季',
    trials: '试炼',
    wild_offer: 'Wild Offer',
  }
  const enMap: Record<string, string> = {
    gem_shop: 'Gem shop',
    not_yet_available: 'Not yet available',
    flash_sale: 'Flash sale',
    patron: 'Patron shop',
    promo: 'Promotion',
    trials: 'Trials',
    wild_offer: 'Wild Offer',
  }

  if (locale === 'zh-CN') {
    return zhMap[normalized] ?? normalized
  }

  return enMap[normalized] ?? toTitleCase(humanizeIdentifier(normalized))
}

function localizeAbilityScore(value: string, locale: AppLocale): string {
  const normalized = value.trim().toLowerCase()
  const zhMap: Record<string, string> = {
    str: '力量',
    dex: '敏捷',
    con: '体质',
    int: '智力',
    wis: '感知',
    cha: '魅力',
  }
  const enMap: Record<string, string> = {
    str: 'Strength',
    dex: 'Dexterity',
    con: 'Constitution',
    int: 'Intelligence',
    wis: 'Wisdom',
    cha: 'Charisma',
  }

  if (locale === 'zh-CN') {
    return zhMap[normalized] ?? normalized.toUpperCase()
  }

  return enMap[normalized] ?? normalized.toUpperCase()
}

function localizeUpgradeType(value: string | null, locale: AppLocale): string {
  if (!value) {
    return locale === 'zh-CN' ? '数值成长' : 'Numeric growth'
  }

  const normalized = value.trim().toLowerCase()
  const zhMap: Record<string, string> = {
    unlock_ability: '解锁能力',
    unlock_ultimate: '解锁终极技',
    upgrade_ability: '能力强化',
  }
  const enMap: Record<string, string> = {
    unlock_ability: 'Unlock ability',
    unlock_ultimate: 'Unlock ultimate',
    upgrade_ability: 'Ability boost',
  }

  if (locale === 'zh-CN') {
    return zhMap[normalized] ?? humanizeIdentifier(normalized)
  }

  return enMap[normalized] ?? toTitleCase(humanizeIdentifier(normalized))
}

function localizeEffectKind(value: string, locale: AppLocale): string {
  const normalized = value.trim().toLowerCase()
  const zhMap: Record<string, string> = {
    add_attack_targets: '追加目标',
    buff_attack_damage: '普攻强化',
    buff_base_crit_chance_add: '暴击率',
    buff_base_crit_damage: '暴击伤害',
    buff_ultimate: '终极技强化',
    buff_upgrade: '能力强化',
    buff_upgrade_add_flat_amount: '能力强化',
    buff_upgrades: '批量能力强化',
    change_base_attack: '替换普攻',
    change_upgrade_data: '修改升级效果',
    change_upgrade_targets: '修改升级目标',
    effect_def: '效果定义',
    global_dps_multiplier_mult: '全队增伤',
    gold_multiplier_mult: '金币加成',
    health_add: '生命值',
    health_mult: '生命值',
    hero_dps_multiplier_mult: '自身增伤',
    increase_ability_score: '属性强化',
    reduce_attack_cooldown: '冷却缩减',
    set_ultimate_attack: '终极技',
  }

  if (locale === 'zh-CN') {
    return zhMap[normalized] ?? humanizeIdentifier(normalized)
  }

  return toTitleCase(humanizeIdentifier(normalized))
}

function localizeStructuredKey(key: string, locale: AppLocale): string {
  const normalized = key.trim()
  const zhMap: Record<string, string> = {
    adventure_ids: '冒险 ID',
    adventures: '冒险',
    amount_func: '数值计算方式',
    amount_updated_listeners: '更新监听器',
    attack_sound: '攻击音效 ID',
    available_at_time: '开放时间',
    available_in_store: '商店上架时间',
    base_attack_taunts: '普攻附带嘲讽',
    base_graphic_id: 'Base Graphic ID',
    chest_type_id: '宝箱类型 ID',
    collections_source: '来源',
    companion_graphic_id: '同伴 Graphic ID',
    companion_visible: '显示同伴',
    console_portrait: '主机头像 ID',
    cost: '价格',
    death_sound: '死亡音效 ID',
    enflamed_graphic_id: '燃烧态 Graphic ID',
    effect_string: '效果',
    eye_height: '眼位高度',
    event_logo_graphic_id: '活动 Logo Graphic ID',
    gold_chest_type_id: '金宝箱类型',
    graphic_id: 'Graphic ID',
    graphic_large: 'Large Graphic ID',
    graphic_xl: 'XL Graphic ID',
    head_graphic_id: '头部 Graphic ID',
    impale_graphic_id: 'Impale Graphic ID',
    in_flash_sale: '闪促',
    in_flash_sales: '闪促可得',
    is_available: '当前可用',
    is_premium: '付费内容',
    item_id: '物品 ID',
    large_graphic_id: 'Large Graphic ID',
    legendary_effect_id: '传奇效果 ID',
    new_targets: '新目标范围',
    notification_adjustment: '通知偏移',
    notification_adjustment_override: '通知偏移覆盖',
    num_back_cols: '向后列数',
    odds: '概率',
    off_when_benched: '离场失效',
    offset: '偏移',
    pain_sounds: '受击音效',
    particle_graphic_ids: '粒子 Graphic ID',
    patron_id: '赞助人 ID',
    patron_shop_item_id: '赞助商店物品 ID',
    portrait_center_offset: '头像中心偏移',
    portrait_graphic_id: 'Portrait Graphic ID',
    premium_item_id: '高级物品 ID',
    projectile_graphic_id: 'Projectile Graphic ID',
    promotion_id: '促销 ID',
    scale: '缩放',
    seat_id: 'Seat ID',
    show_bonus: '显示加成',
    show_incoming: '显示入场效果',
    show_only_if_owned: '仅拥有时显示',
    soft_currency: '软货币',
    specialization_graphic_id: '专精 Graphic ID',
    source: '来源',
    stack_func: '叠层计算方式',
    targets: '作用目标',
    trials_effect_id: '试炼效果 ID',
    type: '类型',
    ultimate_color: '终极技颜色',
    weekly_buff: '周增益',
    weekly_chest_type_id: '周宝箱类型',
    xl_graphic_id: 'XL Graphic ID',
  }

  if (locale === 'zh-CN') {
    return zhMap[normalized] ?? toTitleCase(humanizeIdentifier(normalized))
  }

  return toTitleCase(humanizeIdentifier(normalized))
}

function buildNotAvailableLabel(locale: AppLocale): string {
  return locale === 'zh-CN' ? '暂无' : 'Not available'
}

function parseInlineJsonValue(value: string): JsonValue | null {
  const trimmed = value.trim()

  if (!trimmed || (!trimmed.startsWith('{') && !trimmed.startsWith('['))) {
    return null
  }

  try {
    return JSON.parse(trimmed) as JsonValue
  } catch {
    return null
  }
}

function isNumberishToken(value: string): boolean {
  return /^-?\d+(?:\.\d+)?$/.test(value)
}

function parseEffectPayload(value: string): ParsedEffectPayload | null {
  const trimmed = value.trim()

  if (!trimmed) {
    return null
  }

  if (trimmed.startsWith('{')) {
    const parsed = parseInlineJsonValue(trimmed)

    if (parsed && isJsonObject(parsed) && typeof parsed.effect_string === 'string') {
      const [kind, ...args] = parsed.effect_string.split(',')

      if (!/^[a-z_][a-z0-9_]*$/i.test(kind)) {
        return null
      }

      return {
        raw: trimmed,
        effectString: parsed.effect_string,
        description: typeof parsed.description === 'string' ? parsed.description : null,
        data: parsed.data ?? null,
        kind,
        args,
      }
    }

    return null
  }

  const [kind, ...args] = trimmed.split(',')

  if (!/^[a-z_][a-z0-9_]*$/i.test(kind)) {
    return null
  }

  return {
    raw: trimmed,
    effectString: trimmed,
    description: null,
    data: null,
    kind,
    args,
  }
}

function summarizeTargetLabels(labels: string[], locale: AppLocale): { summary: string | null; detail: string | null } {
  if (labels.length === 0) {
    return { summary: null, detail: null }
  }

  if (labels.length === 1) {
    return { summary: labels[0], detail: null }
  }

  const normalizedPrefixes = labels
    .map((label) => label.split(/[:：]/)[0]?.trim() ?? '')
    .filter((value) => value.length > 0)
  const sharedPrefix =
    normalizedPrefixes.length === labels.length && new Set(normalizedPrefixes).size === 1
      ? normalizedPrefixes[0]
      : null

  if (sharedPrefix) {
    return {
      summary:
        locale === 'zh-CN'
          ? `${sharedPrefix}（${labels.length} 个分支）`
          : `${sharedPrefix} (${labels.length} branches)`,
      detail: labels.join(' / '),
    }
  }

  if (labels.length <= 3) {
    return { summary: labels.join(' / '), detail: null }
  }

  return {
    summary:
      locale === 'zh-CN'
        ? `${labels[0]} 等 ${labels.length} 项`
        : `${labels[0]} and ${labels.length - 1} more`,
    detail: labels.join(' / '),
  }
}

function resolveEffectTargets(
  payload: ParsedEffectPayload,
  effectContext: EffectContext,
): { summary: string | null; detail: string | null } {
  const { kind, args } = payload

  if (kind === 'buff_upgrade' || kind === 'buff_upgrade_add_flat_amount' || kind === 'buff_upgrade_effect_stacks_max_mult' || kind === 'change_upgrade_data' || kind === 'change_upgrade_targets') {
    const targetId = args[1] ?? args[0] ?? null
    const label = targetId ? effectContext.upgradeLabelById.get(targetId) ?? `${targetId}` : null
    return { summary: label, detail: null }
  }

  if (kind === 'buff_upgrades') {
    return summarizeTargetLabels(
      args.slice(1).map((id) => effectContext.upgradeLabelById.get(id) ?? `${id}`),
      effectContext.locale,
    )
  }

  if (kind === 'set_ultimate_attack' || kind === 'change_base_attack') {
    const attackId = args[0] ?? null
    const label = attackId ? effectContext.attackLabelById.get(attackId) ?? `#${attackId}` : null
    return { summary: label, detail: null }
  }

  if (kind === 'buff_upgrade_per_any_tagged_crusader') {
    const targetId = args[1] ?? null
    const label = targetId ? effectContext.upgradeLabelById.get(targetId) ?? `${targetId}` : null
    return { summary: label, detail: args[2] ? args[2] : null }
  }

  return { summary: null, detail: null }
}

function resolveEffectDescription(
  description: string | null,
  payload: ParsedEffectPayload,
  effectContext: EffectContext,
): string | null {
  if (!description) {
    return null
  }

  const numericArgs = payload.args.filter(isNumberishToken)
  const targetSummary = resolveEffectTargets(payload, effectContext)

  const resolveToken = (token: string): string => {
    const normalized = token.trim()

    if (normalized === 'amount') {
      return formatNumberishToken(numericArgs[0] ?? null, effectContext.locale)
    }

    if (/^amount_(\d+)$/.test(normalized)) {
      const index = Number(normalized.split('_')[1]) - 1
      return formatNumberishToken(numericArgs[index] ?? null, effectContext.locale)
    }

    if (normalized === 'seconds_plural amount') {
      return effectContext.locale === 'zh-CN'
        ? `${formatNumberishToken(numericArgs[0] ?? null, effectContext.locale)} 秒`
        : `${formatNumberishToken(numericArgs[0] ?? null, effectContext.locale)} seconds`
    }

    if (normalized.startsWith('upgrade_name')) {
      return targetSummary.summary ?? (effectContext.locale === 'zh-CN' ? '对应能力' : 'the linked ability')
    }

    if (normalized.startsWith('upgrade_hero')) {
      return effectContext.championName
    }

    return effectContext.locale === 'zh-CN' ? '该值' : 'value'
  }

  return description
    .replace(/\$\(([^)]+)\)/g, (_match, token) => resolveToken(token))
    .replace(/\$amount\b/g, formatNumberishToken(numericArgs[0] ?? null, effectContext.locale))
}

function describeEffectPayload(payload: ParsedEffectPayload, effectContext: EffectContext): EffectDescriptor {
  const { locale } = effectContext
  const amount = formatNumberishToken(payload.args[0] ?? null, locale)
  const targets = resolveEffectTargets(payload, effectContext)
  const resolvedDescription = resolveEffectDescription(payload.description, payload, effectContext)
  let categoryLabel = localizeEffectKind(payload.kind, locale)
  let summary: string

  switch (payload.kind) {
    case 'hero_dps_multiplier_mult':
      categoryLabel = locale === 'zh-CN' ? '自身增伤' : 'Self damage'
      summary = locale === 'zh-CN' ? `自身伤害提高 ${amount}%` : `Champion damage increases by ${amount}%`
      break
    case 'global_dps_multiplier_mult':
      categoryLabel = locale === 'zh-CN' ? '全队增伤' : 'Party damage'
      summary = locale === 'zh-CN' ? `全队伤害提高 ${amount}%` : `Party damage increases by ${amount}%`
      break
    case 'gold_multiplier_mult':
      categoryLabel = locale === 'zh-CN' ? '金币加成' : 'Gold find'
      summary = locale === 'zh-CN' ? `金币获取提高 ${amount}%` : `Gold find increases by ${amount}%`
      break
    case 'health_add':
      categoryLabel = locale === 'zh-CN' ? '生命值' : 'Health'
      summary = locale === 'zh-CN' ? `生命值 +${amount}` : `Health +${amount}`
      break
    case 'health_mult':
      categoryLabel = locale === 'zh-CN' ? '生命值' : 'Health'
      summary = locale === 'zh-CN' ? `生命值提高 ${amount}%` : `Health increases by ${amount}%`
      break
    case 'buff_upgrade':
      categoryLabel = locale === 'zh-CN' ? '能力强化' : 'Ability boost'
      summary =
        locale === 'zh-CN'
          ? `使「${targets.summary ?? '关联能力'}」效果提高 ${amount}%`
          : `Increase "${targets.summary ?? 'linked ability'}" by ${amount}%`
      break
    case 'buff_upgrades':
      categoryLabel = locale === 'zh-CN' ? '能力强化' : 'Ability boost'
      summary =
        locale === 'zh-CN'
          ? `使${targets.summary ?? '多项关联能力'}效果提高 ${amount}%`
          : `Increase ${targets.summary ?? 'linked abilities'} by ${amount}%`
      break
    case 'buff_upgrade_add_flat_amount':
      categoryLabel = locale === 'zh-CN' ? '能力强化' : 'Ability boost'
      summary =
        locale === 'zh-CN'
          ? `为「${targets.summary ?? '关联能力'}」额外增加 ${amount}`
          : `Add ${amount} to "${targets.summary ?? 'linked ability'}"`
      break
    case 'set_ultimate_attack':
      categoryLabel = locale === 'zh-CN' ? '终极技' : 'Ultimate'
      {
        const attackLabel = targets.summary ?? `#${payload.args[0] ?? ''}`
        summary =
          locale === 'zh-CN'
            ? `解锁终极技「${attackLabel}」`
            : `Unlock ultimate "${attackLabel}"`
      }
      break
    case 'add_attack_targets':
      categoryLabel = locale === 'zh-CN' ? '普攻强化' : 'Base attack'
      summary =
        locale === 'zh-CN'
          ? `普攻额外命中 ${amount} 个目标`
          : `Base attack hits ${amount} additional targets`
      break
    case 'buff_ultimate':
      categoryLabel = locale === 'zh-CN' ? '终极技强化' : 'Ultimate boost'
      summary = locale === 'zh-CN' ? `终极技效果提高 ${amount}%` : `Ultimate effect increases by ${amount}%`
      break
    case 'buff_attack_damage':
      categoryLabel = locale === 'zh-CN' ? '普攻强化' : 'Base attack'
      summary = locale === 'zh-CN' ? `普攻伤害提高 ${amount}%` : `Base attack damage increases by ${amount}%`
      break
    case 'reduce_attack_cooldown':
      categoryLabel = locale === 'zh-CN' ? '冷却缩减' : 'Cooldown'
      summary = locale === 'zh-CN' ? `攻击冷却缩短 ${amount} 秒` : `Attack cooldown is reduced by ${amount}s`
      break
    case 'increase_ability_score':
      categoryLabel = locale === 'zh-CN' ? '属性强化' : 'Ability score'
      summary =
        locale === 'zh-CN'
          ? `${localizeAbilityScore(payload.args[0] ?? '', locale)}提高 ${formatNumberishToken(payload.args[1] ?? null, locale)}`
          : `${localizeAbilityScore(payload.args[0] ?? '', locale)} increases by ${formatNumberishToken(payload.args[1] ?? null, locale)}`
      break
    case 'buff_base_crit_chance_add':
      categoryLabel = locale === 'zh-CN' ? '暴击率' : 'Crit chance'
      summary = locale === 'zh-CN' ? `基础暴击率提高 ${amount}%` : `Base crit chance increases by ${amount}%`
      break
    case 'buff_base_crit_damage':
      categoryLabel = locale === 'zh-CN' ? '暴击伤害' : 'Crit damage'
      summary = locale === 'zh-CN' ? `基础暴击伤害提高 ${amount}%` : `Base crit damage increases by ${amount}%`
      break
    case 'change_base_attack':
      categoryLabel = locale === 'zh-CN' ? '替换普攻' : 'Swap base attack'
      {
        const attackLabel = targets.summary ?? `#${payload.args[0] ?? ''}`
        summary =
          locale === 'zh-CN'
            ? `将普攻替换为「${attackLabel}」`
            : `Replace the base attack with "${attackLabel}"`
      }
      break
    case 'change_upgrade_targets':
      categoryLabel = locale === 'zh-CN' ? '修改目标范围' : 'Retarget ability'
      summary =
        locale === 'zh-CN'
          ? `改写「${targets.summary ?? '关联能力'}」的目标范围`
          : `Change the target shape of "${targets.summary ?? 'linked ability'}"`
      break
    case 'change_upgrade_data':
      categoryLabel = locale === 'zh-CN' ? '修改升级数据' : 'Modify upgrade data'
      summary =
        locale === 'zh-CN'
          ? `改写「${targets.summary ?? '关联能力'}」的内部数据`
          : `Change the internal data for "${targets.summary ?? 'linked ability'}"`
      break
    case 'overwhelm_start_increase':
      categoryLabel = locale === 'zh-CN' ? '压制阈值' : 'Overwhelm'
      summary =
        locale === 'zh-CN'
          ? `压制起始值提高 ${amount}`
          : `Starting overwhelm increases by ${amount}`
      break
    case 'add_hero_tags':
      categoryLabel = locale === 'zh-CN' ? '新增标签' : 'Add tag'
      summary =
        locale === 'zh-CN'
          ? `新增标签「${payload.args[2] ?? payload.args[1] ?? 'unknown'}」`
          : `Add the "${payload.args[2] ?? payload.args[1] ?? 'unknown'}" tag`
      break
    case 'buff_upgrade_effect_stacks_max_mult':
      categoryLabel = locale === 'zh-CN' ? '层数上限' : 'Stack cap'
      summary =
        locale === 'zh-CN'
          ? `使「${targets.summary ?? '关联能力'}」的最大层数提高 ${amount}%`
          : `Increase the max stacks of "${targets.summary ?? 'linked ability'}" by ${amount}%`
      break
    case 'buff_upgrade_per_any_tagged_crusader':
      categoryLabel = locale === 'zh-CN' ? '按标签增幅' : 'Tag-based boost'
      summary =
        locale === 'zh-CN'
          ? `每名符合标签的英雄使「${targets.summary ?? '关联能力'}」提高 ${amount}%`
          : `Each tagged champion increases "${targets.summary ?? 'linked ability'}" by ${amount}%`
      break
    default:
      summary =
        locale === 'zh-CN'
          ? `效果类型：${localizeEffectKind(payload.kind, locale)}`
          : `Effect type: ${localizeEffectKind(payload.kind, locale)}`
      break
  }

  const preferDescription =
    resolvedDescription &&
    ((locale === 'zh-CN' && containsCjkCharacters(resolvedDescription)) || locale !== 'zh-CN')

  return {
    categoryLabel,
    targetLabel: targets.summary,
    targetHint: targets.detail,
    summary: preferDescription ? resolvedDescription : summary,
    detail:
      (!preferDescription && resolvedDescription ? resolvedDescription : null) ??
      (targets.detail && targets.detail !== targets.summary ? targets.detail : null),
  }
}

function buildEffectDefinitionPresentation(
  entry: ChampionRawEntry | null,
  effectContext: EffectContext,
): EffectDefinitionPresentation {
  if (!entry) {
    return {
      summary: null,
      detail: null,
      bullets: [],
    }
  }

  const snapshot =
    effectContext.locale === 'zh-CN' ? entry.snapshots.display : entry.snapshots.original

  if (!isJsonObject(snapshot)) {
    return {
      summary: null,
      detail: null,
      bullets: [],
    }
  }

  const description =
    isJsonObject(snapshot.description) && typeof snapshot.description.desc === 'string'
      ? snapshot.description.desc
      : typeof snapshot.description === 'string'
        ? snapshot.description
        : null
  const effectKeys = Array.isArray(snapshot.effect_keys)
    ? snapshot.effect_keys.filter(isJsonObject)
    : []
  const descriptors = effectKeys
    .map((effectKey) => {
      if (typeof effectKey.effect_string !== 'string') {
        return null
      }

      const payload = parseEffectPayload(effectKey.effect_string)
      return payload ? describeEffectPayload(payload, effectContext) : null
    })
    .filter((value): value is EffectDescriptor => Boolean(value))
  const primaryPayload =
    effectKeys.length > 0 && typeof effectKeys[0]?.effect_string === 'string'
      ? parseEffectPayload(effectKeys[0].effect_string)
      : null
  const primaryDescription =
    primaryPayload && description
      ? resolveEffectDescription(description, primaryPayload, effectContext)
      : description
  const summary =
    primaryDescription ||
    descriptors[0]?.summary ||
    null
  const detail = descriptors[0]?.detail ?? null
  const bullets = descriptors
    .map((descriptor) => descriptor.summary)
    .filter((item, index, list) => item !== summary && list.indexOf(item) === index)

  return {
    summary,
    detail,
    bullets,
  }
}

function buildUpgradeReferenceLabel(
  upgrade: ChampionUpgradeDetail,
  locale: AppLocale,
  attackLabelById: Map<string, string>,
): string {
  if (upgrade.name) {
    return getPrimaryLocalizedText(upgrade.name, locale)
  }

  if (upgrade.specializationName) {
    return getPrimaryLocalizedText(upgrade.specializationName, locale)
  }

  if (upgrade.upgradeType === 'unlock_ultimate') {
    const payload = upgrade.effectReference ? parseEffectPayload(upgrade.effectReference) : null
    const attackLabel =
      payload?.kind === 'set_ultimate_attack' && payload.args[0]
        ? attackLabelById.get(payload.args[0]) ?? null
        : null

    return attackLabel ?? (locale === 'zh-CN' ? '终极技解锁' : 'Ultimate unlock')
  }

  if (upgrade.upgradeType === 'unlock_ability') {
    return locale === 'zh-CN' ? `能力 #${upgrade.id}` : `Ability #${upgrade.id}`
  }

  if (upgrade.upgradeType) {
    return localizeUpgradeType(upgrade.upgradeType, locale)
  }

  return locale === 'zh-CN' ? `升级 #${upgrade.id}` : `Upgrade #${upgrade.id}`
}

function buildUpgradePresentation(
  upgrade: ChampionUpgradeDetail,
  effectContext: EffectContext,
): UpgradePresentation {
  const effectPayload = upgrade.effectReference ? parseEffectPayload(upgrade.effectReference) : null
  const validEffectDescriptor = effectPayload ? describeEffectPayload(effectPayload, effectContext) : null
  const effectDefinition = buildEffectDefinitionPresentation(upgrade.effectDefinition, effectContext)
  const typeLabel =
    upgrade.upgradeType
      ? localizeUpgradeType(upgrade.upgradeType, effectContext.locale)
      : validEffectDescriptor?.categoryLabel ?? localizeUpgradeType(null, effectContext.locale)
  const title = (() => {
    if (upgrade.name) {
      return <LocalizedTextStack value={upgrade.name} />
    }

    if (upgrade.specializationName) {
      return <LocalizedTextStack value={upgrade.specializationName} />
    }

    if (upgrade.upgradeType === 'unlock_ultimate') {
      return effectContext.locale === 'zh-CN'
        ? `解锁终极技：${validEffectDescriptor?.targetLabel ?? buildNotAvailableLabel(effectContext.locale)}`
        : `Unlock ultimate: ${validEffectDescriptor?.targetLabel ?? buildNotAvailableLabel(effectContext.locale)}`
    }

    if (upgrade.upgradeType === 'upgrade_ability' && validEffectDescriptor?.targetLabel) {
      return effectContext.locale === 'zh-CN'
        ? `强化：${validEffectDescriptor.targetLabel}`
        : `Boost: ${validEffectDescriptor.targetLabel}`
    }

    if (validEffectDescriptor?.targetLabel) {
      return effectContext.locale === 'zh-CN'
        ? `${typeLabel}：${validEffectDescriptor.targetLabel}`
        : `${typeLabel}: ${validEffectDescriptor.targetLabel}`
    }

    return effectContext.locale === 'zh-CN' ? `${typeLabel}升级` : `${typeLabel} upgrade`
  })()
  const summary =
    effectDefinition.summary ??
    validEffectDescriptor?.summary ??
    (upgrade.specializationDescription ? getPrimaryLocalizedText(upgrade.specializationDescription, effectContext.locale) : null) ??
    (upgrade.tipText ? getPrimaryLocalizedText(upgrade.tipText, effectContext.locale) : null)
  const prerequisiteLabel = upgrade.requiredUpgradeId
    ? effectContext.upgradeLabelById.get(upgrade.requiredUpgradeId) ??
      (effectContext.locale === 'zh-CN'
        ? `升级 #${upgrade.requiredUpgradeId}`
        : `Upgrade #${upgrade.requiredUpgradeId}`)
    : effectContext.locale === 'zh-CN'
      ? '无前置'
      : 'No prerequisite'
  const detailLines = [
    upgrade.specializationDescription
      ? getPrimaryLocalizedText(upgrade.specializationDescription, effectContext.locale)
      : null,
    upgrade.tipText ? getPrimaryLocalizedText(upgrade.tipText, effectContext.locale) : null,
    effectDefinition.detail,
    ...effectDefinition.bullets,
    validEffectDescriptor?.detail ?? null,
  ].filter((value, index, list): value is string => Boolean(value) && list.indexOf(value as string) === index && value !== summary)

  return {
    title,
    typeLabel,
    targetLabel: validEffectDescriptor?.targetLabel ?? null,
    targetHint: validEffectDescriptor?.targetHint ?? null,
    summary,
    detailLines,
    prerequisiteLabel,
    staticMultiplierLabel: formatMultiplierValue(upgrade.staticDpsMult, effectContext.locale),
  }
}

function formatStructuredPrimitive(
  value: string | number | boolean | null,
  locale: AppLocale,
  parentKey: string | null,
  effectContext?: EffectContext | null,
): string | null {
  if (value === null) {
    return buildNotAvailableLabel(locale)
  }

  if (typeof value === 'boolean') {
    return formatBoolean(value, locale)
  }

  if (typeof value === 'number') {
    if (parentKey === 'odds') {
      return `${formatNumber(value, locale)}%`
    }

    if (parentKey === 'scale') {
      return `x${formatNumber(value, locale)}`
    }

    return formatNumber(value, locale)
  }

  const trimmed = value.trim()

  if (!trimmed) {
    return buildNotAvailableLabel(locale)
  }

  if (effectContext) {
    const effectPayload = parseEffectPayload(trimmed)

    if (effectPayload) {
      return describeEffectPayload(effectPayload, effectContext).summary
    }
  }

  if (parentKey === 'type' || parentKey === 'source') {
    return localizeSourceType(trimmed, locale)
  }

  if ((trimmed.startsWith('{') || trimmed.startsWith('[')) && parseInlineJsonValue(trimmed)) {
    return null
  }

  return trimmed
}

function formatTimeWindow(value: JsonValue, locale: AppLocale): string | null {
  if (!isJsonObject(value)) {
    return null
  }

  const start = typeof value.start === 'string' ? value.start.trim() : ''
  const end = typeof value.end === 'string' ? value.end.trim() : ''

  if (!start && !end) {
    return null
  }

  if (start && end) {
    return locale === 'zh-CN' ? `${start} 至 ${end}` : `${start} to ${end}`
  }

  return start || end
}

function buildOverviewPropertyFields(
  detail: ChampionDetail,
  locale: AppLocale,
  effectContext: EffectContext | null,
): DetailFieldProps[] {
  if (!isJsonObject(detail.properties)) {
    return []
  }

  const properties = detail.properties
  const fields: DetailFieldProps[] = []
  const propertyLabels = {
    available_in_store: locale === 'zh-CN' ? '商店上架时间' : 'Store availability',
    allow_time_gate: locale === 'zh-CN' ? '时间门开放' : 'Time Gate availability',
    weekly_buff: locale === 'zh-CN' ? '周增益' : 'Weekly buff',
    store_blackout: locale === 'zh-CN' ? '商店黑名单' : 'Store blackout',
    time_gate_blackout: locale === 'zh-CN' ? '时间门黑名单' : 'Time Gate blackout',
  } as const

  const pushPrimitiveField = (key: keyof typeof propertyLabels) => {
    const rawValue = properties[key]

    if (!isJsonPrimitive(rawValue)) {
      return
    }

    const formatted = formatStructuredPrimitive(rawValue, locale, key, effectContext)

    if (!formatted || formatted === buildNotAvailableLabel(locale)) {
      return
    }

    fields.push({
      label: propertyLabels[key],
      value: formatted,
    })
  }

  pushPrimitiveField('available_in_store')
  pushPrimitiveField('allow_time_gate')
  pushPrimitiveField('weekly_buff')

  ;(['store_blackout', 'time_gate_blackout'] as const).forEach((key) => {
    const formatted = formatTimeWindow(properties[key], locale)

    if (!formatted) {
      return
    }

    fields.push({
      label: propertyLabels[key],
      value: formatted,
    })
  })

  return fields
}

function LocalizedTextStack({ value }: { value: LocalizedText }) {
  const hasSecondary = value.display.trim() !== value.original.trim()

  return (
    <span className="localized-text-stack">
      <span className="localized-text-stack__primary">{value.display}</span>
      {hasSecondary ? <span className="localized-text-stack__secondary">{value.original}</span> : null}
    </span>
  )
}

function StructuredValueRenderer({
  value,
  locale,
  effectContext,
  parentKey = null,
}: {
  value: JsonValue
  locale: AppLocale
  effectContext?: EffectContext | null
  parentKey?: string | null
}): ReactNode {
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return <span className="supporting-text">{buildNotAvailableLabel(locale)}</span>
    }

    if (value.every(isJsonPrimitive)) {
      return (
        <div className="detail-structured-chip-row">
          {value.map((item, index) => {
            const formatted = formatStructuredPrimitive(item, locale, parentKey, effectContext)

            return (
              <span key={`${parentKey ?? 'value'}-${index}`} className="detail-structured-chip">
                {formatted ?? buildNotAvailableLabel(locale)}
              </span>
            )
          })}
        </div>
      )
    }

    return (
      <div className="detail-structured-stack">
        {value.map((item, index) => (
          <article key={`${parentKey ?? 'item'}-${index}`} className="detail-structured-card">
            <span className="detail-structured-field__label">
              {locale === 'zh-CN' ? `条目 ${index + 1}` : `Item ${index + 1}`}
            </span>
            <div className="detail-structured-card__body">
              <StructuredValueRenderer
                value={item}
                locale={locale}
                effectContext={effectContext}
                parentKey={parentKey}
              />
            </div>
          </article>
        ))}
      </div>
    )
  }

  if (isJsonObject(value)) {
    const entries = Object.entries(value)

    if (entries.length === 0) {
      return <span className="supporting-text">{buildNotAvailableLabel(locale)}</span>
    }

    return (
      <div className="detail-structured-fields">
        {entries.map(([key, itemValue]) => (
          <article key={key} className="detail-structured-field">
            <span className="detail-structured-field__label">{localizeStructuredKey(key, locale)}</span>
            <div className="detail-structured-field__value">
              <StructuredValueRenderer
                value={itemValue}
                locale={locale}
                effectContext={effectContext}
                parentKey={key}
              />
            </div>
          </article>
        ))}
      </div>
    )
  }

  const formatted = formatStructuredPrimitive(value, locale, parentKey, effectContext)

  if (formatted !== null) {
    return <span className="detail-structured-text">{formatted}</span>
  }

  if (typeof value === 'string') {
    const inlineJson = parseInlineJsonValue(value)

    if (inlineJson) {
      return (
        <StructuredValueRenderer
          value={inlineJson}
          locale={locale}
          effectContext={effectContext}
          parentKey={parentKey}
        />
      )
    }
  }

  return <span className="detail-structured-text">{buildNotAvailableLabel(locale)}</span>
}

function describeEffectItem(
  value: JsonValue,
  effectContext: EffectContext,
): { summary: string; detail: string | null; meta: JsonValue | null } {
  if (isJsonObject(value) && typeof value.effect_string === 'string') {
    const descriptor = describeEffectPayload(
      {
        raw: value.effect_string,
        effectString: value.effect_string,
        description: typeof value.description === 'string' ? value.description : null,
        data: value.data ?? null,
        kind: value.effect_string.split(',')[0] ?? value.effect_string,
        args: value.effect_string.split(',').slice(1),
      },
      effectContext,
    )
    const metaEntries = Object.entries(value).filter(([key]) => key !== 'effect_string' && key !== 'description')

    return {
      summary: descriptor.summary,
      detail: descriptor.detail,
      meta: metaEntries.length > 0 ? Object.fromEntries(metaEntries) : null,
    }
  }

  if (!isJsonPrimitive(value)) {
    return {
      summary: effectContext.locale === 'zh-CN' ? '复杂效果字段' : 'Structured effect data',
      detail: null,
      meta: value,
    }
  }

  const formatted = formatStructuredPrimitive(value, effectContext.locale, null, effectContext)

  return {
    summary: formatted ?? buildNotAvailableLabel(effectContext.locale),
    detail: null,
    meta: null,
  }
}

function StructuredPanel({ title, value, locale, effectContext }: StructuredPanelProps) {
  return (
    <article className="detail-data-panel">
      <h3 className="detail-data-panel__title">{title}</h3>
      <StructuredValueRenderer value={value} locale={locale} effectContext={effectContext} />
    </article>
  )
}

function EffectListPanel({
  title,
  value,
  locale,
  effectContext,
}: StructuredPanelProps) {
  const effectItems = Array.isArray(value) ? value : []

  return (
    <article className="detail-data-panel">
      <h3 className="detail-data-panel__title">{title}</h3>
      {effectItems.length > 0 ? (
        <div className="detail-effect-list">
          {effectItems.map((item, index) => {
            const descriptor = describeEffectItem(item, effectContext ?? {
              locale,
              championName: '',
              attackLabelById: new Map(),
              upgradeLabelById: new Map(),
            })

            return (
              <article key={`effect-${index}`} className="detail-effect-item">
                <p className="detail-effect-item__summary">{descriptor.summary}</p>
                {descriptor.detail ? <p className="supporting-text">{descriptor.detail}</p> : null}
                {descriptor.meta ? (
                  <div className="detail-effect-item__meta">
                    <StructuredValueRenderer
                      value={descriptor.meta}
                      locale={locale}
                      effectContext={effectContext}
                    />
                  </div>
                ) : null}
              </article>
            )
          })}
        </div>
      ) : (
        <p className="supporting-text">{buildNotAvailableLabel(locale)}</p>
      )}
    </article>
  )
}

function buildRarityLabel(value: string | null, locale: AppLocale): string {
  if (!value) {
    return locale === 'zh-CN' ? '未标注' : 'Unlabeled'
  }

  return locale === 'zh-CN' ? `稀有度 ${value}` : `Rarity ${value}`
}

function readGraphicId(value: JsonValue, key: string): string | null {
  if (!isJsonObject(value)) {
    return null
  }

  const candidate = value[key]

  if (candidate === null || candidate === undefined) {
    return null
  }

  const normalized = String(candidate).trim()
  return normalized.length > 0 ? normalized : null
}

function getSkinArtworkIds(skin: ChampionSkinDetail): SkinArtworkIds {
  return {
    baseGraphicId: readGraphicId(skin.details, 'base_graphic_id'),
    largeGraphicId: readGraphicId(skin.details, 'large_graphic_id'),
    xlGraphicId: readGraphicId(skin.details, 'xl_graphic_id'),
    portraitGraphicId: readGraphicId(skin.details, 'portrait_graphic_id'),
  }
}

function buildSkinPreviewAlt(skin: ChampionSkinDetail, locale: AppLocale): string {
  const primaryName = getPrimaryLocalizedText(skin.name, locale)
  return locale === 'zh-CN' ? `${primaryName}皮肤预览` : `${primaryName} skin preview`
}

function resolveSkinPreviewUrl(
  skinIllustration: ChampionIllustration | null,
  champion: ChampionDetail['summary'],
): string | null {
  if (skinIllustration) {
    return resolveDataUrl(skinIllustration.image.path)
  }

  return champion.portrait?.path ? resolveDataUrl(champion.portrait.path) : null
}

function DetailField({ label, value, hint }: DetailFieldProps) {
  return (
    <article className="detail-field">
      <span className="detail-field__label">{label}</span>
      <div className="detail-field__value">{value}</div>
      {hint ? <span className="detail-field__hint">{hint}</span> : null}
    </article>
  )
}

function AttackPanel({ title, attack, locale }: AttackPanelProps) {
  if (!attack) {
    return (
      <article className="detail-subcard detail-subcard--empty">
        <h3 className="detail-subcard__title">{title}</h3>
        <p className="supporting-text">{locale === 'zh-CN' ? '当前没有可展示的攻击定义。' : 'No attack definition is available here.'}</p>
      </article>
    )
  }

  return (
    <article className="detail-subcard attack-card">
      <div className="attack-card__header">
        <div>
          <p className="detail-subcard__eyebrow">{title}</p>
          <h3 className="detail-subcard__title"><LocalizedTextStack value={attack.name} /></h3>
        </div>
        <div className="detail-badge-row">
          <span className="detail-badge">{locale === 'zh-CN' ? `冷却 ${formatNumber(attack.cooldown, locale)} 秒` : `${formatNumber(attack.cooldown, locale)}s cooldown`}</span>
          <span className="detail-badge">{locale === 'zh-CN' ? `目标 ${formatNumber(attack.numTargets, locale)}` : `${formatNumber(attack.numTargets, locale)} targets`}</span>
        </div>
      </div>

      {attack.description ? <p className="detail-subcard__body">{getPrimaryLocalizedText(attack.description, locale)}</p> : null}
      {attack.longDescription ? <p className="supporting-text">{getPrimaryLocalizedText(attack.longDescription, locale)}</p> : null}

      <div className="detail-field-grid detail-field-grid--compact">
        <DetailField label={locale === 'zh-CN' ? 'AOE 半径' : 'AOE radius'} value={formatNumber(attack.aoeRadius, locale)} />
        <DetailField label={locale === 'zh-CN' ? '伤害倍率' : 'Damage modifier'} value={formatNullableText(attack.damageModifier, locale)} />
        <DetailField label={locale === 'zh-CN' ? '目标规则' : 'Target rule'} value={formatNullableText(attack.target, locale)} />
      </div>

      {attack.damageTypes.length > 0 ? (
        <div className="tag-row">
          {attack.damageTypes.map((item) => (
            <span key={item} className="tag-pill">
              {item}
            </span>
          ))}
        </div>
      ) : null}

      {attack.tags.length > 0 ? (
        <div className="tag-row">
          {attack.tags.map((item) => (
            <span key={item} className="tag-pill tag-pill--muted">
              {item}
            </span>
          ))}
        </div>
      ) : null}
    </article>
  )
}

function UpgradeCard({ upgrade, presentation, locale }: UpgradeCardProps) {
  return (
    <article className="detail-subcard upgrade-card">
      <div className="detail-subcard__header">
        <div>
          <p className="detail-subcard__eyebrow">
            {locale === 'zh-CN' ? `等级 ${formatNumber(upgrade.requiredLevel, locale)}` : `Level ${formatNumber(upgrade.requiredLevel, locale)}`}
          </p>
          <h3 className="detail-subcard__title">{presentation.title}</h3>
        </div>
        <div className="detail-badge-row">
          <span className="detail-badge">{presentation.typeLabel}</span>
          {upgrade.requiredUpgradeId ? <span className="detail-badge">{presentation.prerequisiteLabel}</span> : null}
          {upgrade.specializationGraphicId ? <span className="detail-badge">{locale === 'zh-CN' ? `专精图 ${upgrade.specializationGraphicId}` : `Spec art ${upgrade.specializationGraphicId}`}</span> : null}
        </div>
      </div>

      {presentation.summary ? <p className="detail-subcard__body">{presentation.summary}</p> : null}
      {presentation.detailLines.map((line) => (
        <p key={line} className="supporting-text">
          {line}
        </p>
      ))}

      <div className="detail-field-grid detail-field-grid--compact">
        <DetailField label={locale === 'zh-CN' ? '升级类型' : 'Upgrade type'} value={presentation.typeLabel} />
        <DetailField
          label={locale === 'zh-CN' ? '作用对象' : 'Target'}
          value={presentation.targetLabel ?? (locale === 'zh-CN' ? '当前英雄' : 'Current champion')}
          hint={presentation.targetHint}
        />
        <DetailField label={locale === 'zh-CN' ? '前置条件' : 'Prerequisite'} value={presentation.prerequisiteLabel} />
        <DetailField label={locale === 'zh-CN' ? '默认启用' : 'Default enabled'} value={formatBoolean(upgrade.defaultEnabled, locale)} />
        {presentation.staticMultiplierLabel ? (
          <DetailField label={locale === 'zh-CN' ? '静态倍率' : 'Static multiplier'} value={presentation.staticMultiplierLabel} />
        ) : null}
      </div>
    </article>
  )
}

function NumericUpgradeRow({ upgrade, presentation, locale }: NumericUpgradeRowProps) {
  return (
    <div className="upgrade-ledger__row">
      <span>{locale === 'zh-CN' ? `等级 ${formatNumber(upgrade.requiredLevel, locale)}` : `Level ${formatNumber(upgrade.requiredLevel, locale)}`}</span>
      <span>{presentation.typeLabel}</span>
      <span title={presentation.targetHint ?? undefined}>
        {presentation.targetLabel ?? (locale === 'zh-CN' ? '当前英雄' : 'Current champion')}
      </span>
      <span>{presentation.summary ?? presentation.staticMultiplierLabel ?? buildNotAvailableLabel(locale)}</span>
      <span>{presentation.prerequisiteLabel}</span>
    </div>
  )
}

function FeatCard({ feat, locale, effectContext }: FeatCardProps) {
  return (
    <article className="detail-subcard feat-card">
      <div className="detail-subcard__header">
        <div>
          <p className="detail-subcard__eyebrow">{locale === 'zh-CN' ? `顺序 ${formatNumber(feat.order, locale)}` : `Order ${formatNumber(feat.order, locale)}`}</p>
          <h3 className="detail-subcard__title"><LocalizedTextStack value={feat.name} /></h3>
        </div>
        <span className="detail-badge">{buildRarityLabel(feat.rarity, locale)}</span>
      </div>

      {feat.description ? <p className="detail-subcard__body">{getPrimaryLocalizedText(feat.description, locale)}</p> : null}

      <div className="detail-inline-grid">
        <EffectListPanel title={locale === 'zh-CN' ? '效果明细' : 'Effects'} value={feat.effects} locale={locale} effectContext={effectContext} />
        <StructuredPanel title={locale === 'zh-CN' ? '获取来源' : 'Sources'} value={feat.sources} locale={locale} effectContext={effectContext} />
        <StructuredPanel title={locale === 'zh-CN' ? '可用性与属性' : 'Properties'} value={feat.properties} locale={locale} effectContext={effectContext} />
        <StructuredPanel title={locale === 'zh-CN' ? '收藏来源' : 'Collection source'} value={feat.collectionsSource} locale={locale} effectContext={effectContext} />
      </div>
    </article>
  )
}

function isDetailSectionId(value: string): value is DetailSectionId {
  return DETAIL_SECTION_IDS.includes(value as DetailSectionId)
}

function resolveSectionIdFromHashValue(hashValue: string): DetailSectionId | null {
  const normalizedHash = hashValue.startsWith('#') ? hashValue.slice(1) : hashValue
  const normalizedSectionId = normalizedHash.startsWith(DETAIL_HASH_PREFIX)
    ? normalizedHash.slice(DETAIL_HASH_PREFIX.length)
    : normalizedHash

  return isDetailSectionId(normalizedSectionId) ? normalizedSectionId : null
}

function resolveSectionIdFromBrowserHash(hash: string): DetailSectionId | null {
  const normalizedHash = hash.startsWith('#') ? hash.slice(1) : hash
  const lastHashIndex = normalizedHash.lastIndexOf('#')

  if (lastHashIndex === -1) {
    return resolveSectionIdFromHashValue(normalizedHash)
  }

  return resolveSectionIdFromHashValue(normalizedHash.slice(lastHashIndex + 1))
}

function buildSectionHash(pathname: string, search: string, sectionId: DetailSectionId): string {
  return `#${pathname}${search}#${DETAIL_HASH_PREFIX}${sectionId}`
}

function resolveActiveSectionId(): DetailSectionId {
  const activationOffset = 196
  let activeSectionId: DetailSectionId = DETAIL_SECTION_IDS[0]

  for (const sectionId of DETAIL_SECTION_IDS) {
    const element = document.getElementById(sectionId)

    if (!element) {
      continue
    }

    if (element.getBoundingClientRect().top <= activationOffset) {
      activeSectionId = sectionId
    } else {
      break
    }
  }

  return activeSectionId
}

export function ChampionDetailPage() {
  const { championId } = useParams<{ championId: string }>()
  const location = useLocation()
  const navigate = useNavigate()
  const { locale, t } = useI18n()
  const [state, setState] = useState<ChampionDetailState>({ status: 'idle' })
  const [activeSectionId, setActiveSectionId] = useState<DetailSectionId>(DETAIL_SECTION_IDS[0])
  const pendingHashSectionIdRef = useRef<DetailSectionId | null>(null)
  const handledSectionHashRef = useRef<string | null>(null)
  const isLeavingPageRef = useRef(false)
  const [skinIllustrationsById, setSkinIllustrationsById] = useState<Map<string, ChampionIllustration>>(new Map())
  const [artworkDialogChampionId, setArtworkDialogChampionId] = useState<string | null>(null)
  const [selectedSkinId, setSelectedSkinId] = useState<string | null>(null)
  const isMissingChampionId = !championId

  useEffect(() => {
    let disposed = false

    if (!championId) {
      return undefined
    }

    pendingHashSectionIdRef.current = null
    handledSectionHashRef.current = null

    loadChampionDetail(championId)
      .then((detail) => {
        if (disposed) {
          return
        }

        setState({ status: 'ready', detail })
      })
      .catch((error: unknown) => {
        if (disposed) {
          return
        }

        if (error instanceof Error && error.message === 'HTTP 404') {
          setState({ status: 'not-found', championId })
          return
        }

        setState({
          status: 'error',
          championId,
          message: error instanceof Error ? error.message : '',
        })
      })

    return () => {
      disposed = true
    }
  }, [championId])

  useEffect(() => {
    let disposed = false

    loadCollection<ChampionIllustration>('champion-illustrations')
      .then((collection) => {
        if (disposed) {
          return
        }

        setSkinIllustrationsById(
          new Map(
            collection.items
              .filter((illustration) => illustration.kind === 'skin' && illustration.skinId)
              .map((illustration) => [illustration.skinId as string, illustration]),
          ),
        )
      })
      .catch(() => {
        if (disposed) {
          return
        }

        setSkinIllustrationsById(new Map())
      })

    return () => {
      disposed = true
    }
  }, [])

  useEffect(() => {
    isLeavingPageRef.current = false
  }, [championId])

  const detail =
    state.status === 'ready' && state.detail.summary.id === championId ? state.detail : null
  const isArtworkDialogOpen = detail ? artworkDialogChampionId === detail.summary.id : false
  const attackLabelById = useMemo(() => {
    if (!detail) {
      return new Map<string, string>()
    }

    const nextMap = new Map<string, string>()

    if (detail.attacks.base) {
      nextMap.set(detail.attacks.base.id, getPrimaryLocalizedText(detail.attacks.base.name, locale))
    }

    if (detail.attacks.ultimate) {
      nextMap.set(detail.attacks.ultimate.id, getPrimaryLocalizedText(detail.attacks.ultimate.name, locale))
    }

    return nextMap
  }, [detail, locale])
  const upgradeLabelById = useMemo(() => {
    if (!detail) {
      return new Map<string, string>()
    }

    return new Map(
      detail.upgrades.map((upgrade) => [upgrade.id, buildUpgradeReferenceLabel(upgrade, locale, attackLabelById)]),
    )
  }, [attackLabelById, detail, locale])
  const effectContext = useMemo<EffectContext | null>(() => {
    if (!detail) {
      return null
    }

    return {
      locale,
      championName: getPrimaryLocalizedText(detail.summary.name, locale),
      attackLabelById,
      upgradeLabelById,
    }
  }, [attackLabelById, detail, locale, upgradeLabelById])
  const upgradePresentations = useMemo(() => {
    if (!detail || !effectContext) {
      return new Map<string, UpgradePresentation>()
    }

    return new Map(
      detail.upgrades.map((upgrade) => [upgrade.id, buildUpgradePresentation(upgrade, effectContext)]),
    )
  }, [detail, effectContext])
  const selectedSkin = useMemo(() => {
    if (!detail || detail.skins.length === 0) {
      return null
    }

    return detail.skins.find((skin) => skin.id === selectedSkinId) ?? detail.skins[0]
  }, [detail, selectedSkinId])
  const isLoading =
    !isMissingChampionId &&
    (state.status === 'idle' ||
      (state.status === 'ready' && state.detail.summary.id !== championId) ||
      (state.status === 'not-found' && state.championId !== championId) ||
      (state.status === 'error' && state.championId !== championId))
  const spotlightUpgrades = useMemo(() => {
    if (!detail) {
      return []
    }

    return detail.upgrades.filter(
      (upgrade) =>
        Boolean(upgrade.name) ||
        Boolean(upgrade.specializationName) ||
        Boolean(upgrade.specializationDescription) ||
        Boolean(upgrade.tipText) ||
        Boolean(upgrade.effectDefinition) ||
        upgrade.upgradeType === 'unlock_ability' ||
        upgrade.upgradeType === 'unlock_ultimate',
    )
  }, [detail])
  const ledgerUpgrades = useMemo(() => {
    if (!detail) {
      return []
    }

    return detail.upgrades.filter(
      (upgrade) =>
        !upgrade.name &&
        !upgrade.specializationName &&
        !upgrade.specializationDescription &&
        !upgrade.tipText &&
        !upgrade.effectDefinition &&
        upgrade.upgradeType !== 'unlock_ability' &&
        upgrade.upgradeType !== 'unlock_ultimate',
    )
  }, [detail])
  const overviewFields = useMemo<DetailFieldProps[]>(() => {
    if (!detail) {
      return []
    }

    return [
      {
        label: t({ zh: 'Seat', en: 'Seat' }),
        value: locale === 'zh-CN' ? `${detail.summary.seat} 号位` : `Seat ${detail.summary.seat}`,
      },
      ...(detail.eventName
        ? [
            {
              label: t({ zh: '活动名', en: 'Event name' }),
              value: <LocalizedTextStack value={detail.eventName} />,
            },
          ]
        : []),
      {
        label: t({ zh: '首次可用', en: 'Date available' }),
        value: formatNullableText(detail.dateAvailable, locale),
      },
      ...(detail.lastReworkDate
        ? [
            {
              label: t({ zh: '最后重做', en: 'Last rework' }),
              value: formatNullableText(detail.lastReworkDate, locale),
            },
          ]
        : []),
      ...(detail.availability.nextEventTimestamp && detail.availability.nextEventTimestamp > 0
        ? [
            {
              label: t({ zh: '下次活动时间', en: 'Next event time' }),
              value: formatTimestamp(detail.availability.nextEventTimestamp, locale),
            },
          ]
        : []),
      {
        label: t({ zh: '默认天赋槽解锁', en: 'Default feat slots' }),
        value:
          detail.defaultFeatSlotUnlocks.length > 0
            ? detail.defaultFeatSlotUnlocks.join(' / ')
            : t({ zh: '暂无', en: 'None yet' }),
      },
      ...buildOverviewPropertyFields(detail, locale, effectContext),
    ]
  }, [detail, effectContext, locale, t])
  const sectionLinks: Array<{ id: DetailSectionId; label: string }> = [
    { id: 'overview', label: t({ zh: '概览', en: 'Overview' }) },
    { id: 'character-sheet', label: t({ zh: '角色卡', en: 'Character sheet' }) },
    { id: 'combat', label: t({ zh: '战斗', en: 'Combat' }) },
    { id: 'upgrades', label: t({ zh: '升级', en: 'Upgrades' }) },
    { id: 'feats', label: t({ zh: '天赋', en: 'Feats' }) },
  ]
  const activeSectionIndex = Math.max(
    sectionLinks.findIndex((section) => section.id === activeSectionId),
    0,
  )
  const activeSectionLabel = sectionLinks[activeSectionIndex]?.label ?? sectionLinks[0].label
  const sectionProgressValue = `${((activeSectionIndex + 1) / sectionLinks.length) * 100}%`
  const getSectionProgressState = (index: number): DetailSectionProgressState => {
    if (index < activeSectionIndex) {
      return 'completed'
    }

    if (index === activeSectionIndex) {
      return 'active'
    }

    return 'upcoming'
  }
  const getSectionProgressText = (state: DetailSectionProgressState): string => {
    if (state === 'completed') {
      return t({ zh: '已读', en: 'Seen' })
    }

    if (state === 'active') {
      return t({ zh: '当前', en: 'Current' })
    }

    return t({ zh: '未读', en: 'Ahead' })
  }
  const hashSectionId =
    typeof window === 'undefined'
      ? resolveSectionIdFromHashValue(location.hash)
      : resolveSectionIdFromBrowserHash(window.location.hash) ?? resolveSectionIdFromHashValue(location.hash)
  const selectedSkinArtworkIds = selectedSkin ? getSkinArtworkIds(selectedSkin) : null
  const selectedSkinIllustration = selectedSkin ? skinIllustrationsById.get(selectedSkin.id) ?? null : null
  const selectedSkinPreviewUrl =
    detail && selectedSkin
      ? resolveSkinPreviewUrl(selectedSkinIllustration, detail.summary)
      : null

  const openArtworkDialog = (skinId?: string) => {
    if (!detail || detail.skins.length === 0) {
      return
    }

    const nextSkinId = skinId && detail.skins.some((skin) => skin.id === skinId) ? skinId : detail.skins[0]?.id ?? null

    setSelectedSkinId(nextSkinId)
    setArtworkDialogChampionId(detail.summary.id)
  }

  const closeArtworkDialog = () => {
    setArtworkDialogChampionId(null)
    setSelectedSkinId(null)
  }

  useEffect(() => {
    if (!isArtworkDialogOpen || typeof window === 'undefined') {
      return undefined
    }

    const previousOverflow = document.body.style.overflow

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeArtworkDialog()
      }
    }

    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isArtworkDialogOpen])

  useEffect(() => {
    if (!detail || typeof window === 'undefined') {
      return undefined
    }

    const updateActiveSection = () => {
      const nextSectionId = resolveActiveSectionId()

      if (pendingHashSectionIdRef.current) {
        if (nextSectionId === pendingHashSectionIdRef.current) {
          pendingHashSectionIdRef.current = null
          setActiveSectionId(nextSectionId)
        }

        return
      }

      setActiveSectionId(nextSectionId)
    }

    updateActiveSection()
    window.addEventListener('scroll', updateActiveSection, { passive: true })
    window.addEventListener('resize', updateActiveSection)

    return () => {
      window.removeEventListener('scroll', updateActiveSection)
      window.removeEventListener('resize', updateActiveSection)
    }
  }, [detail])

  useEffect(() => {
    if (!detail || !hashSectionId || typeof window === 'undefined') {
      return
    }

    const browserHash = window.location.hash

    if (handledSectionHashRef.current === browserHash) {
      return
    }

    handledSectionHashRef.current = browserHash
    pendingHashSectionIdRef.current = hashSectionId

    const frameId = window.requestAnimationFrame(() => {
      setActiveSectionId(hashSectionId)
      document.getElementById(hashSectionId)?.scrollIntoView({ behavior: 'auto', block: 'start' })
    })

    return () => {
      window.cancelAnimationFrame(frameId)
    }
  }, [detail, hashSectionId])

  useEffect(() => {
    if (!detail || typeof window === 'undefined') {
      return
    }

    if (isLeavingPageRef.current) {
      return
    }

    if (pendingHashSectionIdRef.current && pendingHashSectionIdRef.current !== activeSectionId) {
      return
    }

    const nextHash = buildSectionHash(location.pathname, location.search, activeSectionId)
    handledSectionHashRef.current = nextHash

    if (window.location.hash === nextHash) {
      return
    }

    window.history.replaceState(
      window.history.state,
      '',
      `${window.location.pathname}${window.location.search}${nextHash}`,
    )
  }, [activeSectionId, detail, location.pathname, location.search])

  const scrollToSection = (id: string) => {
    if (isDetailSectionId(id)) {
      pendingHashSectionIdRef.current = id
      setActiveSectionId(id)

      if (typeof window !== 'undefined') {
        const nextHash = buildSectionHash(location.pathname, location.search, id)
        handledSectionHashRef.current = nextHash

        if (window.location.hash !== nextHash) {
          window.history.replaceState(
            window.history.state,
            '',
            `${window.location.pathname}${window.location.search}${nextHash}`,
          )
        }
      }
    }

    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const backToChampions = {
    pathname: '/champions',
    search: location.search,
  } as const

  return (
    <div className="page-stack champion-detail-page">
      <div className="page-backlink-row">
        <Link
          className="page-backlink"
          to={backToChampions}
          onClick={(event) => {
            // HashRouter pages here also manage an in-page section hash. Navigate explicitly so
            // leaving the page does not race with the section-hash sync effect and bounce back.
            event.preventDefault()
            isLeavingPageRef.current = true
            navigate(backToChampions)
          }}
        >
          {t({ zh: '← 返回英雄筛选', en: '← Back to champions' })}
        </Link>
      </div>

      {isLoading ? (
        <SurfaceCard
          eyebrow={t({ zh: '英雄详情', en: 'Champion detail' })}
          title={t({ zh: '正在整理英雄卷宗…', en: 'Building the champion dossier…' })}
          description={t({
            zh: '当前会加载结构化详情、成长轨道与技能信息。',
            en: 'This loads the structured profile, progression track, and combat details.',
          })}
        >
          <div className="status-banner status-banner--info">{t({ zh: '正在读取详情数据…', en: 'Loading detail data…' })}</div>
        </SurfaceCard>
      ) : null}

      {isMissingChampionId || (state.status === 'not-found' && state.championId === championId) ? (
        <SurfaceCard
          eyebrow={t({ zh: '英雄详情', en: 'Champion detail' })}
          title={t({ zh: '没有找到这个英雄', en: 'Champion not found' })}
          description={t({
            zh: '可能是链接里的英雄 ID 不存在，或当前静态数据版本还没有这份详情文件。',
            en: 'The champion id may be invalid, or this data version does not have a detail file yet.',
          })}
        >
          <div className="status-banner status-banner--info">
            {t({ zh: '你可以返回筛选页重新进入，或检查当前数据版本是否已重新生成。', en: 'Return to the champions page or regenerate the current data version.' })}
          </div>
        </SurfaceCard>
      ) : null}

      {state.status === 'error' && state.championId === championId ? (
        <SurfaceCard
          eyebrow={t({ zh: '英雄详情', en: 'Champion detail' })}
          title={t({ zh: '详情数据读取失败', en: 'Detail data failed to load' })}
          description={t({
            zh: '可能是静态文件缺失，也可能是当前数据合同和页面实现不一致。',
            en: 'The static file may be missing, or the data contract may be out of sync with the page.',
          })}
        >
          <div className="status-banner status-banner--error">
            {state.message || t({ zh: '未知错误', en: 'Unknown error' })}
          </div>
        </SurfaceCard>
      ) : null}

      {detail ? (
        <>
          <section className="champion-dossier">
            <div className="champion-dossier__grid">
              <div className="champion-dossier__identity">
                <div className="champion-dossier__avatar-stage">
                  <ChampionAvatar champion={detail.summary} locale={locale} className="champion-avatar--dossier" loading="eager" />
                  {detail.skins.length > 0 ? (
                    <button
                      type="button"
                      className="champion-dossier__artwork-button"
                      aria-label={t({ zh: '打开皮肤立绘预览', en: 'Open skin artwork preview' })}
                      onClick={() => openArtworkDialog()}
                    >
                      <span aria-hidden="true" className="champion-dossier__artwork-icon">
                        ◎
                      </span>
                      <span>{t({ zh: '看皮肤立绘', en: 'View skins' })}</span>
                    </button>
                  ) : null}
                </div>
                <div className="champion-dossier__copy">
                  <p className="champion-dossier__eyebrow">
                    {locale === 'zh-CN' ? `${detail.summary.seat} 号位 · 英雄 #${detail.summary.id}` : `Seat ${detail.summary.seat} · Champion #${detail.summary.id}`}
                  </p>
                  <h2 className="champion-dossier__title">{getPrimaryLocalizedText(detail.summary.name, locale)}</h2>
                  {getSecondaryLocalizedText(detail.summary.name, locale) ? (
                    <p className="champion-dossier__secondary">{getSecondaryLocalizedText(detail.summary.name, locale)}</p>
                  ) : null}
                  <p className="champion-dossier__summary">
                    {t({
                      zh: '这个页面把结构化资料、成长轨道和技能说明放在同一条浏览链路里，适合边查边做阵型判断。',
                      en: 'This page keeps the structured profile, progression track, and combat details in one browsing flow so you can inspect and decide quickly.',
                    })}
                  </p>

                  <div className="tag-row">
                    {detail.summary.roles.map((role) => (
                      <span key={role} className="tag-pill">
                        {getRoleLabel(role, locale)}
                      </span>
                    ))}
                  </div>

                  <div className="champion-dossier__meta-stack">
                    <span className="champion-dossier__meta-label">{t({ zh: '联动队伍', en: 'Affiliations' })}</span>
                    {detail.summary.affiliations.length > 0 ? (
                      <div className="champion-dossier__meta-list">
                        {detail.summary.affiliations.map((item) => (
                          <LocalizedTextStack key={`${item.display}-${item.original}`} value={item} />
                        ))}
                      </div>
                    ) : (
                      <p className="supporting-text champion-dossier__line">{t({ zh: '暂无', en: 'None yet' })}</p>
                    )}
                  </div>

                  <div className="tag-row">
                    {detail.summary.tags.map((tag) => (
                      <span key={tag} className="tag-pill tag-pill--muted">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="champion-dossier__stats">
                <article className="dossier-stat">
                  <span className="dossier-stat__label">{t({ zh: '升级条目', en: 'Upgrades' })}</span>
                  <strong className="dossier-stat__value">{detail.upgrades.length}</strong>
                </article>
                <article className="dossier-stat">
                  <span className="dossier-stat__label">{t({ zh: '天赋条目', en: 'Feats' })}</span>
                  <strong className="dossier-stat__value">{detail.feats.length}</strong>
                </article>
                <article className="dossier-stat">
                  <span className="dossier-stat__label">{t({ zh: '皮肤条目', en: 'Skins' })}</span>
                  <strong className="dossier-stat__value">{detail.skins.length}</strong>
                </article>
                <article className="dossier-stat">
                  <span className="dossier-stat__label">{t({ zh: '详情更新', en: 'Updated' })}</span>
                  <strong className="dossier-stat__value">{detail.updatedAt}</strong>
                </article>
              </div>
            </div>

            <div className="detail-badge-row detail-badge-row--wrap">
              <span className={detail.availability.isAvailable ? 'detail-badge detail-badge--active' : 'detail-badge'}>
                {t({ zh: '当前可用', en: 'Currently available' })}: {formatBoolean(detail.availability.isAvailable, locale)}
              </span>
              <span className={detail.availability.availableInShop ? 'detail-badge detail-badge--active' : 'detail-badge'}>
                {t({ zh: '商店', en: 'Shop' })}: {formatBoolean(detail.availability.availableInShop, locale)}
              </span>
              <span className={detail.availability.availableInTimeGate ? 'detail-badge detail-badge--active' : 'detail-badge'}>
                {t({ zh: '时间门', en: 'Time Gate' })}: {formatBoolean(detail.availability.availableInTimeGate, locale)}
              </span>
              <span className={detail.availability.availableInNextEvent ? 'detail-badge detail-badge--active' : 'detail-badge'}>
                {t({ zh: '下个活动', en: 'Next event' })}: {formatBoolean(detail.availability.availableInNextEvent, locale)}
              </span>
              {detail.eventName ? (
                <span className="detail-badge detail-badge--stacked">
                  <span className="detail-badge__prefix">{t({ zh: '活动', en: 'Event' })}</span>
                  <LocalizedTextStack value={detail.eventName} />
                </span>
              ) : null}
            </div>

            <div className="section-jump-bar">
              {sectionLinks.map((section) => (
                <button
                  key={section.id}
                  type="button"
                  className={
                    activeSectionId === section.id
                      ? 'section-jump-bar__button section-jump-bar__button--active'
                      : 'section-jump-bar__button'
                  }
                  aria-pressed={activeSectionId === section.id}
                  onClick={() => scrollToSection(section.id)}
                >
                  {section.label}
                </button>
              ))}
            </div>
          </section>

          <div className="champion-detail-layout">
            <div className="champion-detail-content">
              <SurfaceCard
                eyebrow={t({ zh: '概览', en: 'Overview' })}
                title={t({ zh: '身份、系统字段与可用性', en: 'Identity, system fields, and availability' })}
                description={t({
                  zh: '先把最容易影响筛选、判断和排错的基础字段集中展示。',
                  en: 'Start with the fields that most often affect filtering, decisions, and data checks.',
                })}
              >
                <div id="overview" className="detail-section-anchor" />
                <div className="detail-field-grid">
                  {overviewFields.map((field) => (
                    <DetailField key={field.label} label={field.label} value={field.value} hint={field.hint} />
                  ))}
                </div>
              </SurfaceCard>

              <SurfaceCard
                eyebrow={t({ zh: '角色卡', en: 'Character sheet' })}
                title={t({ zh: '叙事资料与能力分布', en: 'Narrative profile and ability spread' })}
                description={t({
                  zh: '把角色设定、D&D 属性和背景故事分在同一段，方便同时看机制与人设。',
                  en: 'Keep the lore profile, D&D stats, and backstory together so mechanics and flavor stay connected.',
                })}
              >
                <div id="character-sheet" className="detail-section-anchor" />
                {detail.characterSheet ? (
                  <>
                    <div className="detail-field-grid">
                      <DetailField label={t({ zh: '全名', en: 'Full name' })} value={detail.characterSheet.fullName ? <LocalizedTextStack value={detail.characterSheet.fullName} /> : t({ zh: '暂无', en: 'Not available' })} />
                      <DetailField label={t({ zh: '职业', en: 'Class' })} value={detail.characterSheet.class ? <LocalizedTextStack value={detail.characterSheet.class} /> : t({ zh: '暂无', en: 'Not available' })} />
                      <DetailField label={t({ zh: '种族', en: 'Race' })} value={detail.characterSheet.race ? <LocalizedTextStack value={detail.characterSheet.race} /> : t({ zh: '暂无', en: 'Not available' })} />
                      <DetailField label={t({ zh: '阵营', en: 'Alignment' })} value={detail.characterSheet.alignment ? <LocalizedTextStack value={detail.characterSheet.alignment} /> : t({ zh: '暂无', en: 'Not available' })} />
                      <DetailField label={t({ zh: '年龄', en: 'Age' })} value={formatNumber(detail.characterSheet.age, locale)} />
                    </div>

                    <div className="ability-score-grid">
                      {(['str', 'dex', 'con', 'int', 'wis', 'cha'] as const).map((key) => (
                        <article key={key} className="ability-score-card">
                          <span className="ability-score-card__label">{key.toUpperCase()}</span>
                          <strong className="ability-score-card__value">{formatNumber(detail.characterSheet?.abilityScores[key] ?? null, locale)}</strong>
                        </article>
                      ))}
                    </div>

                    {detail.characterSheet.backstory ? (
                      <article className="detail-subcard detail-subcard--story">
                        <h3 className="detail-subcard__title">{t({ zh: '背景故事', en: 'Backstory' })}</h3>
                        <p className="detail-subcard__body">{getPrimaryLocalizedText(detail.characterSheet.backstory, locale)}</p>
                      </article>
                    ) : null}
                  </>
                ) : (
                  <div className="status-banner status-banner--info">{t({ zh: '当前没有角色卡字段。', en: 'No character sheet fields are available here.' })}</div>
                )}
              </SurfaceCard>

              <SurfaceCard
                eyebrow={t({ zh: '战斗', en: 'Combat' })}
                title={t({ zh: '基础数值、普攻、大招与活动升级', en: 'Base stats, attacks, ultimate, and event upgrades' })}
                description={t({
                  zh: '这里把会直接影响理解英雄机制的字段集中起来。',
                  en: 'This section groups the fields that most directly explain how the champion behaves in combat.',
                })}
              >
                <div id="combat" className="detail-section-anchor" />
                <div className="detail-field-grid">
                  <DetailField label={t({ zh: '基础花费', en: 'Base cost' })} value={formatDigitString(detail.baseCost, locale)} />
                  <DetailField label={t({ zh: '基础伤害', en: 'Base damage' })} value={formatDigitString(detail.baseDamage, locale)} />
                  <DetailField label={t({ zh: '基础生命', en: 'Base health' })} value={formatDigitString(detail.baseHealth, locale)} />
                  <DetailField label={t({ zh: '事件升级', en: 'Event upgrades' })} value={formatNumber(detail.attacks.eventUpgrades.length, locale)} />
                </div>

                <div className="detail-card-grid detail-card-grid--two-up">
                  <AttackPanel title={t({ zh: '普攻', en: 'Base attack' })} attack={detail.attacks.base} locale={locale} />
                  <AttackPanel title={t({ zh: '大招', en: 'Ultimate' })} attack={detail.attacks.ultimate} locale={locale} />
                </div>

                {detail.attacks.eventUpgrades.length > 0 ? (
                  <div className="detail-card-grid">
                    {detail.attacks.eventUpgrades.map((upgrade) => (
                      <article key={upgrade.upgradeId} className="detail-subcard">
                        <div className="detail-subcard__header">
                          <div>
                            <p className="detail-subcard__eyebrow">{t({ zh: '活动升级', en: 'Event upgrade' })}</p>
                            <h3 className="detail-subcard__title"><LocalizedTextStack value={upgrade.name} /></h3>
                          </div>
                        </div>
                        {upgrade.description ? <p className="detail-subcard__body">{getPrimaryLocalizedText(upgrade.description, locale)}</p> : null}
                      </article>
                    ))}
                  </div>
                ) : null}
              </SurfaceCard>

              <SurfaceCard
                eyebrow={t({ zh: '升级', en: 'Upgrades' })}
                title={t({ zh: '成长轨道分成可读升级和数值里程碑', en: 'Split the progression track into readable upgrades and numeric milestones' })}
                description={t({
                  zh: '命名升级优先展示在上半段，空名数值升级用紧凑 ledger 排布，既不丢信息，也不把页面炸成瀑布流。',
                  en: 'Named upgrades stay in the upper layer, while unnamed numeric milestones move into a compact ledger so nothing is lost and the page stays scannable.',
                })}
              >
                <div id="upgrades" className="detail-section-anchor" />
                <div className="detail-field-grid detail-field-grid--compact">
                  <DetailField label={t({ zh: '全部升级', en: 'All upgrades' })} value={formatNumber(detail.upgrades.length, locale)} />
                  <DetailField label={t({ zh: '重点升级', en: 'Spotlight upgrades' })} value={formatNumber(spotlightUpgrades.length, locale)} />
                  <DetailField label={t({ zh: '数值里程碑', en: 'Numeric milestones' })} value={formatNumber(ledgerUpgrades.length, locale)} />
                </div>

                {spotlightUpgrades.length > 0 ? (
                  <div className="detail-card-grid">
                    {spotlightUpgrades.map((upgrade) => (
                      <UpgradeCard
                        key={upgrade.id}
                        upgrade={upgrade}
                        presentation={upgradePresentations.get(upgrade.id) ?? buildUpgradePresentation(upgrade, effectContext!)}
                        locale={locale}
                      />
                    ))}
                  </div>
                ) : null}

                {ledgerUpgrades.length > 0 ? (
                  <div className="upgrade-ledger">
                    <div className="upgrade-ledger__head">
                      <span>{t({ zh: '等级', en: 'Level' })}</span>
                      <span>{t({ zh: '类型', en: 'Type' })}</span>
                      <span>{t({ zh: '作用对象', en: 'Target' })}</span>
                      <span>{t({ zh: '效果说明', en: 'Effect summary' })}</span>
                      <span>{t({ zh: '前置', en: 'Prerequisite' })}</span>
                    </div>
                    {ledgerUpgrades.map((upgrade) => (
                      <NumericUpgradeRow
                        key={upgrade.id}
                        upgrade={upgrade}
                        presentation={upgradePresentations.get(upgrade.id) ?? buildUpgradePresentation(upgrade, effectContext!)}
                        locale={locale}
                      />
                    ))}
                  </div>
                ) : null}
              </SurfaceCard>

              <SurfaceCard
                eyebrow={t({ zh: '天赋', en: 'Feats' })}
                title={t({ zh: '全部天赋原样保留，并补来源字段', en: 'Keep every feat intact and expose its source fields' })}
                description={t({
                  zh: '这里不只展示名字和描述，还把 effect、source、property 一并展开。',
                  en: 'This section keeps more than the name and description by exposing effect, source, and property data together.',
                })}
              >
                <div id="feats" className="detail-section-anchor" />
                <div className="detail-card-grid">
                  {detail.feats.map((feat) => (
                    <FeatCard key={feat.id} feat={feat} locale={locale} effectContext={effectContext!} />
                  ))}
                </div>
              </SurfaceCard>
            </div>

            <aside className="champion-detail-sidebar">
              <div className="champion-detail-sidebar__panel">
                <p className="champion-detail-sidebar__eyebrow">{t({ zh: '快速索引', en: 'Quick index' })}</p>
                <section className="champion-detail-sidebar__progress" aria-label={t({ zh: '卷宗进度', en: 'Dossier progress' })}>
                  <div className="champion-detail-sidebar__progress-head">
                    <div>
                      <p className="champion-detail-sidebar__progress-label">{t({ zh: '卷宗进度', en: 'Dossier progress' })}</p>
                      <p className="champion-detail-sidebar__progress-copy">
                        {t({ zh: '当前浏览', en: 'Currently reading' })} · {activeSectionLabel}
                      </p>
                    </div>
                    <strong className="champion-detail-sidebar__progress-value">
                      {activeSectionIndex + 1} / {sectionLinks.length}
                    </strong>
                  </div>
                  <div className="champion-detail-sidebar__progress-track" aria-hidden="true">
                    <span className="champion-detail-sidebar__progress-fill" style={{ width: sectionProgressValue }} />
                  </div>
                </section>

                <div className="champion-detail-sidebar__nav">
                  {sectionLinks.map((section, index) => {
                    const progressState = getSectionProgressState(index)

                    return (
                      <button
                        key={section.id}
                        type="button"
                        data-testid={`sidebar-section-${section.id}`}
                        data-progress-state={progressState}
                        className={
                          activeSectionId === section.id
                            ? 'champion-detail-sidebar__button champion-detail-sidebar__button--active'
                            : 'champion-detail-sidebar__button'
                        }
                        aria-label={section.label}
                        aria-pressed={activeSectionId === section.id}
                        aria-current={progressState === 'active' ? 'step' : undefined}
                        onClick={() => scrollToSection(section.id)}
                      >
                        <span className="champion-detail-sidebar__button-index">{String(index + 1).padStart(2, '0')}</span>
                        <span className="champion-detail-sidebar__button-copy">
                          <span className="champion-detail-sidebar__button-label">{section.label}</span>
                          <span className="champion-detail-sidebar__button-state">{getSectionProgressText(progressState)}</span>
                        </span>
                      </button>
                    )
                  })}
                </div>

              </div>
            </aside>
          </div>

          {isArtworkDialogOpen && selectedSkin ? (
            <div
              className="skin-artwork-dialog"
              role="dialog"
              aria-modal="true"
              aria-label={t({ zh: '皮肤立绘预览', en: 'Skin artwork preview' })}
              onClick={closeArtworkDialog}
            >
              <div className="skin-artwork-dialog__backdrop" aria-hidden="true" />
              <div className="skin-artwork-dialog__panel" onClick={(event) => event.stopPropagation()}>
                <div className="skin-artwork-dialog__header">
                  <div className="skin-artwork-dialog__copy">
                    <p className="champion-detail-sidebar__eyebrow">{t({ zh: '皮肤立绘预览', en: 'Skin artwork preview' })}</p>
                    <h3 className="skin-artwork-dialog__title"><LocalizedTextStack value={selectedSkin.name} /></h3>
                    <p className="skin-artwork-dialog__hint">
                      {t({
                        zh: selectedSkinIllustration
                          ? '当前预览来自站内版本化立绘静态资源；下方继续保留原始 graphic id 与来源槽位，方便核对基座。'
                          : '当前没有命中本地皮肤立绘时，会回退到英雄头像；下方继续保留原始 graphic id，方便排查缺口。',
                        en: selectedSkinIllustration
                          ? 'This preview is now served from the versioned local illustration asset while the original graphic ids stay visible below for verification.'
                          : 'When a local skin illustration is unavailable, this preview falls back to the champion portrait while keeping the original graphic ids visible below.',
                      })}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="skin-artwork-dialog__close"
                    aria-label={t({ zh: '关闭皮肤立绘预览', en: 'Close skin artwork preview' })}
                    onClick={closeArtworkDialog}
                  >
                    ×
                  </button>
                </div>

                <div className="skin-artwork-dialog__body">
                  <div className="skin-artwork-dialog__stage">
                    <div className="skin-artwork-dialog__canvas">
                      {selectedSkinPreviewUrl ? (
                        <img
                          className="skin-artwork-dialog__image"
                          src={selectedSkinPreviewUrl}
                          alt={buildSkinPreviewAlt(selectedSkin, locale)}
                          loading="eager"
                        />
                      ) : (
                        <div className="skin-artwork-dialog__fallback">
                          {t({ zh: '当前没有可用的皮肤预览资源。', en: 'No skin preview asset is available right now.' })}
                        </div>
                      )}
                    </div>

                    <div className="detail-field-grid detail-field-grid--compact">
                      <DetailField label={t({ zh: '本地立绘', en: 'Local illustration' })} value={selectedSkinIllustration ? t({ zh: '已命中', en: 'Available' }) : t({ zh: '未命中', en: 'Missing' })} />
                      <DetailField label={t({ zh: '来源槽位', en: 'Source slot' })} value={selectedSkinIllustration?.sourceSlot ?? t({ zh: '未知', en: 'Unknown' })} />
                      <DetailField label={t({ zh: 'Base Graphic ID', en: 'Base graphic ID' })} value={formatNullableText(selectedSkinArtworkIds?.baseGraphicId ?? null, locale)} />
                      <DetailField label={t({ zh: 'Large Graphic ID', en: 'Large graphic ID' })} value={formatNullableText(selectedSkinArtworkIds?.largeGraphicId ?? null, locale)} />
                      <DetailField label={t({ zh: 'XL Graphic ID', en: 'XL graphic ID' })} value={formatNullableText(selectedSkinArtworkIds?.xlGraphicId ?? null, locale)} />
                      <DetailField label={t({ zh: 'Portrait Graphic ID', en: 'Portrait graphic ID' })} value={formatNullableText(selectedSkinArtworkIds?.portraitGraphicId ?? null, locale)} />
                    </div>
                  </div>

                  <div className="skin-artwork-dialog__selector">
                    <p className="skin-artwork-dialog__selector-title">{t({ zh: '切换皮肤', en: 'Switch skins' })}</p>
                    <div className="skin-artwork-dialog__tabs">
                      {detail.skins.map((skin) => {
                        const artworkIds = getSkinArtworkIds(skin)

                        return (
                          <button
                            key={skin.id}
                            type="button"
                            className={
                              selectedSkin.id === skin.id
                                ? 'skin-artwork-dialog__tab skin-artwork-dialog__tab--active'
                                : 'skin-artwork-dialog__tab'
                            }
                            aria-label={
                              locale === 'zh-CN'
                                ? `切换皮肤：${getPrimaryLocalizedText(skin.name, locale)}`
                                : `Switch skin: ${getPrimaryLocalizedText(skin.name, locale)}`
                            }
                            aria-pressed={selectedSkin.id === skin.id}
                            onClick={() => setSelectedSkinId(skin.id)}
                          >
                            <span className="skin-artwork-dialog__tab-title">{getPrimaryLocalizedText(skin.name, locale)}</span>
                            <span className="skin-artwork-dialog__tab-meta">
                              {artworkIds.largeGraphicId || artworkIds.xlGraphicId || artworkIds.portraitGraphicId
                                ? `ID ${artworkIds.largeGraphicId ?? artworkIds.xlGraphicId ?? artworkIds.portraitGraphicId}`
                                : t({ zh: '暂无图像字段', en: 'No graphic id' })}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  )
}
