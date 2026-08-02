import { describe, expect, it } from 'vitest'
import { parseHeroPredicate } from '../../abilities/heroPredicate'
import { resolveSignalMultiplier, DEFAULT_MANUAL_STACK_COUNT } from './signalMultiplier'
import { buildSignal, buildInput, createHero } from './mechanicTestFixtures'

const baseInput = { carryHero: createHero('carry'), supportHero: createHero('support') }

describe('resolveSignalMultiplier · applyManually 守卫', () => {
  it('applyManually signal → 不计分 warning', () => {
    const r = resolveSignalMultiplier(buildInput(baseInput), buildSignal({ value: 100, applyManually: true }))
    expect(r.ok).toBe(false)
  })
})

describe('resolveSignalMultiplier · plain-percent（无 stackFunc）', () => {
  it('value=100 → percentToMultiplier(100) = 2', () => {
    const r = resolveSignalMultiplier(buildInput(baseInput), buildSignal({ value: 100 }))
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.multiplier).toBe(2)
  })

  it('value=0 → 1（边界）', () => {
    const r = resolveSignalMultiplier(buildInput(baseInput), buildSignal({ value: 0 }))
    expect(r.ok && r.multiplier).toBe(1)
  })
})

describe('resolveSignalMultiplier · dynamic-stack-multiply', () => {
  it('stacksMultiply + manualStackCount → percentToMultiplier(value)^count', () => {
    // value=100 → per-stack 2；count=3 → 2^3 = 8
    const r = resolveSignalMultiplier(
      buildInput({ ...baseInput, manualStackCount: 3 }),
      buildSignal({ value: 100, stacksMultiply: true }),
    )
    expect(r.ok && r.multiplier).toBe(8)
  })

  it('manualStackCount 缺省 → DEFAULT_MANUAL_STACK_COUNT(1000)', () => {
    expect(DEFAULT_MANUAL_STACK_COUNT).toBe(1000)
    // value=0.33 per-stack → (1.0033)^1000 有限且 > 1
    const r = resolveSignalMultiplier(buildInput(baseInput), buildSignal({ value: 0.33, stacksMultiply: true }))
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.multiplier).toBeGreaterThan(1)
  })

  it('高 value 在大 count 下溢出 → 不计分 warning', () => {
    // value=200 → per-stack 3；3^1000 = Infinity
    const r = resolveSignalMultiplier(buildInput(baseInput), buildSignal({ value: 200, stacksMultiply: true }))
    expect(r.ok).toBe(false)
  })

  it('bonusScaleOfSignal 基础未生效（multiplier<=1）→ 联动不计分', () => {
    const base = buildSignal({ value: 100, stacksMultiply: true })
    // count=0 → 2^0 = 1 (<=1) → 联动 warning
    const r = resolveSignalMultiplier(
      buildInput({ ...baseInput, manualStackCount: 0 }),
      buildSignal({ value: 100, stacksMultiply: true, bonusScaleOfSignal: base }),
    )
    expect(r.ok).toBe(false)
  })

  it('【stacksMultiply + stackFunc】不短路 manualStackCount，改走 stackFunc 计数路径', () => {
    // hero32 真实回归：buff_upgrade,100,11503 stacksMultiply=true + stackFunc=per_mithral_hall_stacks。
    // 旧实现 stacksMultiply 分支无条件短路 → (1+100/100)^1000 = 2^1000≈10^301 灾难高估。
    // 现 stacksMultiply 分支排除有 stackFunc 的信号 → 落 stackFunc 路径，未注册 → 不计分（安全）。
    const r = resolveSignalMultiplier(
      buildInput({ ...baseInput, manualStackCount: 1000 }),
      buildSignal({ value: 100, stacksMultiply: true, stackFunc: 'per_mithral_hall_stacks', amountFunc: 'mult' }),
    )
    expect(r.ok).toBe(false) // per_mithral_hall_stacks 未注册 → 不计分（非 2^1000 灾难高估）
  })

  it('【stacksMultiply + 注册 stackFunc】按 stackFunc 真实阵型计数（非 manualStackCount）', () => {
    // stacksMultiply + per_crusader（注册）：count=阵型 qualifying 英雄数，非 manualStackCount(1000)。
    // 旧 stacksMultiply 短路会给 (1+100/100)^1000 = 2^1000 灾难；现走 stackFunc 路径，2 英雄 → count=2 → 2^2=4。
    const carryHero = createHero('carry')
    const supportHero = createHero('support')
    const r = resolveSignalMultiplier(
      buildInput({
        carryHero,
        supportHero,
        placements: { s1: 'carry', s2: 'support' },
        heroesById: new Map([
          ['carry', carryHero],
          ['support', supportHero],
        ]),
        manualStackCount: 1000,
      }),
      buildSignal({ value: 100, stacksMultiply: true, stackFunc: 'per_crusader', amountFunc: 'mult' }),
    )
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.multiplier).toBe(4) // 2 英雄 → 2^2 = 4（非 2^1000）
  })
})

