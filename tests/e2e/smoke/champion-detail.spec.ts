import { expect, test } from '@playwright/test'

test('英雄筛选卡片进入详情后，详情 hash 与返回链路保持闭环', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.removeItem('idle-champions-helper.locale')
  })

  await page.goto('./#/champions')
  await expect(page.getByRole('heading', { level: 2, name: '英雄筛选' })).toBeVisible()

  await page.getByRole('button', { name: '7 号位', exact: true }).click()
  await expect(page).toHaveURL(/#\/champions\?seat=7$/)

  const minscCard = page.getByRole('link', { name: /查看详情：明斯克/ })
  await expect(minscCard).toBeVisible()
  await minscCard.click()

  await expect(page).toHaveURL(/#\/champions\/7\?seat=7#section-overview$/)
  await expect(page.getByRole('heading', { level: 2, name: '明斯克' })).toBeVisible()
  await expect(page.getByRole('link', { name: '返回英雄筛选' })).toHaveAttribute('href', /#\/champions\?seat=7$/)
  await expect(page.locator('.champion-detail-sidebar__progress-copy')).toHaveText('当前浏览 · 概览')
  await expect(page.getByTestId('sidebar-section-skins')).toHaveCount(0)
  await expect(page.getByTestId('sidebar-section-raw')).toHaveCount(0)

  await page.getByTestId('sidebar-section-upgrades').click()

  await expect(page).toHaveURL(/#\/champions\/7\?seat=7#section-upgrades$/)
  await expect(page.locator('.champion-detail-sidebar__progress-copy')).toHaveText('当前浏览 · 升级')
  await expect(page.getByTestId('sidebar-section-overview')).toHaveAttribute('data-progress-state', 'completed')
  await expect(page.getByTestId('sidebar-section-upgrades')).toHaveAttribute('data-progress-state', 'active')

  await page.reload()

  await expect(page).toHaveURL(/#\/champions\/7\?seat=7#section-upgrades$/)
  await expect(page.locator('.champion-detail-sidebar__progress-copy')).toHaveText('当前浏览 · 升级')
  await expect(page.getByTestId('sidebar-section-upgrades')).toHaveAttribute('data-progress-state', 'active')

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
  await expect(page.getByRole('heading', { level: 2, name: '立绘图鉴' })).toBeVisible()

  const illustrationCard = page.locator('.illustration-card').first()
  await expect(illustrationCard).toBeVisible()
  await illustrationCard.click()

  await expect(page.getByRole('link', { name: '返回立绘图鉴' })).toHaveAttribute(
    'href',
    /#\/illustrations\?scope=skin$/,
  )

  await page.getByRole('link', { name: '返回立绘图鉴' }).click()

  await expect(page).toHaveURL(/#\/illustrations\?scope=skin$/)
  await expect(page.getByRole('heading', { level: 2, name: '立绘图鉴' })).toBeVisible()
})
