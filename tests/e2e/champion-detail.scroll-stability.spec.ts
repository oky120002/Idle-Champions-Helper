import { expect, test, type Page } from '@playwright/test'

async function getScrollY(page: Page): Promise<number> {
  return page.evaluate(() => Math.round(window.scrollY))
}

test('英雄详情页连续向下滚动时不会被快速索引的 hash 同步拉回', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.removeItem('idle-champions-helper.locale')
  })

  await page.goto('./#/champions/7')
  await expect(page.getByRole('heading', { level: 2, name: '明斯克' })).toBeVisible()

  await page.evaluate(() => window.scrollTo({ top: 1320, behavior: 'instant' }))
  await page.waitForTimeout(150)

  const firstScrollY = await getScrollY(page)

  await page.mouse.move(640, 420)
  await page.mouse.wheel(0, 1400)
  await page.waitForTimeout(250)

  const secondScrollY = await getScrollY(page)

  await page.mouse.wheel(0, 1400)
  await page.waitForTimeout(250)

  const thirdScrollY = await getScrollY(page)

  expect(secondScrollY).toBeGreaterThan(firstScrollY + 240)
  expect(thirdScrollY).toBeGreaterThan(secondScrollY + 240)
  await expect(page).toHaveURL(
    /#\/champions\/7#section-(character-sheet|combat|upgrades|feats)$/,
  )
})
