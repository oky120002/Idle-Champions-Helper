import { expect, test, type Page } from '@playwright/test'

async function getScrollY(page: Page): Promise<number> {
  return page.evaluate(() => Math.round(window.scrollY))
}

async function getElementScrollTop(page: Page, selector: string): Promise<number> {
  return page.locator(selector).evaluate((element) => Math.round(element.scrollTop))
}

test('英雄筛选页点击筛选按钮时不应发生意外滚动跳转', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.removeItem('idle-champions-helper.locale')
  })

  await page.goto('./#/champions')
  await expect(page.getByRole('heading', { level: 2, name: '先用真实公共数据把查询入口跑起来' })).toBeVisible()

  await page.evaluate(() => window.scrollTo({ top: 560, behavior: 'instant' }))
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

test('英雄筛选页在长结果列表中收窄条件时不应把整页猛拉回顶部', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.removeItem('idle-champions-helper.locale')
  })

  await page.goto('./#/champions')
  await expect(page.getByRole('heading', { level: 2, name: '先用真实公共数据把查询入口跑起来' })).toBeVisible()

  await page.evaluate(() => window.scrollTo({ top: 560, behavior: 'instant' }))
  await page.waitForTimeout(100)

  const baselineScrollY = await getScrollY(page)
  const resultsBody = page.locator('.results-panel__body')

  await resultsBody.evaluate((element) => {
    element.scrollTop = element.scrollHeight
  })
  await page.waitForTimeout(100)
  expect(await getElementScrollTop(page, '.results-panel__body')).toBeGreaterThan(0)

  await page.getByLabel('关键词').fill('zzzz-no-match')
  await page.waitForTimeout(100)

  await expect(page.getByText('暂时没有可展示的英雄结果。先放宽一个过滤维度，再继续缩小范围会更顺手。')).toBeVisible()
  expect(Math.abs((await getScrollY(page)) - baselineScrollY)).toBeLessThanOrEqual(2)
  expect(await getElementScrollTop(page, '.results-panel__body')).toBe(0)
})
