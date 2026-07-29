import type {
  BlessingCatalogEntry,
  ImportedFormationSave,
  OwnedHero,
  OwnedHeroLegendarySlot,
  OwnedHeroLootSlot,
  UserProfileSnapshot,
} from '../../domain/user-profile/types'
import type { ScenarioRef } from '../../domain/types/formation'
import {
  asRecord,
  isRecord,
  isTruthyFlag,
  normalizeIdArray,
  normalizeNumberRecord,
  normalizeObjectArray,
  normalizeStringArrayRecord,
  normalizeStringRecord,
  toNumberValue,
  toStringValue,
} from './userProfilePayloadHelpers'

interface UserDetailsPayload {
  user_id?: string | number
  heroes?: unknown
  defines?: {
    reset_upgrade_defines?: unknown
  }
  details?: {
    instance_id?: string | number
    heroes?: unknown
    loot?: unknown
    patron_perks?: unknown
    reset_upgrade_levels?: unknown
    legendary_details?: {
      legendary_items?: unknown
    }
    legendary_level_cap?: unknown
  }
}

interface CampaignPayload {
  campaign_id?: string | number
  favor?: string | number
  blessings?: unknown
}

interface CampaignDetailsPayload {
  campaigns?: unknown
}

type ScenarioKind = 'campaign' | 'adventure' | 'variant' | 'trial' | 'timeGate'

interface FormationSavePayload {
  formation_id?: string | number
  id?: string | number
  layout_id?: string | number
  campaign_id?: string | number
  adventure_id?: string | number
  variant_id?: string | number
  scenario?: { kind?: string; id?: string | number }
  placements?: unknown
  formation?: unknown
  specializations?: unknown
  feats?: unknown
  familiars?: unknown
  is_favorite?: unknown
}

interface FormationSavesPayload {
  formations?: unknown
  all_saves?: unknown
}

export interface NormalizedUserDetails {
  ownedHeroes: OwnedHero[]
  patronPerks: Record<string, number>
  blessings: {
    catalog: BlessingCatalogEntry[]
    levels: Record<string, number>
  }
  warnings: string[]
}

export interface NormalizedCampaignDetails {
  campaigns: Array<{
    campaignId: string
    favor: string
    blessings: Record<string, number>
  }>
  warnings: string[]
}

export interface NormalizedFormationSaves {
  formations: ImportedFormationSave[]
  warnings: string[]
}

export interface BuildUserProfileSnapshotInput {
  userDetails: unknown
  campaignDetails: unknown
  formationSaves: unknown
  updatedAt?: string
}

function normalizePatronPerks(value: unknown): Record<string, number> {
  const result: Record<string, number> = {}
  for (const perk of normalizeObjectArray(value)) {
    const id = toStringValue(perk.patron_perk_id)
    if (id) {
      result[id] = toNumberValue(perk.level)
    }
  }
  return result
}

/**
 * 提取 blessing 定义 catalog（来自 userDetails.defines.reset_upgrade_defines）。
 * 保留全部 effects（global_dps 供 globalBuff 计算，effect_def 供后续 tag 限定展开）；
 * id 缺失的条目跳过；无 effects → 空数组（currencyId/type 仍保留）。
 */
function normalizeBlessingCatalog(value: unknown): BlessingCatalogEntry[] {
  const result: BlessingCatalogEntry[] = []
  for (const item of normalizeObjectArray(value)) {
    const id = toStringValue(item.id)
    if (!id) {
      continue
    }
    const effects = normalizeObjectArray(item.effects).map((effect) => ({
      effectString: toStringValue(effect.effect_string),
      perLevel: toNumberValue(effect.per_level),
    }))
    result.push({
      id,
      type: toNumberValue(item.type),
      currencyId: toNumberValue(item.reset_currency_id),
      effects,
    })
  }
  return result
}

