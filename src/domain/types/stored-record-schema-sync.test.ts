import { describe, expect, it } from 'vitest'

import type { OwnedHero, UserProfileSnapshot } from '../user-profile/types'
import type { HeroAbilityOverridePatch } from '../abilities/abilityModel'
import type {
  formationDraftSchema,
  formationPresetSchema,
  heroAbilityOverridePatchSchema,
  ownedHeroItemSchema,
  userProfileSnapshotSchema,
} from './stored-record-schemas'
import type { FormationDraft, FormationPreset } from './formation'

/**
 * stored-record schema 钉死字段 ⊆ 消费 interface（passthrough 双源防漂移）。
 * 与 collectionSchemaSync.test.ts / build-product-schema-sync.test.ts 同模式：passthrough schema
 * 只钉核心字段，消费 interface 是完整类型；守护「schema 钉死字段（.shape keys）⊆ interface 字段」，
 * schema 一旦新钉字段而 interface 漏跟，typecheck 即失败。运行时 _guard 恒 true，守护在类型层。
 */
describe('stored-record schema 钉死字段 ⊆ 消费 interface（passthrough 双源防漂移）', () => {
  it('userProfileSnapshotSchema 钉死字段 ⊆ UserProfileSnapshot', () => {
    const _guard: Exclude<keyof typeof userProfileSnapshotSchema.shape, keyof UserProfileSnapshot> extends never
      ? true
      : never = true
    expect(_guard).toBe(true)
  })

  it('ownedHeroItemSchema 钉死字段 ⊆ OwnedHero', () => {
    const _guard: Exclude<keyof typeof ownedHeroItemSchema.shape, keyof OwnedHero> extends never ? true : never = true
    expect(_guard).toBe(true)
  })

  it('formationDraftSchema 钉死字段 ⊆ FormationDraft', () => {
    const _guard: Exclude<keyof typeof formationDraftSchema.shape, keyof FormationDraft> extends never ? true : never = true
    expect(_guard).toBe(true)
  })

  it('formationPresetSchema 钉死字段 ⊆ FormationPreset', () => {
    const _guard: Exclude<keyof typeof formationPresetSchema.shape, keyof FormationPreset> extends never ? true : never = true
    expect(_guard).toBe(true)
  })

  it('heroAbilityOverridePatchSchema 钉死字段 ⊆ HeroAbilityOverridePatch', () => {
    const _guard: Exclude<keyof typeof heroAbilityOverridePatchSchema.shape, keyof HeroAbilityOverridePatch> extends never
      ? true
      : never = true
    expect(_guard).toBe(true)
  })
})
