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
  HeroUnsupportedSignal,
} from '../../src/domain/abilities/abilityModel'
import { computeHeroGainProfile } from '../../src/domain/abilities/abilityModel'

export function buildOfficialHeroModel(
  champion: Record<string, unknown>,
  detail: Record<string, unknown>,
): HeroAbilityProfile {
  const carrySignals: HeroAbilitySignal[] = []
  const supportSignals: HeroAbilitySignal[] = []
  const unsupportedSignals: HeroUnsupportedSignal[] = []
  let baseCritChancePercent: number | null = null

  for (const entry of collectEffectEntries(detail).entries) {
    // feat 外部化（与专精同构，ADR 0017）：feat effect 不进 base，由 feat-catalog + runtime
    // 按玩家选择（OwnedHero.feats）注入。否则 base 含全 feat（理论最大），runtime 再注入会双计；
    // 旧实现误用替换式注入还抹掉了 base 支援信号。signal-coverage 仍计 feat（entries 未过滤）。
    if (entry.sourceBucket === 'feat') {
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
      const signal = { ...semanticSignal, requiredLevel: semanticSignal.requiredLevel ?? entry.requiredLevel }
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
