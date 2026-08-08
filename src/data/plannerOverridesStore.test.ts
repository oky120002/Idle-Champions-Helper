import 'fake-indexeddb/auto'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { APP_DATABASE_NAME, APP_STORE_NAMES, openAppDatabase } from './localDatabase'
import {
  clearPlannerHeroOverrides,
  deletePlannerHeroOverride,
  listPlannerHeroOverrides,
  readPlannerHeroOverride,
  savePlannerHeroOverride,
} from './plannerOverridesStore'

async function resetDatabase(): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase(APP_DATABASE_NAME)

    request.onerror = () => reject(request.error ?? new Error('删除测试数据库失败。'))

    request.onblocked = () => reject(new Error('删除测试数据库被阻塞。'))

    request.onsuccess = () => resolve()
  })
}

/** 直接写原始 override（绕过 save 的类型保证），用于腐蚀测试。 */
async function writeRawOverride(heroId: string, value: unknown): Promise<void> {
  const database = await openAppDatabase()
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(APP_STORE_NAMES.heroAbilityOverrides, 'readwrite')
      transaction.objectStore(APP_STORE_NAMES.heroAbilityOverrides).put(value, heroId)
      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(transaction.error ?? new Error('写入失败'))
    })
  } finally {
    database.close()
  }
}

beforeEach(async () => {
  await resetDatabase()
})

afterEach(async () => {
  await resetDatabase()
})

describe('planner hero overrides store', () => {
  it('打开数据库时会创建 heroAbilityOverrides 对象仓库', async () => {
    const database = await openAppDatabase()

    try {
      expect(database.objectStoreNames.contains(APP_STORE_NAMES.heroAbilityOverrides)).toBe(true)
    } finally {
      database.close()
    }
  })

  it('支持保存、读取、列出、删除和清空 override', async () => {
    const bruenorOverride = {
      heroId: 'bruenor',
      supportSignals: [
        { kind: 'globalDpsMultiplier' as const, value: 150, rawEffect: 'global_dps_multiplier_mult,150' },
      ],
    }
    const celesteOverride = {
      heroId: 'celeste',
      carrySignals: [
        { kind: 'heroDpsMultiplier' as const, value: 80, rawEffect: 'hero_dps_multiplier_mult,80' },
      ],
    }

    await savePlannerHeroOverride(bruenorOverride)
    await savePlannerHeroOverride(celesteOverride)

    await expect(readPlannerHeroOverride('bruenor')).resolves.toEqual(bruenorOverride)
    await expect(listPlannerHeroOverrides()).resolves.toEqual([bruenorOverride, celesteOverride])

    await deletePlannerHeroOverride('celeste')
    await expect(readPlannerHeroOverride('celeste')).resolves.toBeNull()
    await expect(listPlannerHeroOverrides()).resolves.toEqual([bruenorOverride])

    await clearPlannerHeroOverrides()
    await expect(listPlannerHeroOverrides()).resolves.toEqual([])
  })
})

describe('stored-record 腐蚀校验（C1）', () => {
  it('列表含腐蚀记录 → 跳过坏记录返回空列表（不连坐）', async () => {
    await writeRawOverride('bad', { carrySignals: [] })

    const overrides = await listPlannerHeroOverrides()
    expect(overrides).toEqual([])
  })

  it('override 缺 heroId → 单条读出拒绝', async () => {
    await writeRawOverride('bad', { carrySignals: [] })

    await expect(readPlannerHeroOverride('bad')).rejects.toThrow(/存储数据校验失败.*heroId/)
  })
})
