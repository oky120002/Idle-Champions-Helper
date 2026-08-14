import type { HeroAbilitySignal } from '../../abilities/abilityModel'
import type { MessageRef } from '../../types'
import type { EvaluatePlacementFitInput } from '../placementFitTypes'
import { STACK_COUNT_RESOLVERS } from './stackCountResolver'

function invertEffectMultiplier(multiplier: number): number | null {
  if (!Number.isFinite(multiplier) || multiplier <= 0) {
    return null
  }

  return (multiplier - 1) * 100
}

function percentToMultiplier(percent: number): number {
  return 1 + (percent / 100)
}

/**
 * 动态层数假设默认值（manualStackCount 缺省时用）。1000 ≈ area=100 冒险的出言不逊上限（0.33%/层）。
 * 仅贴合低 value/层的 dynamic-stack-multiply signal（如出言不逊）；高 value（>103%）signal 在 1000 层下
 * 溢出 → 降级 warning 不计入目标值（见 resolveSignalMultiplier 溢出分支）。中 value（10–103%）signal 会得大但有限的乘数，
 * 属全局单值假设的已知近似（不同 signal 层数源差异大，精确化依赖 per-signal 层数表达式解析，见 095-vi.md）。
 * UI 可手动覆盖（评估页/计划页）；见 champion-reference-verification.md。
 */
export const DEFAULT_MANUAL_STACK_COUNT = 1000

/**
 * 机制: dynamic-stack-multiply（stacksMultiply=true + 无 stackFunc；如蔚出言不逊 manual_stacking）
 * 层数来自数值表达式（当前 unsupported），用 manualStackCount 提供假设值（默认 1000）。
 * 须排除「有 stackFunc」的信号——它们的层数源是 stackFunc（per_tagged/per_crusader/per_mithral_hall_stacks
 * 等），非 area-based manual 层数。旧实现无条件短路致这类信号（如 hero32 buff_upgrade,100,11503
 * stackFunc=per_mithral_hall_stacks）被 (1+value/100)^1000 灾难高估（2^1000≈10^301）；改走 stackFunc
 * 路径后，注册的 stackFunc 按真实阵型计数、未注册的（per_mithral_hall_stacks）安全不计入目标值。
 */
function resolveStacksMultiplySignal(
  input: EvaluatePlacementFitInput,
  signal: HeroAbilitySignal,
): { ok: true; multiplier: number } | { ok: false; warning: MessageRef } | null {
  if (signal.stacksMultiply !== true || (signal.stackFunc != null && signal.stackFunc !== '')) {
    return null
  }
  const stackCount = input.manualStackCount ?? DEFAULT_MANUAL_STACK_COUNT
  const mult = percentToMultiplier(signal.value) ** stackCount
  if (!Number.isFinite(mult)) {
    return { ok: false, warning: { key: '{p0} 乘算堆叠溢出，当前不计入目标值。', params: { p0: signal.rawEffect } } }
  }
  // bonus-scale-linkage：联动 signal 只在基础 signal 可计入目标值时生效（依赖检查，不卷入数值）。
  // multiplier>1 守护与 applySignalPercent 对称——基础 0 层（value^0=1，如善良榜样无 good 英雄）
  // 时联动 signal 不生效（基础无效应不放大），防 future 英雄 stacksMultiply+bonusScaleOfSignal 触发。
  if (signal.bonusScaleOfSignal) {
    const dep = resolveSignalMultiplier(input, signal.bonusScaleOfSignal)
    if (!dep.ok || dep.multiplier <= 1) {
      return { ok: false, warning: { key: '{p0} 依赖的基础增益当前未生效，当前不计入目标值。', params: { p0: signal.rawEffect } } }
    }
  }
  return { ok: true, multiplier: mult }
}

