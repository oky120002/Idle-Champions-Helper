import { attachSignalSemantics } from '../../src/domain/abilities/signalSemantics.ts'
import type {
  HeroAbilityProfile,
  HeroAbilitySignal,
  HeroPredicateAST,
  HeroQualifier,
  HeroUnsupportedSignal,
} from '../../src/domain/abilities/abilityModel'
import { computeHeroGainProfile } from '../../src/domain/abilities/abilityModel'
import {
  collectEffectEntries,
  normalizeEffectSignal,
  parseBaseCritChancePercent,
  shouldIgnoreUnsupportedEffectEntry,
  splitEffectString,
} from './effect-helpers.ts'
import { asArray, asRecord } from './io-utils.ts'

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

  // 预扫描 favored_foe,tag 效果，收集偏好敌人标签供 vulnerability resolver 跨效果引用
  //（increase_monster_damage_if_favored_foe 的 tag 来自同英雄另一 upgrade 的 favored_foe 声明）。
  const effectEntries = collectEffectEntries(detail).entries
  const favoredFoeTags = effectEntries
    .map((e) => splitEffectString(e.effectString))
    .map((s) => (s?.effectName === 'favored_foe' ? s.effectValue : null))
    .filter((tag): tag is string => tag != null && tag !== '')

  for (const entry of effectEntries) {
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

    const parsed = normalizeEffectSignal(split.effectName, split.effectValue, 'official-parsed', { ...entry, favoredFoeTags })

    if (parsed.ok) {
      const semanticSignal = attachSignalSemantics(parsed.signal, entry.effect)
      // 等级解锁门控：普通 entry 从 EffectEntry.requiredLevel 补；preset/derived signal 已带
      // （preset spread targetSignal，target 的 requiredLevel 经 resolveEntrySignal 写入）。
      // upgradeId 透传源 upgrade id（runtime 装备 buff_upgrade 按 target upgradeId 反查 direct base）。
      const signal = {
        ...semanticSignal,
        requiredLevel: semanticSignal.requiredLevel ?? entry.requiredLevel,
        upgradeId: entry.upgradeId !== null && entry.upgradeId !== '' ? entry.upgradeId : null,
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
      if (up === null || typeof up !== 'object') continue
      const u = up as { id?: unknown; requiredLevel?: unknown; specializationName?: unknown }
      const idStr = typeof u.id === 'string' || typeof u.id === 'number' ? String(u.id) : null
      if (idStr !== null && idStr !== '' && typeof u.requiredLevel === 'number') {
        const specName = u.specializationName
        const isSpecialization = typeof specName === 'object' && specName !== null
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
  const rawBaseCost = Number(detail.baseCost)
  const baseCost = Number.isFinite(rawBaseCost) ? rawBaseCost : 0
  const costCurvesRaw = detail.costCurves
  const costCurves = typeof costCurvesRaw === 'object' && costCurvesRaw !== null ? costCurvesRaw as Record<string, number> : null
  const rawBaseHealth = Number(detail.baseHealth)
  const baseHealth = Number.isFinite(rawBaseHealth) ? rawBaseHealth : 0
  const healthCurvesRaw = detail.healthCurves
  const healthCurves = typeof healthCurvesRaw === 'object' && healthCurvesRaw !== null ? healthCurvesRaw as Record<string, number> : null

  const attacks = asRecord(detail.attacks) ?? {}
  const base = asRecord(attacks.base) ?? {}
  const characterSheet = asRecord(detail.characterSheet) ?? {}

  // change_base_attack 攻击参数覆盖：非专精 = 总是生效（直接覆盖 base）；
  // 专精 = runtime 按玩家选择注入（存入 profile.attackOverrides）。
  const rawAttackOverrides = detail.attackOverrides as Record<string, { cooldown: number | null; numTargets: number | null }> | undefined
  const allOverrides = rawAttackOverrides ?? {}
  const upgradeList = asArray(detail.upgrades)
  const specOverrideIds = new Set<string>()
  for (const up of upgradeList) {
    const upgrade = asRecord(up)
    if (!upgrade) continue
    if (upgrade.specializationName != null) {
      const uid = typeof upgrade.id === 'string' || typeof upgrade.id === 'number' ? String(upgrade.id) : ''
      if (uid && uid in allOverrides) specOverrideIds.add(uid)
    }
  }
  // 非专精 override：取最后一个（requiredLevel 最高的）应用到 base 参数
  let effectiveCooldown = typeof base.cooldown === 'number' ? base.cooldown : null
  let effectiveNumTargets = typeof base.numTargets === 'number' && base.numTargets > 0 ? base.numTargets : null
  for (const up of upgradeList) {
    const upgrade = asRecord(up)
    if (!upgrade) continue
    const uid = typeof upgrade.id === 'string' || typeof upgrade.id === 'number' ? String(upgrade.id) : ''
    if (!uid || specOverrideIds.has(uid)) continue
    const ov = allOverrides[uid]
    if (!ov) continue
    if (typeof ov.cooldown === 'number') effectiveCooldown = ov.cooldown
    if (typeof ov.numTargets === 'number') effectiveNumTargets = ov.numTargets
  }
  // 专精 override：存入 profile，runtime 注入时覆盖
  const specAttackOverrides: Record<string, { cooldown: number | null; numTargets: number | null }> = {}
  for (const uid of specOverrideIds) {
    specAttackOverrides[uid] = allOverrides[uid]
  }

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
    baseAttackDamageTypes: (base.damageTypes as string[] | undefined) ?? [],
    baseAttackCooldown: effectiveCooldown,
    numTargets: effectiveNumTargets,
    damageModifier: (() => { const dm = Number(base.damageModifier); return Number.isFinite(dm) && dm > 0 ? dm : null })(),
    age: typeof characterSheet.age === 'number' ? characterSheet.age : null,
    abilityScores: (characterSheet.abilityScores as HeroAbilityProfile['abilityScores'] | undefined) ?? {},
    // build 期预算各维度收益，供 computationMode 按收益排序裁剪候选（见 src/domain/planner/computationMode.ts）。
    gainProfile: computeHeroGainProfile(carrySignals, supportSignals),
    sourceBreakdown: {
      carrySignals: carrySignals.map((): 'official-parsed' => 'official-parsed'),
      supportSignals: supportSignals.map((): 'official-parsed' => 'official-parsed'),
      unsupportedSignals: unsupportedSignals.map((): 'official-parsed' => 'official-parsed'),
    },
    baseDamage,
    baseCost,
    baseCritChancePercent,
    costCurves,
    baseHealth,
    healthCurves,
    eligiblePatronIds,
    attackOverrides: Object.keys(specAttackOverrides).length > 0 ? specAttackOverrides : null,
    carrySignals,
    supportSignals,
    unsupportedSignals,
  }
}
