import { expect, test, type Page } from '@playwright/test'

async function getPaneScrollTop(page: Page): Promise<number> {
  return page.locator('.page-workbench__content-scroll').evaluate((element) => {
    if (!(element instanceof HTMLElement)) {
      throw new Error('详情滚动面板不存在。')
    }

    return Math.round(element.scrollTop)
  })
}

async function scrollPaneBy(page: Page, amount: number): Promise<void> {
  await page.locator('.page-workbench__content-scroll').evaluate((element, nextAmount) => {
    if (!(element instanceof HTMLElement)) {
      throw new Error('详情滚动面板不存在。')
    }

    element.scrollTop += nextAmount
    element.dispatchEvent(new Event('scroll'))
  }, amount)
}

test('英雄详情页连续向下滚动时不会被 hash 同步拉回', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.removeItem('idle-champions-helper.locale')
  })

  await page.goto('./#/champions/7')
  await expect(page.getByRole('heading', { level: 2, name: '明斯克' })).toBeVisible()

  await scrollPaneBy(page, 1320)
  await page.waitForTimeout(150)

  const firstScrollTop = await getPaneScrollTop(page)

  await scrollPaneBy(page, 1400)
  await page.waitForTimeout(250)

  const secondScrollTop = await getPaneScrollTop(page)

  await scrollPaneBy(page, 1400)
  await page.waitForTimeout(250)

  const thirdScrollTop = await getPaneScrollTop(page)

  expect(secondScrollTop).toBeGreaterThan(firstScrollTop + 240)
  expect(thirdScrollTop).toBeGreaterThan(secondScrollTop + 240)
  await expect(page).toHaveURL(/#\/champions\/7#section-(character-sheet|combat|upgrades|feats)$/)
})
