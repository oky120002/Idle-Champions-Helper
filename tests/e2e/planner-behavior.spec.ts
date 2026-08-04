import { expect, test, type Page } from '@playwright/test'

const APP_DATABASE_NAME = 'idle-champions-helper'
const APP_DATABASE_VERSION = 3
const USER_PROFILE_STORE = 'userProfileSnapshots'
const SNAPSHOT_KEY = 'current'

interface SeededOwnedHero {
  heroId: string
  level: number
}

async function resetPlannerDatabase(page: Page) {
  await page.addInitScript(async () => {
    window.localStorage.removeItem('idle-champions-helper.locale')

    await new Promise<void>((resolve) => {
      const request = window.indexedDB.deleteDatabase('idle-champions-helper')

      request.onsuccess = () => { resolve(); }
      request.onerror = () => { resolve(); }
      request.onblocked = () => { resolve(); }
    })
  })
}

async function seedPlannerSnapshot(page: Page, ownedHeroes: SeededOwnedHero[]) {
  await page.addInitScript(
    async ({ appDatabaseName, appDatabaseVersion, snapshotKey, userProfileStore, heroes }) => {
      window.localStorage.removeItem('idle-champions-helper.locale')

      await new Promise<void>((resolve) => {
        const deleteRequest = window.indexedDB.deleteDatabase(appDatabaseName)

        deleteRequest.onsuccess = () => { resolve(); }
        deleteRequest.onerror = () => { resolve(); }
        deleteRequest.onblocked = () => { resolve(); }
      })

      await new Promise<void>((resolve, reject) => {
        const request = window.indexedDB.open(appDatabaseName, appDatabaseVersion)

        request.onupgradeneeded = () => {
          const database = request.result

          if (!database.objectStoreNames.contains('formationDrafts')) {
            database.createObjectStore('formationDrafts')
          }

          if (!database.objectStoreNames.contains('formationPresets')) {
            database.createObjectStore('formationPresets')
          }

          if (!database.objectStoreNames.contains(userProfileStore)) {
            database.createObjectStore(userProfileStore)
          }

          if (!database.objectStoreNames.contains('credentialVault')) {
            database.createObjectStore('credentialVault')
          }
        }

        request.onerror = () => {
          reject(request.error ?? new Error('打开 planner 测试数据库失败。'))
        }

        request.onsuccess = () => {
          const database = request.result
          const transaction = database.transaction(userProfileStore, 'readwrite')
          const store = transaction.objectStore(userProfileStore)
          store.put(
            {
              schemaVersion: 1,
              ownedHeroes: heroes.map((hero) => ({
                heroId: hero.heroId,
                level: hero.level,
                equipment: {},
                feats: [],
                legendaryEffects: [],
              })),
              importedFormationSaves: [],
              updatedAt: new Date().toISOString(),
              warnings: [],
            },
            snapshotKey,
          )

          transaction.oncomplete = () => {
            database.close()
            resolve()
          }

          transaction.onerror = () => {
            database.close()
            reject(transaction.error ?? new Error('写入 planner 测试快照失败。'))
          }

          transaction.onabort = () => {
            database.close()
            reject(transaction.error ?? new Error('planner 测试快照写入被中止。'))
          }
        }
      })
    },
    {
      appDatabaseName: APP_DATABASE_NAME,
      appDatabaseVersion: APP_DATABASE_VERSION,
      snapshotKey: SNAPSHOT_KEY,
      userProfileStore: USER_PROFILE_STORE,
      heroes: ownedHeroes,
    },
  )
}

test('planner 在无本地快照时不应显示推荐结果或保存入口', async ({ page }) => {
  await resetPlannerDatabase(page)

  await page.goto('./#/planner')

  await expect(page.locator('.workbench-page__toolbar-title')).toHaveText('自动计划')
  await expect(page.getByText('尚未导入个人数据。')).toBeVisible()
  await expect(page.getByText('导入个人数据后才会生成推荐。')).toBeVisible()
  await expect(page.locator('[aria-label="推荐结果"]')).toHaveCount(0)
  await expect(page.getByRole('button', { name: '保存' })).toHaveCount(0)
})

test('planner 在有本地快照时只使用已拥有英雄生成推荐', async ({ page }) => {
  const ownedHeroIds = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10']
  await seedPlannerSnapshot(
    page,
    ownedHeroIds.map((heroId) => ({ heroId, level: 500 })),
  )

  await page.goto('./#/planner')

  await expect(page.locator('[aria-label="推荐结果"]')).toBeVisible()
  await expect(page.getByRole('button', { name: '保存' })).toBeEnabled()

  const placementHeroIds = await page.locator('.planner-result-card__placements li').evaluateAll((items) => (
    items.map((item) => item.getAttribute('data-hero-id') ?? '')
  ))

  expect(placementHeroIds.length).toBeGreaterThan(0)
  for (const heroId of placementHeroIds) {
    expect(heroId).not.toBe('')
    expect(ownedHeroIds).toContain(heroId)
  }
})
