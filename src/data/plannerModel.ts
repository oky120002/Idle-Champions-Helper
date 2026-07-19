import type {
  OfficialPlannerHeroModel,
  OfficialPlannerScenarioModel,
  PlannerHeroOverrideCollection,
  ResolvedPlannerModel,
} from '../domain/planner/plannerModel'
import { resolvePlannerModel } from '../domain/planner/plannerModel'
import { loadCollection } from './client'
import { listPlannerHeroOverrides } from './plannerOverridesStore'

const EMPTY_OVERRIDE_COLLECTION: PlannerHeroOverrideCollection = {
  items: [],
  updatedAt: '',
}

export async function loadResolvedPlannerModel(): Promise<ResolvedPlannerModel> {
  const [officialHeroes, officialScenarios, repoOverrides, localOverrides] = await Promise.all([
    loadCollection<OfficialPlannerHeroModel>('hero-abilities'),
    loadCollection<OfficialPlannerScenarioModel>('scenarios'),
    loadCollection<PlannerHeroOverrideCollection['items'][number]>('semantic-overrides')
      .catch(() => EMPTY_OVERRIDE_COLLECTION),
    listPlannerHeroOverrides(),
  ])

  return resolvePlannerModel(
    officialHeroes.items,
    officialScenarios.items,
    repoOverrides.items,
    localOverrides,
  )
}
