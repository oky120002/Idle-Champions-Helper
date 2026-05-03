import type { ImportedFormationSave, OwnedHero, UserProfileSnapshot } from '../../domain/user-profile/types'
import type { ScenarioRef } from '../../domain/types/formation'

type JsonRecord = Record<string, unknown>

interface UserDetailsPayload {
  user_id?: string | number
  heroes?: unknown
  details?: {
    instance_id?: string | number
    heroes?: unknown
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

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function asRecord(value: unknown): JsonRecord {
  return isRecord(value) ? value : {}
}

function toStringValue(value: unknown, fallback = 'unknown'): string {
  if (value === null || value === undefined || value === '') {
    return fallback
  }
  return String(value)
}

function toNumberValue(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }
  if (typeof value === 'string') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : fallback
  }
  return fallback
}

function normalizeNumberRecord(value: unknown): Record<string, number> {
  if (!isRecord(value)) {
    return {}
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [key, toNumberValue(item)]),
  )
}

function normalizeStringRecord(value: unknown): Record<string, string> {
  if (!isRecord(value)) {
    return {}
  }

  return Object.fromEntries(
    Object.entries(value)
      .filter(([, item]) => item !== null && item !== undefined && item !== '')
      .map(([key, item]) => [key, String(item)]),
  )
}

function normalizeStringArrayRecord(value: unknown): Record<string, string[]> {
  if (!isRecord(value)) {
    return {}
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [
      key,
      Array.isArray(item)
        ? item.map((entry) => String(entry))
        : item === null || item === undefined || item === ''
          ? []
          : [String(item)],
    ]),
  )
}

function normalizeObjectArray(value: unknown): JsonRecord[] {
  if (Array.isArray(value)) {
    return value.filter(isRecord)
  }

  if (isRecord(value)) {
    return Object.values(value).filter(isRecord)
  }

  return []
}

function normalizeIdArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .map((item) => {
      if (isRecord(item)) {
        return item.id
      }
      return item
    })
    .filter((item) => item !== null && item !== undefined && item !== '')
    .map((item) => String(item))
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

  if (!Array.isArray(heroesValue) && !isRecord(heroesValue)) {
    warnings.push('getuserdetails payload missing heroes array')
  }

  const ownedHeroes: OwnedHero[] = heroes.map((hero) => ({
    heroId: toStringValue(hero.hero_id ?? hero.id),
    level: toNumberValue(hero.level),
    equipment: normalizeNumberRecord(hero.equipment),
    feats: normalizeIdArray(hero.feats),
    legendaryEffects: normalizeIdArray(hero.legendary_effects),
  }))

  return { ownedHeroes, warnings }
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
  const userDetails = normalizeUserDetails(asRecord(input.userDetails) as UserDetailsPayload)
  const campaignDetails = normalizeCampaignDetails(asRecord(input.campaignDetails) as CampaignDetailsPayload)
  const formationSaves = normalizeFormationSaves(asRecord(input.formationSaves) as FormationSavesPayload)
  const campaignWarnings = campaignDetails.campaigns.length > 0
    ? [`campaign details imported: ${campaignDetails.campaigns.length}`]
    : []

  return {
    schemaVersion: 1,
    ownedHeroes: userDetails.ownedHeroes,
    importedFormationSaves: formationSaves.formations,
    updatedAt: input.updatedAt ?? new Date().toISOString(),
    warnings: [
      ...userDetails.warnings,
      ...campaignDetails.warnings,
      ...formationSaves.warnings,
      ...campaignWarnings,
    ],
  }
}