// 机制: buff-upgrade-modifier（折算基础 buff 幅度）+ bonus-scale-linkage（bonusScaleOfSignal 联动）
function applySignalPercentToMultiplier(
  input: EvaluatePlacementFitInput,
  signal: HeroAbilitySignal,
  resolvedPercent: number,
): { ok: true; multiplier: number } | { ok: false; warning: MessageRef } {
  if (!signal.bonusScaleOfSignal) {
    return { ok: true, multiplier: percentToMultiplier(resolvedPercent) }
  }

  const baseMultiplierResult = resolveSignalMultiplier(input, signal.bonusScaleOfSignal)
  // 依赖基础须可解析且当前生效（multiplier>1）。multiplier<=1 覆盖叠层基数 0 层（value^0=1）
  // 与 value<=0 基础——此时修饰不应贡献（避免无层数时修饰仍加成）。
  if (!baseMultiplierResult.ok || baseMultiplierResult.multiplier <= 1) {
    return {
      ok: false,
      warning: { key: '{p0} 依赖的基础增益当前未生效，当前不计入目标值。', params: { p0: signal.rawEffect } },
    }
  }

  // buff_upgrade 修饰按基础 effect 的 per-stack 百分比（base.value）折算，非聚合倍率——
  // 叠层基数（如蔚善良榜样 4^N）若用 invertEffectMultiplier(聚合倍率) 会得到 (4^N-1)*100 巨数，
  // 使 +100% 修饰被算成 ×4^N（灾难高估）。非叠层基数下 base.value 与旧 invertEffectMultiplier(resolved) 等价。
  const basePercent = signal.bonusScaleOfSignal.value
  return { ok: true, multiplier: percentToMultiplier((basePercent * resolvedPercent) / 100) }
}

/**
 * signal → 乘数。字段分支分发（applyManually / stacksMultiply / !stackFunc / stackFunc+add / stackFunc+mult）。
 *
 * 机制规模未触发 >10 注册表升级线（见 dps-mechanic-abstraction.md 阈值 4），保持字段分支分发，
 * 不引入策略注册表（当前规模属过度工程）。分支注释标机制 id（三处一致守护）。
 */

function resolveMultStackSignal(
  input: EvaluatePlacementFitInput,
  signal: HeroAbilitySignal,
  count: number,
): { ok: true; multiplier: number } | { ok: false; warning: MessageRef } {
  const multiplier = percentToMultiplier(signal.value) ** count
  const percent = invertEffectMultiplier(multiplier)
  if (percent === null) {
    return {
      ok: false,
      warning: { key: '{p0} 的乘算堆叠结果非法，当前不计入目标值。', params: { p0: signal.rawEffect } },
    }
  }
  return applySignalPercentToMultiplier(input, signal, percent)
}

export function resolveSignalMultiplier(
  input: EvaluatePlacementFitInput,
  signal: HeroAbilitySignal,
): { ok: true; multiplier: number } | { ok: false; warning: MessageRef } {
  if (signal.applyManually === true) {
    return {
      ok: false,
      warning: { key: '{p0} 依赖手动触发或专精选择，当前不计入目标值。', params: { p0: signal.rawEffect } },
    }
  }

  const stacksResult = resolveStacksMultiplySignal(input, signal)
  if (stacksResult !== null) {
    return stacksResult
  }

  const stackFunc = signal.stackFunc ?? null

  if (stackFunc == null || stackFunc === '') {
    return applySignalPercentToMultiplier(input, signal, signal.value)
  }

  const resolver = STACK_COUNT_RESOLVERS[stackFunc]
  if (!resolver) {
    return {
      ok: false,
      warning: { key: '{p0} 的叠层方式({p1} / {p2}) 尚未稳定解析，当前不计入目标值。', params: { p0: signal.rawEffect, p1: signal.amountFunc ?? 'null', p2: stackFunc } },
    }
  }

  const count = resolver.count(input, signal)
  if (count === null) {
    return {
      ok: false,
      warning: { key: '{p0} 需要{p1}上下文，当前不计入目标值。', params: { p0: signal.rawEffect, p1: 'key' in resolver.contextLabel ? resolver.contextLabel.key : resolver.contextLabel.literal } },
    }
  }

  const amountFunc = signal.amountFunc ?? null
  if (amountFunc === 'add') {
    return applySignalPercentToMultiplier(input, signal, signal.value * count)
  }

  if (amountFunc === 'mult') {
    return resolveMultStackSignal(input, signal, count)
  }

  return {
    ok: false,
    warning: { key: '{p0} 的叠层方式({p1} / {p2}) 尚未稳定解析，当前不计入目标值。', params: { p0: signal.rawEffect, p1: String(amountFunc), p2: stackFunc } },
  }
}
