import { expect, test, type Page } from '@playwright/test'

interface HeaderMetrics {
  contentHeight: number
  compactBrandOpacity: number
  height: number
  kickerDisplay: string
  navTop: number
  topbarActionsTop: number
}

async function getHeaderMetrics(page: Page): Promise<HeaderMetrics> {
  return page.locator('.site-header').evaluate((element) => {
    if (!(element instanceof HTMLElement)) {
      throw new Error('顶部导航不存在。')
    }

    const contentShell = element.querySelector('.site-header__content-shell')
    const compactBrand = element.querySelector('.site-header__compact-brand')

    if (!(contentShell instanceof HTMLElement) || !(compactBrand instanceof HTMLElement)) {
      throw new Error('顶部导航关键节点不存在。')
    }

    return {
      contentHeight: Math.round(contentShell.getBoundingClientRect().height),
      compactBrandOpacity: Number(window.getComputedStyle(compactBrand).opacity),
      height: Math.round(element.getBoundingClientRect().height),
      kickerDisplay: window.getComputedStyle(element.querySelector('.site-kicker') as Element).display,
      navTop: Math.round((element.querySelector('.site-nav') as HTMLElement).getBoundingClientRect().top),
      topbarActionsTop: Math.round((element.querySelector('.site-header__topbar-actions') as HTMLElement).getBoundingClientRect().top),
    }
  })
}

test('非首页滚动后顶部大标题应自动收紧，回顶后再展开', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.removeItem('idle-champions-helper.locale')
  })

  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('./#/champions')
  await expect(page.getByRole('heading', { level: 2, name: '先用真实公共数据把查询入口跑起来' })).toBeVisible()

  const initialMetrics = await getHeaderMetrics(page)

  await expect(page.locator('.site-header')).not.toHaveClass(/site-header--condensed/)
  expect(initialMetrics.contentHeight).toBeGreaterThan(60)

  await page.evaluate(() => window.scrollTo({ top: 320, behavior: 'instant' }))
  await page.waitForTimeout(320)

  const condensedMetrics = await getHeaderMetrics(page)

  await expect(page.locator('.site-header')).toHaveClass(/site-header--condensed/)
  expect(condensedMetrics.height).toBeLessThan(initialMetrics.height - 80)
  expect(condensedMetrics.height).toBeLessThanOrEqual(80)
  expect(condensedMetrics.contentHeight).toBeLessThanOrEqual(4)
  expect(condensedMetrics.compactBrandOpacity).toBeGreaterThan(0.9)
  expect(condensedMetrics.kickerDisplay).toBe('none')
  expect(Math.abs(condensedMetrics.navTop - condensedMetrics.topbarActionsTop)).toBeLessThanOrEqual(6)

  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }))
  await page.waitForTimeout(320)

  const expandedMetrics = await getHeaderMetrics(page)

  await expect(page.locator('.site-header')).not.toHaveClass(/site-header--condensed/)
  expect(expandedMetrics.height).toBeGreaterThan(condensedMetrics.height + 60)
  expect(expandedMetrics.contentHeight).toBeGreaterThan(60)
  expect(expandedMetrics.compactBrandOpacity).toBeLessThan(0.1)
})
