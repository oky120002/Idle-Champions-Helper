import { describe, expect, it } from 'vitest'

import type { HeroAbilityProfile } from '../abilities/abilityModel'
import type { OfficialPlannerScenarioModel } from '../planner/plannerModel'
import type { LootCatalogEntry } from '../buffs/equipmentMult'
import type { EffectDefinitionEntry } from '../buffs/effectDefinitionDps'
import type { FeatEntry } from '../abilities/featSignals'
import type { SpecializationEntry } from '../abilities/specializationSignals'
import type {
  effectDefinitionItemSchema,
  featCatalogItemSchema,
  heroAbilityProfileItemSchema,
  lootCatalogItemSchema,
  plannerScenarioItemSchema,
  specializationCatalogItemSchema,
} from './build-product-schemas'

/**
 * build-product schema 钉死字段 ⊆ 消费 interface（passthrough 双源防漂移）。
 * 与 collectionSchemaSync.test.ts 同模式：passthrough schema 只钉核心字段，消费 interface 是完整类型；
 * 守护钉死「schema 钉死字段（.shape keys）⊆ interface 字段」——schema 一旦新钉字段而 interface 漏跟，
 * 消费方按 interface 访问不到 schema 保证的字段，typecheck 即失败。运行时 _guard 恒 true，守护在类型层。
 */
describe('build-product schema 钉死字段 ⊆ 消费 interface（passthrough 双源防漂移）', () => {
  it('heroAbilityProfileItemSchema 钉死字段 ⊆ HeroAbilityProfile', () => {
    const _guard: Exclude<keyof typeof heroAbilityProfileItemSchema.shape, keyof HeroAbilityProfile> extends never
      ? true
      : never = true
    expect(_guard).toBe(true)
  })

  it('plannerScenarioItemSchema 钉死字段 ⊆ OfficialPlannerScenarioModel', () => {
    const _guard: Exclude<keyof typeof plannerScenarioItemSchema.shape, keyof OfficialPlannerScenarioModel> extends never
      ? true
      : never = true
    expect(_guard).toBe(true)
  })

  it('lootCatalogItemSchema 钉死字段 ⊆ LootCatalogEntry', () => {
    const _guard: Exclude<keyof typeof lootCatalogItemSchema.shape, keyof LootCatalogEntry> extends never
      ? true
      : never = true
    expect(_guard).toBe(true)
  })

  it('effectDefinitionItemSchema 钉死字段 ⊆ EffectDefinitionEntry', () => {
    const _guard: Exclude<keyof typeof effectDefinitionItemSchema.shape, keyof EffectDefinitionEntry> extends never
      ? true
      : never = true
    expect(_guard).toBe(true)
  })

  it('featCatalogItemSchema 钉死字段 ⊆ FeatEntry', () => {
    const _guard: Exclude<keyof typeof featCatalogItemSchema.shape, keyof FeatEntry> extends never
      ? true
      : never = true
    expect(_guard).toBe(true)
  })

  it('specializationCatalogItemSchema 钉死字段 ⊆ SpecializationEntry', () => {
    const _guard: Exclude<keyof typeof specializationCatalogItemSchema.shape, keyof SpecializationEntry> extends never
      ? true
      : never = true
    expect(_guard).toBe(true)
  })
})