describe('resolveSignalMultiplier · bonusScaleOfSignal 折叠（22× 高估回归）', () => {
  it('修饰按基础 per-stack 百分比（base.value）折算，非聚合倍率', () => {
    // base = stacksMultiply value=100 count=2 → 聚合 mult 4，但 per-stack base.value=100。
    // 修饰 value=100 → (base.value × 100)/100 = 100 → mult 2。
    // 旧 bug 用 invertEffectMultiplier(聚合 4)=300 → mult 4（叠层基数 4^N 时灾难高估）。
    const base = buildSignal({ value: 100, stacksMultiply: true })
    const r = resolveSignalMultiplier(
      buildInput({ ...baseInput, manualStackCount: 2 }),
      buildSignal({ value: 100, bonusScaleOfSignal: base }),
    )
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.multiplier).toBe(2) // 非 4
  })

  it('基础 multiplier<=1（value=0）→ 修饰不计分（依赖未生效）', () => {
    const base = buildSignal({ value: 0 })
    const r = resolveSignalMultiplier(buildInput(baseInput), buildSignal({ value: 100, bonusScaleOfSignal: base }))
    expect(r.ok).toBe(false)
  })

  it('基础不可解析（applyManually）→ 修饰不计分', () => {
    const base = buildSignal({ value: 100, applyManually: true })
    const r = resolveSignalMultiplier(buildInput(baseInput), buildSignal({ value: 100, bonusScaleOfSignal: base }))
    expect(r.ok).toBe(false)
  })
})

describe('resolveSignalMultiplier · formation-count（amountFunc add/mult 等价类）', () => {
  // 两名 female 英雄入阵（含 support），per_crusader 计数匹配 formationCountQualifier 的英雄。
  const femalePredicate = parseHeroPredicate('female', 'shorthand')!
  const support = createHero('support', { tags: ['female'] })
  const other = createHero('other', { tags: ['female'] })
  const formationInput = buildInput({
    carryHero: createHero('carry'),
    supportHero: support,
    placements: { s1: 'support', s3: 'other' },
    heroesById: new Map([
      ['carry', createHero('carry')],
      ['support', support],
      ['other', other],
    ]),
  })

  it('amountFunc=add → value × count：value=100 count=2 → applySignalPercent(200) = 3', () => {
    const r = resolveSignalMultiplier(
      formationInput,
      buildSignal({ value: 100, stackFunc: 'per_crusader', amountFunc: 'add', formationCountQualifier: { predicate: femalePredicate } }),
    )
    expect(r.ok && r.multiplier).toBe(3)
  })

  it('amountFunc=mult → value^count 后反聚：value=100 count=2 → mult 4', () => {
    // percentToMultiplier(100)^2 = 4；invert = 300；applySignalPercent(300) = 4
    const r = resolveSignalMultiplier(
      formationInput,
      buildSignal({ value: 100, stackFunc: 'per_crusader', amountFunc: 'mult', formationCountQualifier: { predicate: femalePredicate } }),
    )
    expect(r.ok && r.multiplier).toBe(4)
  })

  it('未知 stackFunc → 不计分 warning', () => {
    const r = resolveSignalMultiplier(
      formationInput,
      buildSignal({ value: 100, stackFunc: 'unknown_func', amountFunc: 'add' }),
    )
    expect(r.ok).toBe(false)
  })

  it('stackFunc + 未知 amountFunc → 不计分 warning', () => {
    const r = resolveSignalMultiplier(
      formationInput,
      buildSignal({ value: 100, stackFunc: 'per_crusader', amountFunc: null }),
    )
    expect(r.ok).toBe(false)
  })
})
