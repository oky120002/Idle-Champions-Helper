import { expect, test, type Page } from '@playwright/test'

async function getPaneScrollTop(page: Page): Promise<number> {
  return page.locator('.page-workbench__content-scroll').evaluate((element) => {
    if (!(element instanceof HTMLElement)) {
      throw new Error('结果滚动面板不存在。')
    }

    return Math.round(element.scrollTop)
  })
}

async function setPaneScrollTop(page: Page, top: number): Promise<void> {
  await page.locator('.page-workbench__content-scroll').evaluate((element, nextTop) => {
    if (!(element instanceof HTMLElement)) {
      throw new Error('结果滚动面板不存在。')
    }

    element.scrollTop = nextTop
    element.dispatchEvent(new Event('scroll'))
  }, top)
}

async function clickVisibleResultLink(page: Page): Promise<void> {
  const linkIndex = await page.locator('.results-grid .result-card--link').evaluateAll((elements) => {
    const pane = document.querySelector('.page-workbench__content-scroll')

    if (!(pane instanceof HTMLElement)) {
      throw new Error('结果滚动面板不存在。')
    }

    const paneRect = pane.getBoundingClientRect()

    return elements.findIndex((element) => {
      if (!(element instanceof HTMLElement)) {
        return false
      }

      const rect = element.getBoundingClientRect()
      const centerY = rect.top + rect.height / 2

      return centerY >= paneRect.top + 48 && centerY <= paneRect.bottom - 48
    })
  })

  if (linkIndex < 0) {
    throw new Error('没有找到当前视口内可点击的结果卡链接。')
  }

  await page.locator('.results-grid .result-card--link').nth(linkIndex).click()
}

test('英雄筛选页在右侧面板深处改筛选时，应把右面板带回顶部摘要区', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.removeItem('idle-champions-helper.locale')
  })

  await page.goto('./#/champions')
  await expect(page.getByRole('heading', { level: 2, name: '英雄筛选' })).toBeVisible()
  await setPaneScrollTop(page, 720)

  expect(await getPaneScrollTop(page)).toBeGreaterThanOrEqual(680)

  await page.getByRole('button', { name: '1 号位', exact: true }).click()
  await page.waitForTimeout(420)

  expect(await getPaneScrollTop(page)).toBeLessThanOrEqual(24)
})

test('英雄筛选页下拉后应出现悬浮返回顶部按钮，并只滚动右侧面板', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.removeItem('idle-champions-helper.locale')
  })

  await page.setViewportSize({ width: 1440, height: 960 })
  await page.goto('./#/champions')
  await expect(page.getByRole('heading', { level: 2, name: '英雄筛选' })).toBeVisible()

  await setPaneScrollTop(page, 840)
  const backToTopButton = page.getByRole('button', { name: '返回顶部' })
  await expect(backToTopButton).toBeVisible()

  const baselineWindowScroll = await page.evaluate(() => Math.round(window.scrollY))
  expect(await page.evaluate(() => Math.round(window.scrollY))).toBe(baselineWindowScroll)

  const [buttonBox, paneBox] = await Promise.all([
    backToTopButton.boundingBox(),
    page.locator('.page-workbench__content-shell').boundingBox(),
  ])

  if (!buttonBox || !paneBox) {
    throw new Error('悬浮返回顶部按钮或结果面板不可见。')
  }

  expect(buttonBox.x + buttonBox.width).toBeLessThanOrEqual(paneBox.x + paneBox.width - 8)
  expect(buttonBox.y + buttonBox.height).toBeGreaterThanOrEqual(paneBox.y + paneBox.height - 120)

  await expect(backToTopButton).toBeVisible()
  await backToTopButton.click()
  await expect
    .poll(async () => await getPaneScrollTop(page))
    .toBeLessThanOrEqual(24)
  await expect(backToTopButton).toBeHidden()
})

test('英雄详情返回后应恢复右侧面板滚动位置与筛选参数', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.removeItem('idle-champions-helper.locale')
  })

  await page.goto('./#/champions?seat=1')
  await expect(page.getByText(/^当前筛选：座位：1 号位/)).toBeVisible()

  await setPaneScrollTop(page, 680)
  const savedScrollTop = await getPaneScrollTop(page)

  await clickVisibleResultLink(page)
  await expect(page).toHaveURL(/#\/champions\/[^?]+\?seat=1/)

  await page.getByRole('link', { name: '返回英雄筛选' }).click()
  await expect(page).toHaveURL(/#\/champions\?seat=1$/)
  await expect(page.getByText(/^当前筛选：座位：1 号位/)).toBeVisible()

  await expect
    .poll(async () => await getPaneScrollTop(page))
    .toBeGreaterThanOrEqual(savedScrollTop - 24)
})
