import { attachSignalSemantics } from '../../src/domain/abilities/signalSemantics.ts'
import {
  collectEffectEntries,
  normalizeEffectSignal,
  parseBaseCritChancePercent,
  shouldIgnoreUnsupportedEffectEntry,
  splitEffectString,
} from './effect-helpers.ts'
import { asRecord } from './io-utils.ts'
import type {
  HeroAbilityProfile,
  HeroAbilitySignal,
  HeroPredicateAST,
  HeroQualifier,
  HeroUnsupportedSignal,
} from '../../src/domain/abilities/abilityModel'
import { computeHeroGainProfile } from '../../src/domain/abilities/abilityModel'

// GetUpgradeUnlocked(N) / GetUpgradePurchased(N) 节点 build 期解析：upgrade N 属本英雄（self，布尔引用均
// self-ref），从 detail.upgrades 取 requiredLevel + isSpecialization(specializationName 非空) + ownerHeroId=self
// 烘进节点。runtime evalHeroPredicate 按 ownerHeroId 查 ownedLevels/ownedSpecializations。本英雄 upgrades 查不到
//（跨英雄引用）→ 节点留 undefined → eval false（保守）。
function enrichUpgradePredicateNodes(
  signals: readonly HeroAbilitySignal[],
  ownerHeroId: string,
  upgradeMeta: Map<string, { requiredLevel: number; isSpecialization: boolean }>,
): void {
  for (const signal of signals) {
    enrichQualifier(signal.targetQualifier, ownerHeroId, upgradeMeta)
    enrichQualifier(signal.formationCountQualifier, ownerHeroId, upgradeMeta)
  }
}

function enrichQualifier(
  qualifier: HeroQualifier | null | undefined,
  ownerHeroId: string,
  upgradeMeta: Map<string, { requiredLevel: number; isSpecialization: boolean }>,
): void {
  if (!qualifier) return
  walk(qualifier.predicate)
  function walk(node: HeroPredicateAST): void {
    if (node.op === 'upgradeUnlocked' || node.op === 'upgradePurchased') {
      const meta = upgradeMeta.get(node.upgradeId)
      if (meta !== undefined) {
        node.ownerHeroId = ownerHeroId
        node.requiredLevel = meta.requiredLevel
        if (node.op === 'upgradePurchased') {
          node.isSpecialization = meta.isSpecialization
        }
      }
      return
    }
    if (node.op === 'or' || node.op === 'and') {
      node.children.forEach(walk)
    } else if (node.op === 'not') {
      walk(node.child)
    }
  }
}

