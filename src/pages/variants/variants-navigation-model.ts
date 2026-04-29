import type { VariantAdventureGroup, VariantCampaignGroup } from './types'

export type VariantSearchCampaignGroup = {
  campaign: VariantCampaignGroup
  adventures: VariantAdventureGroup[]
  campaignMatches: boolean
}

export function normalizeVariantSearch(value: string): string {
  return value.trim().toLowerCase()
}

function fuzzyIncludes(value: string, query: string): boolean {
  if (!query) {
    return true
  }

  const target = value.toLowerCase()

  if (target.includes(query)) {
    return true
  }

  let queryIndex = 0

  for (const char of target) {
    if (char === query[queryIndex]) {
      queryIndex += 1
    }

    if (queryIndex === query.length) {
      return true
    }
  }

  return false
}

function matchesLocalizedName(value: { original: string; display: string }, query: string): boolean {
  return fuzzyIncludes(value.original, query) || fuzzyIncludes(value.display, query)
}

export function buildVariantNavigationSearchGroups(
  groups: VariantCampaignGroup[],
  query: string,
): VariantSearchCampaignGroup[] {
  return groups
    .map((campaign) => {
      const campaignMatches = matchesLocalizedName(campaign.campaign, query)
      const adventures = query
        ? campaign.adventures.filter((adventure) => matchesLocalizedName(adventure.adventure, query))
        : campaign.adventures.slice(0, 6)

      return {
        campaign,
        adventures,
        campaignMatches,
      }
    })
    .filter((group) => group.campaignMatches || group.adventures.length > 0)
    .slice(0, 12)
}
