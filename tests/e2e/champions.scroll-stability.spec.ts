import { expect, test, type Page } from '@playwright/test'

async function getScrollY(page: Page): Promise<number> {
  return page.evaluate(() => Math.round(window.scrollY))
}

async function getResultsTargetTop(page: Page): Promise<number> {
  return page.locator('.results-panel-shell').evaluate((shell) => {
    const siteHeader = document.querySelector('.site-header')
    const headerHeight = siteHeader instanceof HTMLElement ? siteHeader.getBoundingClientRect().height : 0

    return Math.max(Math.round(shell.getBoundingClientRect().top + window.scrollY - headerHeight - 16), 0)
  })
}

test('英雄筛选页点击筛选按钮时不应发生意外滚动跳转', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.removeItem('idle-champions-helper.locale')
  })

  await page.goto('./#/champions')
  await expect(page.getByRole('heading', { level: 2, name: '先用真实公共数据把查询入口跑起来' })).toBeVisible()
  await expect(page.locator('.filter-group').first().getByRole('button', { name: '1 号位', exact: true })).toBeVisible()

  await page.evaluate(() => window.scrollTo({ top: 320, behavior: 'instant' }))
  await page.waitForTimeout(100)

  const baseline = await getScrollY(page)
  const seatFilterGroup = page.locator('.filter-group').first()

  await seatFilterGroup.getByRole('button', { name: '1 号位', exact: true }).click()
  await page.waitForTimeout(100)
  expect(Math.abs((await getScrollY(page)) - baseline)).toBeLessThanOrEqual(2)

  await seatFilterGroup.getByRole('button', { name: '2 号位', exact: true }).click()
  await page.waitForTimeout(100)
  expect(Math.abs((await getScrollY(page)) - baseline)).toBeLessThanOrEqual(2)

  await seatFilterGroup.getByRole('button', { name: '全部', exact: true }).click()
  await page.waitForTimeout(100)
  expect(Math.abs((await getScrollY(page)) - baseline)).toBeLessThanOrEqual(2)
})

test('英雄筛选页在长结果列表中收窄条件时应平滑带回结果区，而不是把整页夹到顶部', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.removeItem('idle-champions-helper.locale')
  })

  await page.goto('./#/champions')
  await expect(page.getByRole('heading', { level: 2, name: '先用真实公共数据把查询入口跑起来' })).toBeVisible()
  await expect(page.locator('.filter-group').nth(2).getByRole('button', { name: '长枪英雄', exact: true })).toBeVisible()

  await page.evaluate(() => window.scrollTo({ top: 1040, behavior: 'instant' }))
  await page.waitForTimeout(100)

  const baselineScrollY = await getScrollY(page)
  const targetTop = await getResultsTargetTop(page)

  await page.locator('.filter-group').nth(2).getByRole('button', { name: '长枪英雄', exact: true }).click()
  await page.waitForTimeout(450)

  const finalScrollY = await getScrollY(page)

  await expect(page.getByText('当前筛选：联动队伍：长枪英雄 · Heroes of the Lance')).toBeVisible()
  expect(finalScrollY).toBeGreaterThan(200)
  expect(finalScrollY).toBeLessThan(baselineScrollY)
  expect(Math.abs(finalScrollY - targetTop)).toBeLessThanOrEqual(32)
})
