import type { OwnedHero, ImportedFormationSave } from '../../domain/user-profile/types'
import type { ScenarioRef } from '../../domain/types/formation'

interface UserDetailsPayload {
  user_id?: string
  heroes?: Array<{
    hero_id: string
    level?: number
    equipment?: Record<string, number>
    feats?: Array<{ id: string }>
    legendary_effects?: Array<{ id: string }>
  }>
}

interface CampaignPayload {
  campaign_id?: string
  favor?: string
  blessings?: Record<string, number>
}

interface CampaignDetailsPayload {
  campaigns?: CampaignPayload[]
}

type ScenarioKind = 'campaign' | 'adventure' | 'variant' | 'trial' | 'timeGate'

interface FormationSavePayload {
  formation_id?: string
  layout_id?: string
  scenario?: { kind: ScenarioKind; id: string }
  placements?: Record<string, string>
  specializations?: Record<string, string>
  feats?: Record<string, string[]>
  familiars?: Record<string, string>
  is_favorite?: boolean
}

interface FormationSavesPayload {
  formations?: FormationSavePayload[]
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

export function normalizeUserDetails(payload: UserDetailsPayload): NormalizedUserDetails {
  const warnings: string[] = []
  const heroes = payload.heroes ?? []

  if (!payload.heroes) {
    warnings.push('getuserdetails payload missing heroes array')
  }

  const ownedHeroes: OwnedHero[] = heroes.map((hero) => ({
    heroId: hero.hero_id,
    level: hero.level ?? 0,
    equipment: hero.equipment ?? {},
    feats: (hero.feats ?? []).map((f) => f.id),
    legendaryEffects: (hero.legendary_effects ?? []).map((e) => e.id),
  }))

  return { ownedHeroes, warnings }
}

export function normalizeCampaignDetails(
  payload: CampaignDetailsPayload,
): NormalizedCampaignDetails {
  const warnings: string[] = []
  const campaigns = payload.campaigns ?? []

  if (!payload.campaigns) {
    warnings.push('getcampaigndetails payload missing campaigns array')
  }

  const result = campaigns.map((c) => ({
    campaignId: c.campaign_id ?? 'unknown',
    favor: c.favor ?? '0',
    blessings: c.blessings ?? {},
  }))

  return { campaigns: result, warnings }
}

export function normalizeFormationSaves(
  payload: FormationSavesPayload,
): NormalizedFormationSaves {
  const warnings: string[] = []
  const formations = payload.formations ?? []

  if (!payload.formations) {
    warnings.push('getallformationsaves payload missing formations array')
  }

  const result: ImportedFormationSave[] = formations.map((f) => {
    const scenarioRef: ScenarioRef = f.scenario ?? { kind: 'adventure', id: '0' }
    if (!f.scenario) {
      warnings.push(`formation ${f.formation_id ?? 'unknown'} missing scenario reference`)
    }

    return {
      formationId: f.formation_id ?? 'unknown',
      layoutId: f.layout_id ?? 'unknown',
      scenarioRef,
      placements: f.placements ?? {},
      specializations: f.specializations ?? {},
      feats: f.feats ?? {},
      familiars: f.familiars ?? {},
      isFavorite: f.is_favorite ?? false,
    }
  })

  return { formations: result, warnings }
}
