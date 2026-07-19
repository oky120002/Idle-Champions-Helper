import type { PlannerHeroOverridePatch } from '../domain/planner/plannerModel'
import { APP_STORE_NAMES, openAppDatabase, requestToPromise, waitForTransaction } from './localDatabase'

export async function listPlannerHeroOverrides(): Promise<PlannerHeroOverridePatch[]> {
  const database = await openAppDatabase()

  try {
    const transaction = database.transaction(APP_STORE_NAMES.heroAbilityOverrides, 'readonly')
    const store = transaction.objectStore(APP_STORE_NAMES.heroAbilityOverrides)
    const items = await requestToPromise(store.getAll() as IDBRequest<PlannerHeroOverridePatch[]>)
    await waitForTransaction(transaction)
    return items
  } finally {
    database.close()
  }
}

export async function readPlannerHeroOverride(heroId: string): Promise<PlannerHeroOverridePatch | null> {
  const database = await openAppDatabase()

  try {
    const transaction = database.transaction(APP_STORE_NAMES.heroAbilityOverrides, 'readonly')
    const store = transaction.objectStore(APP_STORE_NAMES.heroAbilityOverrides)
    const override = await requestToPromise(
      store.get(heroId) as IDBRequest<PlannerHeroOverridePatch | undefined>,
    )
    await waitForTransaction(transaction)
    return override ?? null
  } finally {
    database.close()
  }
}

export async function savePlannerHeroOverride(override: PlannerHeroOverridePatch): Promise<void> {
  const database = await openAppDatabase()

  try {
    const transaction = database.transaction(APP_STORE_NAMES.heroAbilityOverrides, 'readwrite')
    const store = transaction.objectStore(APP_STORE_NAMES.heroAbilityOverrides)
    await requestToPromise(store.put(override, override.heroId))
    await waitForTransaction(transaction)
  } finally {
    database.close()
  }
}

export async function deletePlannerHeroOverride(heroId: string): Promise<void> {
  const database = await openAppDatabase()

  try {
    const transaction = database.transaction(APP_STORE_NAMES.heroAbilityOverrides, 'readwrite')
    const store = transaction.objectStore(APP_STORE_NAMES.heroAbilityOverrides)
    await requestToPromise(store.delete(heroId))
    await waitForTransaction(transaction)
  } finally {
    database.close()
  }
}

export async function clearPlannerHeroOverrides(): Promise<void> {
  const database = await openAppDatabase()

  try {
    const transaction = database.transaction(APP_STORE_NAMES.heroAbilityOverrides, 'readwrite')
    const store = transaction.objectStore(APP_STORE_NAMES.heroAbilityOverrides)
    await requestToPromise(store.clear())
    await waitForTransaction(transaction)
  } finally {
    database.close()
  }
}
