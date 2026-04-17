import type { FormationLayout, Variant } from '../../domain/types'
import type { VariantCampaignGroup } from './types'

function buildFormationLookup(formations: FormationLayout[]) {
  const byVariantId = new Map<string, FormationLayout>()
  const byAdventureId = new Map<string, FormationLayout>()
  const byCampaignId = new Map<string, FormationLayout>()

  for (const formation of formations) {
    for (const context of formation.sourceContexts ?? []) {
      if (context.kind === 'variant' && !byVariantId.has(context.id)) {
        byVariantId.set(context.id, formation)
      }

      if (context.kind === 'adventure' && !byAdventureId.has(context.id)) {
        byAdventureId.set(context.id, formation)
      }

      if (context.kind === 'campaign' && !byCampaignId.has(context.id)) {
        byCampaignId.set(context.id, formation)
      }
    }

    for (const context of formation.applicableContexts ?? []) {
      if (context.kind === 'variant' && !byVariantId.has(context.id)) {
        byVariantId.set(context.id, formation)
      }

      if (context.kind === 'adventure' && !byAdventureId.has(context.id)) {
        byAdventureId.set(context.id, formation)
      }

      if (context.kind === 'campaign' && !byCampaignId.has(context.id)) {
        byCampaignId.set(context.id, formation)
      }
    }
  }

  return {
    byVariantId,
    byAdventureId,
    byCampaignId,
  }
}

function getFormationForAdventureGroup(options: {
  adventureId: string | null
  campaignId: string
  variantId: string
  formationLookup: ReturnType<typeof buildFormationLookup>
}): FormationLayout | null {
  const { adventureId, campaignId, variantId, formationLookup } = options

  if (adventureId) {
    const adventureFormation = formationLookup.byAdventureId.get(adventureId)
    if (adventureFormation) {
      return adventureFormation
    }
  }

  const variantFormation = formationLookup.byVariantId.get(variantId)
  if (variantFormation) {
    return variantFormation
  }

  return formationLookup.byCampaignId.get(campaignId) ?? null
}

function mergeSortedNumbers(values: number[], nextValue: number | null): number[] {
  if (nextValue === null || values.includes(nextValue)) {
    return values
  }

  return [...values, nextValue].sort((left, right) => left - right)
}

function mergeSortedNumberList(values: number[], nextValues: number[]): number[] {
  const merged = new Set(values)

  for (const nextValue of nextValues) {
    merged.add(nextValue)
  }

  return Array.from(merged).sort((left, right) => left - right)
}

function mergeSortedStrings(values: string[], nextValues: string[]): string[] {
  const merged = new Set(values)

  for (const nextValue of nextValues) {
    merged.add(nextValue)
  }

  return Array.from(merged).sort((left, right) => left.localeCompare(right))
}

function sortVariants(variants: Variant[]): Variant[] {
  return [...variants].sort(
    (left, right) =>
      Number(left.id) - Number(right.id) || left.name.display.localeCompare(right.name.display),
  )
}

export function groupVariantsByCampaign(options: {
  variants: Variant[]
  formations: FormationLayout[]
}): VariantCampaignGroup[] {
  const { variants, formations } = options
  const formationLookup = buildFormationLookup(formations)
  const campaigns = new Map<string, VariantCampaignGroup>()

  for (const variant of variants) {
    const adventureId = variant.adventureId ?? variant.id
    const adventureName = variant.adventure ?? variant.name
    const campaignGroup =
      campaigns.get(variant.campaign.id) ?? {
        id: variant.campaign.id,
        campaign: variant.campaign,
        variantCount: 0,
        adventures: [],
      }
    campaignGroup.variantCount += 1

    let adventureGroup = campaignGroup.adventures.find((item) => item.adventureId === adventureId)

    if (!adventureGroup) {
      adventureGroup = {
        id: `${variant.campaign.id}:${adventureId}`,
        campaign: variant.campaign,
        adventureId,
        adventure: adventureName,
        scene: variant.scene,
        objectiveAreas: [],
        formation: getFormationForAdventureGroup({
          adventureId: variant.adventureId,
          campaignId: variant.campaign.id,
          variantId: variant.id,
          formationLookup,
        }),
        enemyTypes: [],
        attackMix: {
          melee: 0,
          ranged: 0,
          magic: 0,
          other: 0,
        },
        specialEnemyMin: Number.POSITIVE_INFINITY,
        specialEnemyMax: Number.NEGATIVE_INFINITY,
        areaMilestones: [],
        variants: [],
      }
      campaignGroup.adventures.push(adventureGroup)
    }

    if (!adventureGroup.formation) {
      adventureGroup.formation = getFormationForAdventureGroup({
        adventureId: variant.adventureId,
        campaignId: variant.campaign.id,
        variantId: variant.id,
        formationLookup,
      })
    }

    adventureGroup.objectiveAreas = mergeSortedNumbers(
      adventureGroup.objectiveAreas,
      variant.objectiveArea,
    )
    adventureGroup.enemyTypes = mergeSortedStrings(adventureGroup.enemyTypes, variant.enemyTypes)
    adventureGroup.attackMix = {
      melee: adventureGroup.attackMix.melee + variant.attackMix.melee,
      ranged: adventureGroup.attackMix.ranged + variant.attackMix.ranged,
      magic: adventureGroup.attackMix.magic + variant.attackMix.magic,
      other: adventureGroup.attackMix.other + variant.attackMix.other,
    }
    adventureGroup.specialEnemyMin = Math.min(
      adventureGroup.specialEnemyMin,
      variant.specialEnemyCount,
    )
    adventureGroup.specialEnemyMax = Math.max(
      adventureGroup.specialEnemyMax,
      variant.specialEnemyCount,
    )
    adventureGroup.areaMilestones = mergeSortedNumberList(
      adventureGroup.areaMilestones,
      variant.areaMilestones,
    )
    adventureGroup.variants.push(variant)
    campaigns.set(campaignGroup.id, campaignGroup)
  }

  return Array.from(campaigns.values())
    .map((campaign) => ({
      ...campaign,
      adventures: campaign.adventures
        .map((adventure) => ({
          ...adventure,
          specialEnemyMin:
            Number.isFinite(adventure.specialEnemyMin) ? adventure.specialEnemyMin : 0,
          specialEnemyMax:
            Number.isFinite(adventure.specialEnemyMax) ? adventure.specialEnemyMax : 0,
          variants: sortVariants(adventure.variants),
        }))
        .sort((left, right) => Number(left.adventureId) - Number(right.adventureId)),
    }))
    .sort((left, right) => Number(left.id) - Number(right.id))
}
