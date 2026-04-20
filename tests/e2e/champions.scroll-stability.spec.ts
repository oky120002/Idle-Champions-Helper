import { expect, test, type Page } from '@playwright/test'

async function getScrollY(page: Page): Promise<number> {
  return page.evaluate(() => Math.round(window.scrollY))
}

async function getResultsTargetTop(page: Page): Promise<number> {
  return page.locator('.results-panel-shell').evaluate((shell) => {
    const siteHeader = document.querySelector('.site-header')
    const headerBottom = siteHeader instanceof HTMLElement ? siteHeader.getBoundingClientRect().bottom : 0

    return Math.max(Math.round(shell.getBoundingClientRect().top + window.scrollY - headerBottom - 16), 0)
  })
}

async function getResultsTargetBottom(page: Page): Promise<number> {
  return page.locator('.results-panel-shell').evaluate((shell) => {
    const maxScrollTop = Math.max(document.documentElement.scrollHeight - window.innerHeight, 0)
    const shellBottom = shell.getBoundingClientRect().bottom + window.scrollY
    const targetTop = Math.round(shellBottom - window.innerHeight + 24)

    return Math.min(Math.max(targetTop, 0), maxScrollTop)
  })
}

async function scrollIntoResultsQuickNavZone(page: Page): Promise<void> {
  const targetTop = await getResultsTargetTop(page)
  const activationTop = Math.max(targetTop - 120, 260)

  await page.evaluate((top) => {
    window.scrollTo({ top, behavior: 'instant' })
  }, activationTop)
  await page.waitForTimeout(120)
}

test('英雄筛选页点击筛选按钮时不应发生意外滚动跳转', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.removeItem('idle-champions-helper.locale')
  })

  await page.goto('./#/champions')
  await expect(page.locator('.page-tab-header').getByText('英雄筛选', { exact: true })).toBeVisible()
  await expect(page.locator('.filter-group').first().getByRole('button', { name: '1 号位', exact: true })).toBeVisible()

  await page.evaluate(() => window.scrollTo({ top: 320, behavior: 'instant' }))
  await page.waitForTimeout(100)
  await expect(page.locator('.site-header')).toHaveClass(/site-header--condensed/)

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
  await expect(page.locator('.page-tab-header').getByText('英雄筛选', { exact: true })).toBeVisible()
  await expect(page.locator('.filter-group').nth(2).getByRole('button', { name: '长枪英雄', exact: true })).toBeVisible()

  await page.evaluate(() => window.scrollTo({ top: 1040, behavior: 'instant' }))
  await page.waitForTimeout(100)

  const baselineScrollY = await getScrollY(page)

  await page.locator('.filter-group').nth(2).getByRole('button', { name: '长枪英雄', exact: true }).click()
  await expect(page.getByText('当前筛选：联动队伍：长枪英雄 · Heroes of the Lance')).toBeVisible()
  await page.waitForTimeout(420)
  await expect
    .poll(async () => {
      const finalScrollY = await getScrollY(page)
      const targetTop = await getResultsTargetTop(page)

      return Math.abs(finalScrollY - targetTop)
    })
    .toBeLessThanOrEqual(32)

  const finalScrollY = await getScrollY(page)
  const targetTop = await getResultsTargetTop(page)

  expect(targetTop).toBeGreaterThan(96)
  expect(finalScrollY).toBeGreaterThan(96)
  expect(finalScrollY).toBeLessThan(baselineScrollY)
  expect(Math.abs(finalScrollY - targetTop)).toBeLessThanOrEqual(32)
})

test('英雄筛选页结果快捷按钮应支持一键到底和返回顶部', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.removeItem('idle-champions-helper.locale')
  })

  await page.goto('./#/champions')
  await expect(page.locator('.page-tab-header').getByText('英雄筛选', { exact: true })).toBeVisible()
  await expect(page.getByText(/^当前展示 \d+ \/ \d+ 名英雄/)).toBeVisible()
  await scrollIntoResultsQuickNavZone(page)

  await expect(page.getByRole('button', { name: '跳到结果底部' })).toBeVisible()

  const targetBottom = await getResultsTargetBottom(page)

  await page.getByRole('button', { name: '跳到结果底部' }).click()
  await expect
    .poll(async () => {
      const bottomScrollY = await getScrollY(page)
      return Math.abs(bottomScrollY - targetBottom)
    })
    .toBeLessThanOrEqual(48)
  await expect(page.getByRole('button', { name: '返回结果顶部' })).toBeVisible()

  await page.getByRole('button', { name: '返回结果顶部' }).click()
  await expect(page.getByRole('button', { name: '跳到结果底部' })).toBeVisible()
  await expect
    .poll(async () => {
      const topScrollY = await getScrollY(page)
      const targetTop = await getResultsTargetTop(page)
      return Math.abs(topScrollY - targetTop)
    })
    .toBeLessThanOrEqual(64)
})
