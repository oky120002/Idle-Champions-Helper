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
  await expect(page.locator('.workbench-page__toolbar-title')).toHaveText('英雄筛选')

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

    const locale = element.querySelector('.locale-switcher--toolbar')
    const menu = element.querySelector('.site-header__menu-toggle')

    if (!(locale instanceof HTMLElement) || !(menu instanceof HTMLElement)) {
      throw new Error('顶部导航控件不存在。')
    }

    const menuRect = menu.getBoundingClientRect()
    const menuStyle = window.getComputedStyle(menu)

    return {
      menuBottom: Math.round(menuRect.bottom),
      menuLeft: Math.round(menuRect.left),
      menuHeight: Math.round(menuRect.height),
      menuRight: Math.round(menuRect.right),
      menuRadius: Math.round(Number.parseFloat(menuStyle.borderTopLeftRadius)),
      menuTop: Math.round(menuRect.top),
      toolbarLocaleDisplay: window.getComputedStyle(locale).display,
    }
  })

  await expect(menuToggle).toBeVisible()

  expect(headerMetrics.top).toBe(0)
  expect(headerMetrics.height).toBeLessThanOrEqual(110)
  expect(utilityMetrics.toolbarLocaleDisplay).toBe('none')
  expect(utilityMetrics.menuLeft).toBeGreaterThanOrEqual(0)
  expect(utilityMetrics.menuBottom).toBeGreaterThan(utilityMetrics.menuTop + 40)
  expect(utilityMetrics.menuHeight).toBeGreaterThanOrEqual(48)
  expect(utilityMetrics.menuRadius).toBeGreaterThanOrEqual(18)
  expect(utilityMetrics.menuRight).toBeGreaterThan(utilityMetrics.menuLeft + 120)
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
      panelRadius: Math.round(Number.parseFloat(style.borderTopLeftRadius)),
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
  await expect(page.locator('.site-nav__summary')).toContainText('英雄筛选')
  await expect(page.locator('.site-nav__locale-panel')).toContainText('界面语言')
  await expect(page.getByRole('group', { name: '界面语言切换' })).toBeVisible()
  await expect(page.getByRole('switch', { name: '界面语言' })).toBeVisible()

  expect(navMetrics.display).toBe('grid')
  expect(navMetrics.panelRadius).toBeGreaterThanOrEqual(20)
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

  const sectionBarMetrics = await page.getByRole('tablist', { name: '详情页签' }).evaluate((element) => {
    if (!(element instanceof HTMLElement)) {
      throw new Error('详情页签容器不存在。')
    }

    const style = window.getComputedStyle(element)

    return {
      display: style.display,
      clientWidth: Math.round(element.clientWidth),
      scrollWidth: Math.round(element.scrollWidth),
    }
  })

  const dossierMetrics = await page.locator('.champion-dossier').evaluate((element) => {
    if (!(element instanceof HTMLElement)) {
      throw new Error('英雄卷宗容器不存在。')
    }

    const identity = element.querySelector('.champion-dossier__identity')
    const scoreGrid = element.querySelector('.champion-dossier__score-grid')
    const facts = element.querySelector('.champion-dossier__section--facts')

    if (!(identity instanceof HTMLElement) || !(scoreGrid instanceof HTMLElement) || !(facts instanceof HTMLElement)) {
      throw new Error('英雄卷宗关键区块不存在。')
    }

    return {
      display: window.getComputedStyle(element).display,
      identityWidth: Math.round(identity.getBoundingClientRect().width),
      scoreGridColumns: window.getComputedStyle(scoreGrid).gridTemplateColumns,
      scoreGridWidth: Math.round(scoreGrid.getBoundingClientRect().width),
      factsWidth: Math.round(facts.getBoundingClientRect().width),
    }
  })

  const buttonTops = await page.getByRole('tablist', { name: '详情页签' }).locator('[role="tab"]').evaluateAll((elements) =>
    elements.map((element) => {
      if (!(element instanceof HTMLElement)) {
        throw new Error('分区页签不存在。')
      }

      return Math.round(element.getBoundingClientRect().top)
    }),
  )

  expect(sectionBarMetrics.display).toBe('flex')
  expect(sectionBarMetrics.scrollWidth - sectionBarMetrics.clientWidth).toBeLessThanOrEqual(1)
  expect(Math.max(...buttonTops) - Math.min(...buttonTops)).toBeGreaterThan(20)
  expect(dossierMetrics.display).toBe('grid')
  expect(dossierMetrics.identityWidth).toBeGreaterThanOrEqual(280)
  expect(dossierMetrics.scoreGridColumns.split(' ').length).toBeGreaterThanOrEqual(2)
  expect(dossierMetrics.scoreGridWidth).toBeGreaterThanOrEqual(280)
  expect(dossierMetrics.factsWidth).toBeGreaterThanOrEqual(280)
  expect(await getDocumentHorizontalOverflow(page)).toBeLessThanOrEqual(1)
})