export function buildOfficialHeroModel(
  champion: Record<string, unknown>,
  detail: Record<string, unknown>,
): HeroAbilityProfile {
  const carrySignals: HeroAbilitySignal[] = []
  const supportSignals: HeroAbilitySignal[] = []
  const unsupportedSignals: HeroUnsupportedSignal[] = []
  let baseCritChancePercent: number | null = null

  for (const entry of collectEffectEntries(detail).entries) {
    // 外部源（feat/loot/legendary）不进 base scored profile——加成源唯一性不变式
    // （见 simulator.md + modeling-pitfalls.md）：feat 外部化（ADR 0017，feat-catalog + runtime 注入）；
    // loot/legendary 同构——装备只走 owned-aware 通道（equipmentMult.ts），build 管线 bake 装备源
    // 会与 owned 通道双重计数。signal-coverage 仍计这些源（entries 未过滤，collectEffectEntries 保留）。
    if (
      entry.sourceBucket === 'feat'
      || entry.sourceBucket === 'loot'
      || entry.sourceBucket === 'legendary'
    ) {
      continue
    }
    const split = splitEffectString(entry.effectString)

    if (!split) {
      continue
    }

    // set_base_crit_chance：英雄 innate base crit SET（非位置信号），提取为 hero 字段，不进信号池
    const baseCritChance = parseBaseCritChancePercent(split.effectName, split.effectValue)
    if (baseCritChance !== null) {
      baseCritChancePercent = baseCritChance
      continue
    }

    const parsed = normalizeEffectSignal(split.effectName, split.effectValue, 'official-parsed', entry)

    if (parsed.ok) {
      const semanticSignal = attachSignalSemantics(parsed.signal, entry.effect)
      // 等级解锁门控：普通 entry 从 EffectEntry.requiredLevel 补；preset/derived signal 已带
      // （preset spread targetSignal，target 的 requiredLevel 经 resolveEntrySignal 写入）。
      // upgradeId 透传源 upgrade id（runtime 装备 buff_upgrade 按 target upgradeId 反查 direct base）。
      const signal = {
        ...semanticSignal,
        requiredLevel: semanticSignal.requiredLevel ?? entry.requiredLevel,
        upgradeId: entry.upgradeId || null,
      }
      if (parsed.bucket === 'carrySignals') {
        carrySignals.push(signal)
      } else {
        supportSignals.push(signal)
      }
    } else {
      if (!shouldIgnoreUnsupportedEffectEntry(parsed.unsupported.rawEffect)) {
        unsupportedSignals.push(parsed.unsupported)
      }
    }
  }

  // GetUpgradeUnlocked/GetUpgradePurchased(N) 解析：本英雄 upgrades → upgradeId→{requiredLevel, isSpecialization}，
  // 烘进 qualifier AST 节点。isSpecialization = specializationName 非空（专精选项，玩家手选；regular 随等级自动生效）。
  const upgradeMeta = new Map<string, { requiredLevel: number; isSpecialization: boolean }>()
  const upgradesRaw = detail.upgrades
  if (Array.isArray(upgradesRaw)) {
    for (const up of upgradesRaw) {
      if (!up || typeof up !== 'object') continue
      const u = up as { id?: unknown; requiredLevel?: unknown; specializationName?: unknown }
      const idStr = typeof u.id === 'string' || typeof u.id === 'number' ? String(u.id) : null
      if (idStr && typeof u.requiredLevel === 'number') {
        const specName = u.specializationName
        const isSpecialization = !!specName && typeof specName === 'object'
        upgradeMeta.set(idStr, { requiredLevel: u.requiredLevel, isSpecialization })
      }
    }
  }
  if (upgradeMeta.size > 0) {
    enrichUpgradePredicateNodes(carrySignals, champion.id as string, upgradeMeta)
    enrichUpgradePredicateNodes(supportSignals, champion.id as string, upgradeMeta)
  }

  const rawBaseDamage = Number(detail.baseDamage)
  const baseDamage = Number.isFinite(rawBaseDamage) ? rawBaseDamage : 0
  const costCurvesRaw = detail.costCurves
  const costCurves = costCurvesRaw && typeof costCurvesRaw === 'object' ? costCurvesRaw as Record<string, number> : null
  const rawBaseHealth = Number(detail.baseHealth)
  const baseHealth = Number.isFinite(rawBaseHealth) ? rawBaseHealth : 0
  const healthCurvesRaw = detail.healthCurves
  const healthCurves = healthCurvesRaw && typeof healthCurvesRaw === 'object' ? healthCurvesRaw as Record<string, number> : null

  const attacks = asRecord(detail.attacks) ?? {}
  const base = asRecord(attacks.base) ?? {}
  const characterSheet = asRecord(detail.characterSheet) ?? {}

  // patron 资格列表（summary.patronEligibility.eligiblePatronIds），EligibleForPatron 查。
  const summary = asRecord(detail.summary) ?? {}
  const patronEligibility = asRecord(summary.patronEligibility) ?? {}
  const eligiblePatronIdsRaw = Array.isArray(patronEligibility.eligiblePatronIds) ? patronEligibility.eligiblePatronIds : null
  const eligiblePatronIds = eligiblePatronIdsRaw
    ? eligiblePatronIdsRaw.filter((id): id is string => typeof id === 'string' || typeof id === 'number').map(String)
    : null

  return {
    heroId: champion.id as string,
    name: champion.name as HeroAbilityProfile['name'],
    seat: champion.seat as number,
    roles: champion.roles as string[],
    tags: champion.tags as string[],
    baseAttackDamageTypes: base.damageTypes as string[] ?? [],
    baseAttackCooldown: typeof base.cooldown === 'number' ? base.cooldown : null,
    age: typeof characterSheet.age === 'number' ? characterSheet.age : null,
    abilityScores: characterSheet.abilityScores as HeroAbilityProfile['abilityScores'] ?? {},
    baseDamage,
    baseCritChancePercent,
    costCurves,
    baseHealth,
    healthCurves,
    eligiblePatronIds,
    carrySignals,
    supportSignals,
    unsupportedSignals,
    // build 期预算各维度收益，供 computationMode 按收益排序裁剪候选（见 src/domain/planner/computationMode.ts）。
    gainProfile: computeHeroGainProfile(carrySignals, supportSignals),
    sourceBreakdown: {
      carrySignals: carrySignals.map((): 'official-parsed' => 'official-parsed'),
      supportSignals: supportSignals.map((): 'official-parsed' => 'official-parsed'),
      unsupportedSignals: unsupportedSignals.map((): 'official-parsed' => 'official-parsed'),
    },
  }
}
