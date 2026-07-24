import { describe, expect, it } from 'vitest'

import type { championSchema, patronSchema, variantSchema } from './collection-schemas'
import type { Champion } from './champions'
import type { Patron, Variant } from './formation'

/**
 * passthrough 双源防漂移守护。
 *
 * collection-schemas.ts 是 normalize 输出契约（passthrough 只钉消费方核心字段、放行其余），
 * 前端 interface 是完整消费类型。两者目的不同：passthrough gap（Champion patronEligibility、
 * Patron eligibilityRules）与 Variant normalize 派生字段（enemyCount/attackMix/forcedHeroIds 等）
 * 注定不能 z.infer 单源（见 atd_bd064fc8e2）。Adventure/PatronObjectiveTier 字段完全对齐已 z.infer。
 *
 * 守护钉死「schema 钉死字段（.shape keys）⊆ interface 字段」：schema 一旦新钉字段而 interface
 * 漏跟，消费方按 interface 类型访问不到 schema 保证的字段——typecheck（test:run 先 tsc -b）即失败。
 * 用 .shape 而非 z.infer：passthrough 的 z.infer 带 [k:string]:unknown index，keyof 退化为 string。
 * 运行时 _guard 恒 true，守护在类型层。
 */
describe('collection schema 钉死字段 ⊆ 前端 interface（passthrough 双源防漂移）', () => {
  it('championSchema 钉死字段 ⊆ Champion', () => {
    const _guard: Exclude<keyof typeof championSchema.shape, keyof Champion> extends never
      ? true
      : never = true
    expect(_guard).toBe(true)
  })

  it('patronSchema 钉死字段 ⊆ Patron', () => {
    const _guard: Exclude<keyof typeof patronSchema.shape, keyof Patron> extends never
      ? true
      : never = true
    expect(_guard).toBe(true)
  })

  it('variantSchema 钉死字段 ⊆ Variant', () => {
    const _guard: Exclude<keyof typeof variantSchema.shape, keyof Variant> extends never
      ? true
      : never = true
    expect(_guard).toBe(true)
  })
})
