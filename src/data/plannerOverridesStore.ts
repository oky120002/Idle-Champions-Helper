import type { HeroAbilityOverridePatch } from '../domain/abilities/abilityModel'
import {
  heroAbilityOverridePatchArraySchema,
  heroAbilityOverridePatchSchema,
  parseStoredRecord,
} from '../domain/types/stored-record-schemas'
import { APP_STORE_NAMES, openAppDatabase, requestToPromise, waitForTransaction } from './localDatabase'

export async function listPlannerHeroOverrides(): Promise<HeroAbilityOverridePatch[]> {
  const database = await openAppDatabase()

  try {
    const transaction = database.transaction(APP_STORE_NAMES.heroAbilityOverrides, 'readonly')
    const store = transaction.objectStore(APP_STORE_NAMES.heroAbilityOverrides)
    const raw = await requestToPromise(store.getAll() as IDBRequest<unknown[]>)
    await waitForTransaction(transaction)
    return parseStoredRecord(raw, heroAbilityOverridePatchArraySchema, 'planner hero overrides') as HeroAbilityOverridePatch[]
  } finally {
    database.close()
  }
}

export async function readPlannerHeroOverride(heroId: string): Promise<HeroAbilityOverridePatch | null> {
  const database = await openAppDatabase()

  try {
    const transaction = database.transaction(APP_STORE_NAMES.heroAbilityOverrides, 'readonly')
    const store = transaction.objectStore(APP_STORE_NAMES.heroAbilityOverrides)
    const raw = await requestToPromise(store.get(heroId) as IDBRequest<unknown>)
    await waitForTransaction(transaction)
    return raw != null ? (parseStoredRecord(raw, heroAbilityOverridePatchSchema, 'planner hero override') as HeroAbilityOverridePatch) : null
  } finally {
    database.close()
  }
}

export async function savePlannerHeroOverride(override: HeroAbilityOverridePatch): Promise<void> {
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
