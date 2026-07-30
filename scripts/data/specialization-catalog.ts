import { collectSpecializationEffectEntries, normalizeEffectSignal, splitEffectString } from './effect-helpers'
import { asArray, asRecord } from './io-utils'
import { attachSignalSemantics } from '../../src/domain/abilities/signalSemantics'
import {
  DIMENSION_BY_KIND,
  type HeroAbilityDimension,
  type HeroAbilitySignal,
} from '../../src/domain/abilities/abilityModel'

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
  signal: HeroAbilitySignal
}

export interface SpecializationEntry {
  upgradeId: string
  specializationName: { original: string; display: string } | null
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

  // upgradeId → specializationName（仅 specializationName != null 的专精节点）
  const nameByUpgradeId = new Map<string, SpecializationNameValue>()
  for (const upgradeRaw of asArray(detailRecord?.upgrades)) {
    const upgrade = asRecord(upgradeRaw)
    if (!upgrade) continue
    const name = readSpecializationName(upgrade.specializationName)
    if (!name) continue
    const id = typeof upgrade.id === 'string' || typeof upgrade.id === 'number' ? String(upgrade.id) : ''
    if (!id) continue
    nameByUpgradeId.set(id, name)
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
    list.push({ dimension, signal })
    signalsByUpgradeId.set(upgradeId, list)
  }

  const entries: SpecializationEntry[] = []
  for (const [upgradeId, specializationName] of nameByUpgradeId) {
    const signals = signalsByUpgradeId.get(upgradeId) ?? []
    if (signals.length === 0) continue
    entries.push({ upgradeId, specializationName, signals })
  }
  return entries
}
