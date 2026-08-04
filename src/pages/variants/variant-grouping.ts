import type { FormationLayout, ScenarioRef, Variant } from '../../domain/types'
import { NON_DISPLAY_ENEMY_TAGS } from './variant-labels'
import type { VariantAdventureGroup, VariantCampaignGroup } from './types'

type FormationLookup = {
  byVariantId: Map<string, FormationLayout>
  byAdventureId: Map<string, FormationLayout>
  byCampaignId: Map<string, FormationLayout>
}

function indexScenarioRef(
  context: ScenarioRef,
  formation: FormationLayout,
  lookup: FormationLookup,
) {
  if (context.kind === 'variant' && !lookup.byVariantId.has(context.id)) {
    lookup.byVariantId.set(context.id, formation)
  }

  if (context.kind === 'adventure' && !lookup.byAdventureId.has(context.id)) {
    lookup.byAdventureId.set(context.id, formation)
  }

  if (context.kind === 'campaign' && !lookup.byCampaignId.has(context.id)) {
    lookup.byCampaignId.set(context.id, formation)
  }
}

function buildFormationLookup(formations: FormationLayout[]): FormationLookup {
  const lookup: FormationLookup = {
    byVariantId: new Map<string, FormationLayout>(),
    byAdventureId: new Map<string, FormationLayout>(),
    byCampaignId: new Map<string, FormationLayout>(),
  }

  for (const formation of formations) {
    for (const context of formation.sourceContexts ?? []) {
      indexScenarioRef(context, formation, lookup)
    }

    for (const context of formation.applicableContexts ?? []) {
      indexScenarioRef(context, formation, lookup)
    }
  }

  return lookup
}

function getFormationForAdventureGroup(options: {
  adventureId: string | null
  campaignId: string
  variantId: string
  formationLookup: ReturnType<typeof buildFormationLookup>
}): FormationLayout | null {
  const { adventureId, campaignId, variantId, formationLookup } = options

  if (adventureId != null && adventureId !== '') {
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
  return [...variants].sort((left, right) => {
    const idDiff = Number(left.id) - Number(right.id)
    if (!Number.isNaN(idDiff) && idDiff !== 0) {
      return idDiff
    }
    return left.name.display.localeCompare(right.name.display)
  })
}

function createAdventureGroup(
  variant: Variant,
  adventureId: string,
  adventureName: NonNullable<Variant['adventure']>,
  formationLookup: FormationLookup,
): VariantAdventureGroup {
  return {
    adventureId,
    id: `${variant.campaign.id}:${adventureId}`,
    campaign: variant.campaign,
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
    attackMix: { melee: 0, ranged: 0, magic: 0, other: 0 },
    specialEnemyMin: Number.POSITIVE_INFINITY,
    specialEnemyMax: Number.NEGATIVE_INFINITY,
    areaMilestones: [],
    variants: [],
  }
}

function mergeVariantIntoAdventureGroup(
  adventureGroup: VariantAdventureGroup,
  variant: Variant,
) {
  adventureGroup.objectiveAreas = mergeSortedNumbers(
    adventureGroup.objectiveAreas,
    variant.objectiveArea,
  )
  adventureGroup.enemyTypes = mergeSortedStrings(
    adventureGroup.enemyTypes,
    // boss 等非种族 tag 不进展示用聚合（group.enemyTypes 仅 VariantAdventureSection chip 消费）；
    // vulnerability 匹配在 planner 侧用 scenario.enemyTypes（含 boss），此处过滤不影响。
    variant.enemyTypes.filter((tag) => !NON_DISPLAY_ENEMY_TAGS.has(tag)),
  )
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
}

function finalizeCampaignGroups(campaigns: Map<string, VariantCampaignGroup>): VariantCampaignGroup[] {
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

function processVariant(
  variant: Variant,
  campaigns: Map<string, VariantCampaignGroup>,
  formationLookup: FormationLookup,
) {
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
    adventureGroup = createAdventureGroup(variant, adventureId, adventureName, formationLookup)
    campaignGroup.adventures.push(adventureGroup)
  }

  adventureGroup.formation ??= getFormationForAdventureGroup({
    adventureId: variant.adventureId,
    campaignId: variant.campaign.id,
    variantId: variant.id,
    formationLookup,
  })

  mergeVariantIntoAdventureGroup(adventureGroup, variant)
  campaigns.set(campaignGroup.id, campaignGroup)
}

export function groupVariantsByCampaign(options: {
  variants: Variant[]
  formations: FormationLayout[]
}): VariantCampaignGroup[] {
  const { variants, formations } = options
  const formationLookup = buildFormationLookup(formations)
  const campaigns = new Map<string, VariantCampaignGroup>()

  for (const variant of variants) {
    processVariant(variant, campaigns, formationLookup)
  }

  return finalizeCampaignGroups(campaigns)
}
