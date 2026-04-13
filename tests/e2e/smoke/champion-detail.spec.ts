import { expect, test } from '@playwright/test'

test('英雄详情页支持分区进度提示与 hash 定位保留', async ({ page }) => {
  await page.goto('./#/champions/7')

  await expect(page).toHaveURL(/#\/champions\/7#overview$/)
  await expect(page.getByRole('heading', { level: 2, name: '明斯克' })).toBeVisible()
  await expect(page.locator('.champion-detail-sidebar__progress-copy')).toHaveText('当前浏览 · 概览')
  await expect(page.getByTestId('sidebar-section-overview')).toHaveAttribute('data-progress-state', 'active')

  await page.getByTestId('sidebar-section-upgrades').click()

  await expect(page).toHaveURL(/#\/champions\/7#upgrades$/)
  await expect(page.locator('.champion-detail-sidebar__progress-copy')).toHaveText('当前浏览 · 升级')
  await expect(page.getByTestId('sidebar-section-overview')).toHaveAttribute('data-progress-state', 'completed')
  await expect(page.getByTestId('sidebar-section-upgrades')).toHaveAttribute('data-progress-state', 'active')

  await page.reload()

  await expect(page).toHaveURL(/#\/champions\/7#upgrades$/)
  await expect(page.locator('.champion-detail-sidebar__progress-copy')).toHaveText('当前浏览 · 升级')
  await expect(page.getByTestId('sidebar-section-upgrades')).toHaveAttribute('data-progress-state', 'active')
})