function normalizeLootByHeroId(value: unknown): Map<string, Record<string, OwnedHeroLootSlot>> {
  const lootEntries = normalizeObjectArray(value)
  const lootByHeroId = new Map<string, Record<string, OwnedHeroLootSlot>>()

  for (const item of lootEntries) {
    const heroId = toStringValue(item.hero_id)
    const slotId = toStringValue(item.slot_id)
    const slots = lootByHeroId.get(heroId) ?? {}

    slots[slotId] = {
      slotId,
      rarity: toNumberValue(item.rarity),
      gild: toNumberValue(item.gild),
      enchant: toNumberValue(item.enchant),
      pigment: toNumberValue(item.pigment),
      found: normalizeNumberRecord(item.found),
    }

    lootByHeroId.set(heroId, slots)
  }

  return lootByHeroId
}

function normalizeLegendaryByHeroId(value: unknown): Map<string, Record<string, OwnedHeroLegendarySlot>> {
  const legendaryByHeroId = new Map<string, Record<string, OwnedHeroLegendarySlot>>()

  if (!isRecord(value)) {
    return legendaryByHeroId
  }

  for (const [heroId, slotsValue] of Object.entries(value)) {
    if (!isRecord(slotsValue)) {
      continue
    }

    const slots: Record<string, OwnedHeroLegendarySlot> = {}

    for (const [slotId, slotValue] of Object.entries(slotsValue)) {
      if (!isRecord(slotValue)) {
        continue
      }

      slots[slotId] = {
        slotId,
        level: toNumberValue(slotValue.level),
        effectId: slotValue.effect_id === null || slotValue.effect_id === undefined || slotValue.effect_id === ''
          ? null
          : toStringValue(slotValue.effect_id),
        effectIds: normalizeIdArray(slotValue.effects_unlocked),
        resetCurrencyId:
          slotValue.reset_currency_id === null
          || slotValue.reset_currency_id === undefined
          || slotValue.reset_currency_id === ''
            ? null
            : toStringValue(slotValue.reset_currency_id),
        upgradeCost: toNumberValue(slotValue.upgrade_cost),
      }
    }

    legendaryByHeroId.set(heroId, slots)
  }

  return legendaryByHeroId
}

function isScenarioKind(value: unknown): value is ScenarioKind {
  return (
    value === 'campaign' ||
    value === 'adventure' ||
    value === 'variant' ||
    value === 'trial' ||
    value === 'timeGate'
  )
}

function normalizeScenarioRef(save: FormationSavePayload, warnings: string[]): ScenarioRef {
  if (save.scenario && isScenarioKind(save.scenario.kind)) {
    return {
      kind: save.scenario.kind,
      id: toStringValue(save.scenario.id, '0'),
    }
  }

  if (save.variant_id !== null && save.variant_id !== undefined && save.variant_id !== '') {
    return { kind: 'variant', id: String(save.variant_id) }
  }

  if (save.adventure_id !== null && save.adventure_id !== undefined && save.adventure_id !== '') {
    return { kind: 'adventure', id: String(save.adventure_id) }
  }

  if (save.campaign_id !== null && save.campaign_id !== undefined && save.campaign_id !== '') {
    return { kind: 'campaign', id: String(save.campaign_id) }
  }

  warnings.push(`formation ${toStringValue(save.formation_id ?? save.id)} missing scenario reference`)
  return { kind: 'adventure', id: '0' }
}

export function normalizeUserDetails(payload: UserDetailsPayload): NormalizedUserDetails {
  const warnings: string[] = []
  const heroesValue = payload.details?.heroes ?? payload.heroes
  const heroes = normalizeObjectArray(heroesValue)
  const lootByHeroId = normalizeLootByHeroId(payload.details?.loot)
  const patronPerks = normalizePatronPerks(payload.details?.patron_perks)
  const blessingLevels = normalizeNumberRecord(payload.details?.reset_upgrade_levels)
  const blessingCatalog = normalizeBlessingCatalog(payload.defines?.reset_upgrade_defines)
  const legendaryByHeroId = normalizeLegendaryByHeroId(payload.details?.legendary_details?.legendary_items)

  if (!Array.isArray(heroesValue) && !isRecord(heroesValue)) {
    warnings.push('getuserdetails payload missing heroes array')
  }

  const ownedHeroes: OwnedHero[] = heroes
    .map((hero) => {
      const heroId = toStringValue(hero.hero_id ?? hero.id)
      const lootBySlot = lootByHeroId.get(heroId) ?? {}
      const equipmentFromLoot = Object.fromEntries(
        Object.values(lootBySlot).map((slot) => [slot.slotId, slot.enchant]),
      )

      return {
        heroId,
        level: toNumberValue(hero.level),
        equipment: Object.keys(equipmentFromLoot).length > 0
          ? equipmentFromLoot
          : normalizeNumberRecord(hero.equipment),
        feats: normalizeIdArray(hero.feats),
        legendaryEffects: normalizeIdArray(hero.legendary_effects),
        unlockedFeats: normalizeIdArray(hero.unlocked_feats),
        activeFeats: normalizeIdArray(hero.active_feats),
        featSlots: toNumberValue(hero.feat_slots),
        isOwned: isTruthyFlag(hero.owned, true),
        gildableSlotId:
          hero.gildable_slot_id === null || hero.gildable_slot_id === undefined || hero.gildable_slot_id === ''
            ? null
            : toStringValue(hero.gildable_slot_id),
        lootBySlot,
        legendaryBySlot: legendaryByHeroId.get(heroId) ?? {},
      }
    })
    .filter((hero) => hero.isOwned)

  return { ownedHeroes, patronPerks, blessings: { catalog: blessingCatalog, levels: blessingLevels }, warnings }
}

