import { expect, test } from '@playwright/test'

test('英雄筛选卡片进入详情后，详情 hash 与返回链路保持闭环', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.removeItem('idle-champions-helper.locale')
  })

  await page.goto('./#/champions')
  await expect(page.locator('.workbench-page__toolbar-title')).toHaveText('英雄筛选')

  await page.getByRole('button', { name: '7 号位', exact: true }).click()
  await expect(page).toHaveURL(/#\/champions\?seat=7$/)

  const minscCard = page.getByRole('link', { name: /查看详情：明斯克/ })
  await expect(minscCard).toBeVisible()
  await minscCard.click()

  await expect(page).toHaveURL(/#\/champions\/7\?seat=7#section-overview$/)
  await expect(page.getByRole('heading', { level: 2, name: '明斯克' })).toBeVisible()
  await expect(page.getByRole('link', { name: '返回英雄筛选' })).toHaveAttribute('href', /#\/champions\?seat=7$/)
  await expect(page.getByText('快速索引')).toHaveCount(0)

  await page.getByRole('button', { name: '升级' }).click()

  await expect(page).toHaveURL(/#\/champions\/7\?seat=7#section-upgrades$/)
  await expect(page.getByRole('button', { name: '概览' })).toHaveAttribute('aria-pressed', 'false')
  await expect(page.getByRole('button', { name: '升级' })).toHaveAttribute('aria-pressed', 'true')

  await page.reload()

  await expect(page).toHaveURL(/#\/champions\/7\?seat=7#section-upgrades$/)
  await expect(page.getByRole('button', { name: '升级' })).toHaveAttribute('aria-pressed', 'true')

  await page.getByRole('link', { name: '返回英雄筛选' }).click()

  await expect(page).toHaveURL(/#\/champions\?seat=7$/)
  await expect(page.getByRole('button', { name: '7 号位', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByRole('link', { name: /查看详情：明斯克/ })).toBeVisible()
})

test('立绘图鉴进入详情后，返回链接应回到立绘图鉴当前筛选', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.removeItem('idle-champions-helper.locale')
  })

  await page.goto('./#/illustrations?scope=skin')
  await expect(page.locator('.workbench-page__toolbar-title')).toHaveText('立绘图鉴')

  const illustrationCard = page.locator('.illustration-card').first()
  await expect(illustrationCard).toBeVisible()
  await illustrationCard.click()

  await expect(page.getByRole('link', { name: '返回立绘图鉴' })).toHaveAttribute(
    'href',
    /#\/illustrations\?scope=skin$/,
  )

  await page.getByRole('link', { name: '返回立绘图鉴' }).click()

  await expect(page).toHaveURL(/#\/illustrations\?scope=skin$/)
  await expect(page.locator('.workbench-page__toolbar-title')).toHaveText('立绘图鉴')
})
