import { expect, test, type Page } from '@playwright/test'

interface HeaderMetrics {
  compactBrandInset: number
  contentHeight: number
  compactBrandOpacity: number
  height: number
  kickerDisplay: string
  navLabelCenterDeltas: number[]
  navHeight: number
  navClientWidth: number
  navLinkHeights: number[]
  navLinkTops: number[]
  navScrollWidth: number
  navTop: number
  topbarActionsHeight: number
  topbarActionsTop: number
}

async function scrollWindowInstantly(page: Page, top: number): Promise<number> {
  const actualTop = await page.evaluate((nextTop) => {
    window.scrollTo(0, nextTop)
    return Math.round(window.scrollY)
  }, top)

  await expect
    .poll(async () => page.evaluate(() => Math.round(window.scrollY)))
    .toBe(actualTop)

  return actualTop
}

async function getHeaderMetrics(page: Page): Promise<HeaderMetrics> {
  return page.locator('.site-header').evaluate((element) => {
    if (!(element instanceof HTMLElement)) {
      throw new Error('顶部导航不存在。')
    }

    const contentShell = element.querySelector('.site-header__content-shell')
    const compactBrand = element.querySelector('.site-header__compact-brand')
    const nav = element.querySelector('.site-nav')
    const topbarActions = element.querySelector('.site-header__topbar-actions')

    if (
      !(contentShell instanceof HTMLElement)
      || !(compactBrand instanceof HTMLElement)
      || !(nav instanceof HTMLElement)
      || !(topbarActions instanceof HTMLElement)
    ) {
      throw new Error('顶部导航关键节点不存在。')
    }

    const headerRect = element.getBoundingClientRect()
    const navRect = nav.getBoundingClientRect()
    const topbarActionsRect = topbarActions.getBoundingClientRect()

    return {
      compactBrandInset: Math.round(compactBrand.getBoundingClientRect().left - headerRect.left),
      contentHeight: Math.round(contentShell.getBoundingClientRect().height),
      compactBrandOpacity: Number(window.getComputedStyle(compactBrand).opacity),
      height: Math.round(element.getBoundingClientRect().height),
      kickerDisplay: window.getComputedStyle(element.querySelector('.site-kicker') as Element).display,
      navLabelCenterDeltas: Array.from(nav.querySelectorAll('.nav-link')).map((navLink) => {
        if (!(navLink instanceof HTMLElement)) {
          return 0
        }

        const label = navLink.querySelector('.nav-link__label')

        if (!(label instanceof HTMLElement)) {
          return 0
        }

        const navLinkRect = navLink.getBoundingClientRect()
        const labelRect = label.getBoundingClientRect()

        return Math.round((labelRect.left + labelRect.width / 2) - (navLinkRect.left + navLinkRect.width / 2))
      }),
      navHeight: Math.round(navRect.height),
      navClientWidth: Math.round(nav.clientWidth),
      navLinkHeights: Array.from(nav.querySelectorAll('.nav-link')).map((navLink) =>
        Math.round((navLink as HTMLElement).getBoundingClientRect().height),
      ),
      navLinkTops: Array.from(nav.querySelectorAll('.nav-link')).map((navLink) =>
        Math.round((navLink as HTMLElement).getBoundingClientRect().top),
      ),
      navScrollWidth: Math.round(nav.scrollWidth),
      navTop: Math.round(navRect.top),
      topbarActionsHeight: Math.round(topbarActionsRect.height),
      topbarActionsTop: Math.round(topbarActionsRect.top),
    }
  })
}

const headerCondenseAnimationWaitMs = 620

test('英雄筛选页桌面端应默认使用紧凑头部，并锁定整页外层滚动', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.removeItem('idle-champions-helper.locale')
  })

  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('./#/champions')
  await expect(page.locator('.workbench-page__toolbar-title')).toHaveText('英雄筛选')
  await expect(page.locator('.site-header')).toHaveClass(/site-header--condensed/)

  const initialMetrics = await getHeaderMetrics(page)

  expect(initialMetrics.height).toBeLessThanOrEqual(92)
  expect(initialMetrics.contentHeight).toBeLessThanOrEqual(4)
  expect(initialMetrics.compactBrandOpacity).toBeGreaterThan(0.9)
  expect(initialMetrics.kickerDisplay).toBe('none')
  expect(Math.max(...initialMetrics.navLabelCenterDeltas.map((delta) => Math.abs(delta)))).toBeLessThanOrEqual(2)
  expect(Math.max(...initialMetrics.navLinkHeights)).toBeLessThanOrEqual(46)
  expect(initialMetrics.navScrollWidth - initialMetrics.navClientWidth).toBeLessThanOrEqual(1)
  expect(Math.max(...initialMetrics.navLinkTops) - Math.min(...initialMetrics.navLinkTops)).toBeLessThanOrEqual(6)

  const scrolledTop = await scrollWindowInstantly(page, 320)
  expect(scrolledTop).toBe(0)
  await page.waitForTimeout(headerCondenseAnimationWaitMs)

  const condensedMetrics = await getHeaderMetrics(page)

  await expect(page.locator('.site-header')).toHaveClass(/site-header--condensed/)
  expect(Math.abs(condensedMetrics.height - initialMetrics.height)).toBeLessThanOrEqual(4)
  expect(Math.abs(condensedMetrics.contentHeight - initialMetrics.contentHeight)).toBeLessThanOrEqual(2)
  expect(condensedMetrics.compactBrandInset).toBeGreaterThanOrEqual(8)
  expect(Math.max(...condensedMetrics.navLabelCenterDeltas.map((delta) => Math.abs(delta)))).toBeLessThanOrEqual(2)
  expect(Math.max(...condensedMetrics.navLinkHeights)).toBeLessThanOrEqual(46)
  expect(
    Math.abs(
      condensedMetrics.navTop + condensedMetrics.navHeight / 2
        - (condensedMetrics.topbarActionsTop + condensedMetrics.topbarActionsHeight / 2),
    ),
  ).toBeLessThanOrEqual(6)
  await expect
    .poll(async () => page.evaluate(() => ({
      bodyScrollHeight: document.body.scrollHeight,
      htmlScrollHeight: document.documentElement.scrollHeight,
      viewportHeight: window.innerHeight,
    })))
    .toEqual({
      bodyScrollHeight: 900,
      htmlScrollHeight: 900,
      viewportHeight: 900,
    })

  await scrollWindowInstantly(page, 0)
  await page.waitForTimeout(headerCondenseAnimationWaitMs)
  await expect(page.locator('.site-header')).toHaveClass(/site-header--condensed/)
})
