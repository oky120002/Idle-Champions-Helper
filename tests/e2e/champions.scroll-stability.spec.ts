import { expect, test, type Page } from '@playwright/test'

async function getScrollY(page: Page): Promise<number> {
  return page.evaluate(() => Math.round(window.scrollY))
}

test('英雄筛选页点击筛选按钮时不应发生意外滚动跳转', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.removeItem('idle-champions-helper.locale')
  })

  await page.goto('./#/champions')
  await expect(page.getByRole('heading', { level: 2, name: '先用真实公共数据把查询入口跑起来' })).toBeVisible()

  await page.evaluate(() => window.scrollTo({ top: 640, behavior: 'instant' }))
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