export function normalizeCampaignDetails(
  payload: CampaignDetailsPayload,
): NormalizedCampaignDetails {
  const warnings: string[] = []
  const campaignsValue = payload.campaigns
  const campaigns = normalizeObjectArray(campaignsValue)

  if (!Array.isArray(campaignsValue) && !isRecord(campaignsValue)) {
    warnings.push('getcampaigndetails payload missing campaigns array')
  }

  const result = campaigns.map((campaign) => {
    const c = campaign as CampaignPayload
    return {
      campaignId: toStringValue(c.campaign_id),
      favor: toStringValue(c.favor, '0'),
      blessings: normalizeNumberRecord(c.blessings),
    }
  })

  return { campaigns: result, warnings }
}

export function normalizeFormationSaves(
  payload: FormationSavesPayload,
): NormalizedFormationSaves {
  const warnings: string[] = []
  const formationsValue = payload.formations ?? payload.all_saves
  const formations = normalizeObjectArray(formationsValue)

  if (!Array.isArray(formationsValue) && !isRecord(formationsValue)) {
    warnings.push('getallformationsaves payload missing formations array')
  }

  const result: ImportedFormationSave[] = formations.map((item) => {
    const save = item as FormationSavePayload
    return {
      formationId: toStringValue(save.formation_id ?? save.id),
      layoutId: toStringValue(save.layout_id),
      scenarioRef: normalizeScenarioRef(save, warnings),
      placements: normalizeStringRecord(save.placements ?? save.formation),
      specializations: normalizeStringRecord(save.specializations),
      feats: normalizeStringArrayRecord(save.feats),
      familiars: normalizeStringRecord(save.familiars),
      isFavorite: save.is_favorite === true || save.is_favorite === 1 || save.is_favorite === '1',
    }
  })

  return { formations: result, warnings }
}

export function buildUserProfileSnapshot(input: BuildUserProfileSnapshotInput): UserProfileSnapshot {
  const userDetailsPayload = asRecord(input.userDetails) as UserDetailsPayload
  const userDetails = normalizeUserDetails(userDetailsPayload)
  const campaignDetails = normalizeCampaignDetails(asRecord(input.campaignDetails))
  const formationSaves = normalizeFormationSaves(asRecord(input.formationSaves))
  const campaignWarnings = campaignDetails.campaigns.length > 0
    ? [`campaign details imported: ${campaignDetails.campaigns.length}`]
    : []

  return {
    schemaVersion: 1,
    ownedHeroes: userDetails.ownedHeroes,
    importedFormationSaves: formationSaves.formations,
    campaigns: campaignDetails.campaigns,
    patronPerks: userDetails.patronPerks,
    blessings: userDetails.blessings,
    updatedAt: input.updatedAt ?? new Date().toISOString(),
    legendaryLevelCap: toNumberValue(userDetailsPayload.details?.legendary_level_cap, 20),
    warnings: [
      ...userDetails.warnings,
      ...campaignDetails.warnings,
      ...formationSaves.warnings,
      ...campaignWarnings,
    ],
  }
}
