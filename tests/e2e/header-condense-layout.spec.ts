import { expect, test, type Page } from '@playwright/test'

interface HeaderMetrics {
  compactBrandInset: number
  contentHeight: number
  compactBrandOpacity: number
  height: number
  kickerDisplay: string
  navClientWidth: number
  navLinkTops: number[]
  navScrollWidth: number
  navTop: number
  topbarActionsTop: number
}

async function scrollWindowInstantly(page: Page, top: number): Promise<void> {
  await page.evaluate((nextTop) => {
    window.scrollTo(0, nextTop)
  }, top)

  await expect
    .poll(async () => page.evaluate(() => Math.round(window.scrollY)))
    .toBe(top)
}

async function getHeaderMetrics(page: Page): Promise<HeaderMetrics> {
  return page.locator('.site-header').evaluate((element) => {
    if (!(element instanceof HTMLElement)) {
      throw new Error('顶部导航不存在。')
    }

    const contentShell = element.querySelector('.site-header__content-shell')
    const compactBrand = element.querySelector('.site-header__compact-brand')
    const nav = element.querySelector('.site-nav')

    if (!(contentShell instanceof HTMLElement) || !(compactBrand instanceof HTMLElement) || !(nav instanceof HTMLElement)) {
      throw new Error('顶部导航关键节点不存在。')
    }

    const headerRect = element.getBoundingClientRect()

    return {
      compactBrandInset: Math.round(compactBrand.getBoundingClientRect().left - headerRect.left),
      contentHeight: Math.round(contentShell.getBoundingClientRect().height),
      compactBrandOpacity: Number(window.getComputedStyle(compactBrand).opacity),
      height: Math.round(element.getBoundingClientRect().height),
      kickerDisplay: window.getComputedStyle(element.querySelector('.site-kicker') as Element).display,
      navClientWidth: Math.round(nav.clientWidth),
      navLinkTops: Array.from(nav.querySelectorAll('.nav-link')).map((navLink) =>
        Math.round((navLink as HTMLElement).getBoundingClientRect().top),
      ),
      navScrollWidth: Math.round(nav.scrollWidth),
      navTop: Math.round(nav.getBoundingClientRect().top),
      topbarActionsTop: Math.round((element.querySelector('.site-header__topbar-actions') as HTMLElement).getBoundingClientRect().top),
    }
  })
}

const headerCondenseAnimationWaitMs = 620

test('非首页滚动后顶部大标题应自动收紧，回顶后再展开', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.removeItem('idle-champions-helper.locale')
  })

  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('./#/champions')
  await expect(page.getByRole('heading', { level: 2, name: '按座位、定位与联动快速缩小候选英雄' })).toBeVisible()
  await expect(page.getByText(/^当前展示 \d+ \/ \d+ 名英雄/)).toBeVisible()

  const initialMetrics = await getHeaderMetrics(page)

  await expect(page.locator('.site-header')).not.toHaveClass(/site-header--condensed/)
  expect(initialMetrics.contentHeight).toBeGreaterThanOrEqual(60)
  expect(initialMetrics.navScrollWidth - initialMetrics.navClientWidth).toBeLessThanOrEqual(1)
  expect(Math.max(...initialMetrics.navLinkTops) - Math.min(...initialMetrics.navLinkTops)).toBeLessThanOrEqual(6)

  await scrollWindowInstantly(page, 320)
  await page.waitForTimeout(headerCondenseAnimationWaitMs)

  const condensedMetrics = await getHeaderMetrics(page)

  await expect(page.locator('.site-header')).toHaveClass(/site-header--condensed/)
  expect(condensedMetrics.height).toBeLessThan(initialMetrics.height - 72)
  expect(condensedMetrics.height).toBeLessThanOrEqual(92)
  expect(condensedMetrics.contentHeight).toBeLessThanOrEqual(4)
  expect(condensedMetrics.compactBrandOpacity).toBeGreaterThan(0.9)
  expect(condensedMetrics.compactBrandInset).toBeGreaterThanOrEqual(12)
  expect(condensedMetrics.kickerDisplay).toBe('none')
  expect(Math.abs(condensedMetrics.navTop - condensedMetrics.topbarActionsTop)).toBeLessThanOrEqual(6)

  await scrollWindowInstantly(page, 0)
  await page.waitForTimeout(headerCondenseAnimationWaitMs)

  const expandedMetrics = await getHeaderMetrics(page)

  await expect(page.locator('.site-header')).not.toHaveClass(/site-header--condensed/)
  expect(expandedMetrics.height).toBeGreaterThan(condensedMetrics.height + 60)
  expect(expandedMetrics.contentHeight).toBeGreaterThanOrEqual(60)
  expect(expandedMetrics.compactBrandOpacity).toBeLessThan(0.1)
})
