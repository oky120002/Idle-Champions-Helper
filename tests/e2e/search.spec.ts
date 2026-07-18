import { expect, test } from '@playwright/test'

test('全文检索页按英雄名命中并跳转详情', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.removeItem('idle-champions-helper.locale')
  })

  await page.goto('./#/search')
  await expect(page.getByRole('heading', { level: 2, name: '搜索英雄' })).toBeVisible()

  const input = page.locator('.search-page input[type="search"]')
  await input.fill('明斯克')

  const result = page.locator('.search-page__result').filter({ hasText: '明斯克' }).first()
  await expect(result).toBeVisible({ timeout: 10000 })
  await result.click()

  await expect(page).toHaveURL(/#\/champions\/\d+/)
})

test('全文检索页从 URL 还原查询与结果', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.removeItem('idle-champions-helper.locale')
  })

  await page.goto('./#/search?q=明斯克')

  const input = page.locator('.search-page input[type="search"]')
  await expect(input).toHaveValue('明斯克')
  await expect(
    page.locator('.search-page__result').filter({ hasText: '明斯克' }).first(),
  ).toBeVisible({ timeout: 10000 })
})
