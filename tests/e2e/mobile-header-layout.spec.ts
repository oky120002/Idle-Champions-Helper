import { expect, test, type Page } from '@playwright/test'

async function getDocumentHorizontalOverflow(page: Page): Promise<number> {
  return page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
}

test('移动端顶部导航应保持紧凑且不依赖横向滑动', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.removeItem('idle-champions-helper.locale')
  })

  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('./#/champions')
  await expect(page.getByRole('heading', { level: 2, name: '先用真实公共数据把查询入口跑起来' })).toBeVisible()

  const headerMetrics = await page.locator('.site-header').evaluate((element) => {
    if (!(element instanceof HTMLElement)) {
      throw new Error('顶部导航不存在。')
    }

    const rect = element.getBoundingClientRect()

    return {
      height: Math.round(rect.height),
      top: Math.round(rect.top),
    }
  })

  const menuToggle = page.getByRole('button', { name: '展开主导航' })
  const utilityMetrics = await page.locator('.site-header').evaluate((element) => {
    if (!(element instanceof HTMLElement)) {
      throw new Error('顶部导航不存在。')
    }

    const locale = element.querySelector('.locale-switcher')
    const menu = element.querySelector('.site-header__menu-toggle')

    if (!(locale instanceof HTMLElement) || !(menu instanceof HTMLElement)) {
      throw new Error('顶部导航控件不存在。')
    }

    const localeRect = locale.getBoundingClientRect()
    const menuRect = menu.getBoundingClientRect()
    const menuStyle = window.getComputedStyle(menu)

    return {
      localeTop: Math.round(localeRect.top),
      localeBottom: Math.round(localeRect.bottom),
      menuTop: Math.round(menuRect.top),
      menuHeight: Math.round(menuRect.height),
      menuWidth: Math.round(menuRect.width),
      menuRadius: Math.round(Number.parseFloat(menuStyle.borderTopLeftRadius)),
    }
  })

  await expect(menuToggle).toBeVisible()

  expect(headerMetrics.top).toBe(0)
  expect(headerMetrics.height).toBeLessThanOrEqual(88)
  expect(utilityMetrics.menuTop).toBeGreaterThanOrEqual(utilityMetrics.localeTop + 10)
  expect(utilityMetrics.menuTop).toBeLessThan(utilityMetrics.localeBottom + 8)
  expect(utilityMetrics.menuHeight).toBeLessThanOrEqual(36)
  expect(utilityMetrics.menuWidth).toBeGreaterThan(utilityMetrics.menuHeight + 10)
  expect(utilityMetrics.menuRadius).toBeLessThanOrEqual(16)
  expect(await getDocumentHorizontalOverflow(page)).toBeLessThanOrEqual(1)

  await menuToggle.click()

  const navMetrics = await page.locator('.site-nav').evaluate((element) => {
    if (!(element instanceof HTMLElement)) {
      throw new Error('导航容器不存在。')
    }

    const style = window.getComputedStyle(element)

    return {
      display: style.display,
      clientWidth: Math.round(element.clientWidth),
      scrollWidth: Math.round(element.scrollWidth),
    }
  })

  const navLinkTops = await page.locator('.site-nav .nav-link').evaluateAll((elements) =>
    elements.map((element) => {
      if (!(element instanceof HTMLElement)) {
        throw new Error('导航项不存在。')
      }

      return Math.round(element.getBoundingClientRect().top)
    }),
  )

  expect(navMetrics.display).toBe('grid')
  expect(navMetrics.scrollWidth - navMetrics.clientWidth).toBeLessThanOrEqual(1)
  expect(Math.max(...navLinkTops) - Math.min(...navLinkTops)).toBeGreaterThan(20)
  expect(await getDocumentHorizontalOverflow(page)).toBeLessThanOrEqual(1)
})

test('移动端英雄详情分区导航不应退化为横向滑动条', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.removeItem('idle-champions-helper.locale')
  })

  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('./#/champions/7')
  await expect(page.getByRole('heading', { level: 2, name: '明斯克' })).toBeVisible()

  const sectionBarMetrics = await page.locator('.section-jump-bar').evaluate((element) => {
    if (!(element instanceof HTMLElement)) {
      throw new Error('分区跳转条不存在。')
    }

    const style = window.getComputedStyle(element)

    return {
      display: style.display,
      clientWidth: Math.round(element.clientWidth),
      scrollWidth: Math.round(element.scrollWidth),
    }
  })

  const buttonTops = await page.locator('.section-jump-bar .section-jump-bar__button').evaluateAll((elements) =>
    elements.map((element) => {
      if (!(element instanceof HTMLElement)) {
        throw new Error('分区按钮不存在。')
      }

      return Math.round(element.getBoundingClientRect().top)
    }),
  )

  expect(sectionBarMetrics.display).toBe('grid')
  expect(sectionBarMetrics.scrollWidth - sectionBarMetrics.clientWidth).toBeLessThanOrEqual(1)
  expect(Math.max(...buttonTops) - Math.min(...buttonTops)).toBeGreaterThan(20)
  expect(await getDocumentHorizontalOverflow(page)).toBeLessThanOrEqual(1)
})
