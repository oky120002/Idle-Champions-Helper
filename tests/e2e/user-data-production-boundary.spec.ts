import { expect, test, type Page } from '@playwright/test'

const APP_DATABASE_NAME = 'idle-champions-helper'
const APP_DATABASE_VERSION = 3
const USER_PROFILE_STORE = 'userProfileSnapshots'
const SOURCE_PREFERENCE_KEY = 'idle-champions-helper.user-profile-source'
const SNAPSHOT_KEY = 'current'

interface SeededOwnedHero {
  heroId: string
  level: number
}

async function resetUserDataState(page: Page, sourcePreference: string | null = null) {
  await page.addInitScript(async ({ appDatabaseName, sourceKey, nextSource }) => {
    window.localStorage.removeItem('idle-champions-helper.locale')

    if (nextSource === null) {
      window.localStorage.removeItem(sourceKey)
    } else {
      window.localStorage.setItem(sourceKey, nextSource)
    }

    await new Promise<void>((resolve) => {
      const request = window.indexedDB.deleteDatabase(appDatabaseName)
      request.onsuccess = () => { resolve(); }
      request.onerror = () => { resolve(); }
      request.onblocked = () => { resolve(); }
    })
  }, {
    appDatabaseName: APP_DATABASE_NAME,
    sourceKey: SOURCE_PREFERENCE_KEY,
    nextSource: sourcePreference,
  })
}

async function seedBrowserSnapshot(page: Page, ownedHeroes: SeededOwnedHero[]) {
  await page.addInitScript(
    async ({ appDatabaseName, appDatabaseVersion, snapshotKey, userProfileStore, heroes }) => {
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
          reject(request.error ?? new Error('打开测试数据库失败。'))
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
            reject(transaction.error ?? new Error('写入浏览器同步快照失败。'))
          }

          transaction.onabort = () => {
            database.close()
            reject(transaction.error ?? new Error('写入浏览器同步快照被中止。'))
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

test('生产预览下个人数据页不应显示任何 dev-only 私有快照控件', async ({ page }) => {
  await resetUserDataState(page, 'local-dev-snapshot')

  await page.goto('./#/user-data')

  await expect(page.getByRole('region', { name: '同步状态' })).toBeVisible()
  await expect(page.getByRole('button', { name: '使用本地开发快照' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: '刷新本地开发快照' })).toHaveCount(0)
  await expect(page.getByText('当前开发数据源')).toHaveCount(0)
  await expect(page.getByText('本地开发快照')).toHaveCount(0)
})

test('生产预览下即使保存了 local-dev-snapshot 偏好，也只消费浏览器同步快照', async ({ page }) => {
  await resetUserDataState(page, 'local-dev-snapshot')
  await seedBrowserSnapshot(page, [
    { heroId: '1', level: 500 },
    { heroId: '2', level: 500 },
    { heroId: '3', level: 500 },
    { heroId: '4', level: 500 },
  ])

  await page.goto('./#/user-data')

  await expect(page.getByText('浏览器同步快照已于')).toBeVisible()
  await expect(page.getByText('拥有英雄 4 个')).toBeVisible()
  await expect(page.getByRole('button', { name: '使用本地开发快照' })).toHaveCount(0)

  await page.goto('./#/planner')

  await expect(page.getByRole('region', { name: '个人数据状态' })).toContainText('浏览器同步快照已于')
  await expect(page.getByText('尚未导入个人数据。')).toHaveCount(0)
  await expect(page.getByText('导入个人数据后才会生成推荐。')).toHaveCount(0)
  await expect(page.getByText('本地开发快照已于')).toHaveCount(0)
})
