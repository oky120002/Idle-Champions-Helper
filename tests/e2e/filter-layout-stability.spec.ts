import { expect, test, type Locator, type Page } from '@playwright/test'

async function getScrollY(page: Page): Promise<number> {
  return page.evaluate(() => Math.round(window.scrollY))
}

async function getViewportTop(locator: Locator): Promise<number> {
  const box = await locator.boundingBox()

  if (!box) {
    throw new Error('目标元素不可见，无法读取位置。')
  }

  return Math.round(box.y)
}

test('英雄筛选页首次显示当前筛选摘要时不应推挤结果说明位置', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.removeItem('idle-champions-helper.locale')
  })

  await page.goto('./#/champions')
  await expect(page.getByRole('heading', { level: 2, name: '先用真实公共数据把查询入口跑起来' })).toBeVisible()
  await expect(page.locator('.filter-group').first().getByRole('button', { name: '1 号位', exact: true })).toBeVisible()

  await page.evaluate(() => window.scrollTo({ top: 320, behavior: 'instant' }))
  await page.waitForTimeout(100)

  const baselineScrollY = await getScrollY(page)
  const summary = page.getByText(/^当前展示 \d+ \/ \d+ 名英雄/)
  const baselineTop = await getViewportTop(summary)

  await page.locator('.filter-group').first().getByRole('button', { name: '1 号位', exact: true }).click()
  await page.waitForTimeout(100)

  expect(Math.abs((await getScrollY(page)) - baselineScrollY)).toBeLessThanOrEqual(2)
  expect(Math.abs((await getViewportTop(summary)) - baselineTop)).toBeLessThanOrEqual(2)
})

test('变体限制页首次显示当前筛选摘要时不应推挤结果说明位置', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.removeItem('idle-champions-helper.locale')
  })

  await page.goto('./#/variants')
  await expect(page.getByRole('heading', { level: 2, name: '先把官方中文展示和原文回退一起接上' })).toBeVisible()

  await page.evaluate(() => window.scrollTo({ top: 320, behavior: 'instant' }))
  await page.waitForTimeout(100)

  const baselineScrollY = await getScrollY(page)
  const summary = page.getByText(/^当前展示 \d+ \/ \d+ 条变体记录/)
  const baselineTop = await getViewportTop(summary)

  await page.getByRole('combobox').selectOption({ index: 1 })
  await page.waitForTimeout(100)

  expect(Math.abs((await getScrollY(page)) - baselineScrollY)).toBeLessThanOrEqual(2)
  expect(Math.abs((await getViewportTop(summary)) - baselineTop)).toBeLessThanOrEqual(2)
})

test('英雄筛选页桌面宽度下的筛选区应保持粘性，减少视线往返', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.removeItem('idle-champions-helper.locale')
  })

  await page.goto('./#/champions')
  await expect(page.getByRole('heading', { level: 2, name: '先用真实公共数据把查询入口跑起来' })).toBeVisible()

  const stickyPanel = page.locator('.champions-sidebar__sticky')

  await page.evaluate(() => window.scrollTo({ top: 720, behavior: 'instant' }))
  await page.waitForTimeout(100)
  const firstTop = await getViewportTop(stickyPanel)

  await page.evaluate(() => window.scrollTo({ top: 1320, behavior: 'instant' }))
  await page.waitForTimeout(100)
  const secondTop = await getViewportTop(stickyPanel)

  expect(firstTop).toBeGreaterThan(0)
  expect(Math.abs(secondTop - firstTop)).toBeLessThanOrEqual(6)
})
