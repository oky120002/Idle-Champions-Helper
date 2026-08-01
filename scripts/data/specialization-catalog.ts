import { collectEffectEntries, collectSpecializationEffectEntries, normalizeEffectSignal, splitEffectString } from './effect-helpers'
import { asArray, asRecord } from './io-utils'
import { attachSignalSemantics } from '../../src/domain/abilities/signalSemantics'
import {
  DIMENSION_BY_KIND,
  type HeroAbilityDimension,
  type HeroAbilitySignal,
} from '../../src/domain/abilities/abilityModel'
import type { SignalBucket } from './effect-resolvers/resolverShared'

/**
 * 专精（specialization）归一化：champion-details upgrades（specializationName != null）→ SpecializationEntry[]。
 *
 * 专精 upgrade 是玩家在互斥选项里选一个（或多个专精层各选一个）的 upgrade 节点；其 effect 走与 base
 * signal 完全一致的解析路径（collectSpecializationEffectEntries 复用 collectRawEffectEntries 的 buildEffectEntry，
 * 此处再 splitEffectString + normalizeEffectSignal + attachSignalSemantics，与 buildOfficialHeroModel 逐字相同），
 * 保证 catalog signal 与原 base signal 等价。运行时只注入玩家选中 upgradeId 的 signal（OwnedHero.specializations），
 * 而非全 active（ADR 0017）。
 *
 * 非 scoring dimension 的专精 effect（utility/unique）跳过；无 scoring signal 的专精不进 catalog（同 feat-catalog）。
 * specializationName 来自 normalize 层（champion-details upgrades[].specializationName = {original, display}）。
 */
export interface SpecializationSignalEntry {
  dimension: HeroAbilityDimension
  /**
   * signal 归属 bucket（build 期 resolveBucket 判定）：自增益→carrySignals（仅自走 carry 时计入），
   * 支援/全局→supportSignals（支援任意 carry 时计入）。runtime 按此路由到正确 bucket 追加，
   * 复现「base 只含该专精」的预外部化行为（ADR 0017 不变量）。
   */
  bucket: SignalBucket
  signal: HeroAbilitySignal
}

export interface SpecializationEntry {
  upgradeId: string
  specializationName: { original: string; display: string } | null
  /**
   * 专精 upgrade 解锁等级（champion-details upgrade.required_level）。UI 按 requiredLevel 分层：
   * 同 requiredLevel = 同层互斥（单选），不同 requiredLevel = 不同层各选一个。null = 无等级信息。
   */
  requiredLevel: number | null
  signals: SpecializationSignalEntry[]
}

interface SpecializationNameValue {
  original: string
  display: string
}

function readSpecializationName(raw: unknown): SpecializationNameValue | null {
  const rec = asRecord(raw)
  if (!rec) return null
  const original = typeof rec.original === 'string' ? rec.original : null
  if (!original) return null
  const display = typeof rec.display === 'string' ? rec.display : original
  return { original, display }
}

/**
 * 解析一个英雄的专精 upgrade → SpecializationEntry[]（按 upgradeId）。
 * 输入 detail = champion-details/{id}.json 的归一化对象。
 */
export function buildSpecializationEntries(detail: unknown): SpecializationEntry[] {
  const detailRecord = asRecord(detail)

  // upgradeId → specializationName + requiredLevel（仅 specializationName != null 的专精节点）。
  // requiredLevel 来自 upgrade.required_level，UI 按它分层（同层互斥、层间各选一个）。
  const metaByUpgradeId = new Map<string, { name: SpecializationNameValue; requiredLevel: number | null }>()
  for (const upgradeRaw of asArray(detailRecord?.upgrades)) {
    const upgrade = asRecord(upgradeRaw)
    if (!upgrade) continue
    const name = readSpecializationName(upgrade.specializationName)
    if (!name) continue
    const id = typeof upgrade.id === 'string' || typeof upgrade.id === 'number' ? String(upgrade.id) : ''
    if (!id) continue
    const requiredLevelRaw = upgrade.requiredLevel
    const requiredLevel = typeof requiredLevelRaw === 'number' && Number.isFinite(requiredLevelRaw)
      ? requiredLevelRaw
      : null
    metaByUpgradeId.set(id, { name, requiredLevel })
  }

  // 按 upgradeId 聚合 spec effect → scoring signals（与 buildOfficialHeroModel 同解析路径）
  const signalsByUpgradeId = new Map<string, SpecializationSignalEntry[]>()
  for (const entry of collectSpecializationEffectEntries(detail)) {
    const upgradeId = entry.upgradeId ?? ''
    if (!upgradeId) continue
    const split = splitEffectString(entry.effectString)
    if (!split) continue
    const parsed = normalizeEffectSignal(split.effectName, split.effectValue, 'official-parsed', entry)
    if (!parsed.ok) continue
    const semanticSignal = attachSignalSemantics(parsed.signal, entry.effect)
    const signal: HeroAbilitySignal = {
      ...semanticSignal,
      requiredLevel: semanticSignal.requiredLevel ?? entry.requiredLevel,
    }
    const dimension = DIMENSION_BY_KIND[signal.kind]
    if (!dimension) continue
    const list = signalsByUpgradeId.get(upgradeId) ?? []
    // bucket 与 buildOfficialHeroModel 同源（同一 normalizeEffectSignal 调用），逐字复现 base 分类。
    list.push({ dimension, bucket: parsed.bucket, signal })
    signalsByUpgradeId.set(upgradeId, list)
  }

  // buff_upgrade wrapper 派生信号（靶向专精）：附到对应 spec，runtime 随玩家选择注入。
  // 只保留能力源（ability/upgrade/upgrade-effect-key）wrapper——英雄自带，随专精注入合理（ADR 0017）。
  // 外部装备/feat 源（loot/legendary/feat）移出：spec catalog 选专精时无条件注入不查 owned → overcount
  //（与 buildHeroModels 过滤 loot/legendary 不进 base profile 同构，e053b759）。loot/feat 源 target 专精的
  // owned 接入需 spec signal 带 upgradeId + runtime applyEquipmentBuffs 扩展（TODO atd_b1e5f3a2c7 方案 b/c）。
  const externalSourceBuckets = new Set(['loot', 'legendary', 'feat'])
  const { specializationDerived } = collectEffectEntries(detail)
  for (const [specUpgradeId, derivedEntries] of specializationDerived) {
    for (const derivedEntry of derivedEntries) {
      if (externalSourceBuckets.has(derivedEntry.sourceBucket)) continue
      const signal = derivedEntry.signalPreset
      if (!signal) continue
      const dimension = DIMENSION_BY_KIND[signal.kind]
      if (!dimension) continue
      // 派生信号 bucket = 目标 spec 的 bucket（collectEffectEntries 已写入 bucketOverride）；
      // 与 base 派生展开同源（resolveEntrySignal 的 bucketOverride ?? 'supportSignals'）。
      const bucket: SignalBucket = derivedEntry.bucketOverride ?? 'supportSignals'
      const derived = signalsByUpgradeId.get(specUpgradeId) ?? []
      derived.push({ dimension, bucket, signal })
      signalsByUpgradeId.set(specUpgradeId, derived)
    }
  }

  const entries: SpecializationEntry[] = []
  for (const [upgradeId, { name, requiredLevel }] of metaByUpgradeId) {
    const signals = signalsByUpgradeId.get(upgradeId) ?? []
    if (signals.length === 0) continue
    entries.push({ upgradeId, specializationName: name, requiredLevel, signals })
  }
  return entries
}
