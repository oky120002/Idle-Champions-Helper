import { expect, test, type Locator } from '@playwright/test'

async function getFirstRowCardCount(locator: Locator): Promise<number> {
  return locator.evaluateAll((elements) => {
    const tops = elements
      .map((element) => {
        if (!(element instanceof HTMLElement)) {
          return null
        }

        return Math.round(element.getBoundingClientRect().top)
      })
      .filter((top): top is number => top !== null)

    if (tops.length === 0) {
      throw new Error('结果卡片不存在。')
    }

    const firstRowTop = Math.min(...tops)

    return tops.filter((top) => Math.abs(top - firstRowTop) <= 4).length
  })
}

async function getElementWidth(locator: Locator): Promise<number> {
  return locator.evaluate((element) => {
    if (!(element instanceof HTMLElement)) {
      throw new Error('目标节点不存在。')
    }

    return Math.round(element.getBoundingClientRect().width)
  })
}

test('变体筛选页首次显示当前筛选摘要时不应推挤结果说明位置', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.removeItem('idle-champions-helper.locale')
  })

  await page.goto('./#/variants')
  await expect(page.locator('.variants-page')).toBeVisible()

  const summary = page.locator('.results-panel__filter-summary')
  const panel = page.locator('.variants-results .results-panel')
  const baselineTop = await panel.evaluate((element) => Math.round((element as HTMLElement).getBoundingClientRect().top))

  await page.getByRole('combobox').selectOption({ index: 1 })
  await expect(summary).toContainText('当前筛选：')

  const nextTop = await panel.evaluate((element) => Math.round((element as HTMLElement).getBoundingClientRect().top))

  expect(Math.abs(nextTop - baselineTop)).toBeLessThanOrEqual(2)
  await expect(panel).toBeVisible()
})

test('英雄筛选页桌面端应显示统一工作台大壳，并让工具栏左右两段无缝衔接', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.removeItem('idle-champions-helper.locale')
  })

  await page.setViewportSize({ width: 1440, height: 960 })
  await page.goto('./#/champions')
  await expect(page.locator('.workbench-page__toolbar-title')).toHaveText('英雄筛选')
  await expect(page.locator('.site-header')).toHaveClass(/site-header--condensed/)

  const workbench = page.locator('.page-workbench')
  const header = page.locator('.site-header')
  const chromeSidebar = page.locator('.page-workbench__chrome-sidebar')
  const chromeMain = page.locator('.page-workbench__chrome-main')
  const sidebarShell = page.locator('.page-workbench__sidebar-shell')
  const contentShell = page.locator('.page-workbench__content-shell')

  await expect(workbench).toBeVisible()

  const [headerBox, workbenchBox, sidebarBox, mainBox, sidebarShellBox, contentShellBox] = await Promise.all([
    header.boundingBox(),
    workbench.boundingBox(),
    chromeSidebar.boundingBox(),
    chromeMain.boundingBox(),
    sidebarShell.boundingBox(),
    contentShell.boundingBox(),
  ])

  if (!headerBox || !workbenchBox || !sidebarBox || !mainBox || !sidebarShellBox || !contentShellBox) {
    throw new Error('工作台工具栏不可见，无法验证合并关系。')
  }

  expect(Math.round(workbenchBox.y) - Math.round(headerBox.y + headerBox.height)).toBeLessThanOrEqual(16)
  expect(Math.abs(Math.round(sidebarBox.x + sidebarBox.width) - Math.round(mainBox.x))).toBeLessThanOrEqual(2)
  expect(Math.abs(Math.round(sidebarBox.y + sidebarBox.height) - Math.round(mainBox.y + mainBox.height))).toBeLessThanOrEqual(2)
  expect(Math.abs(Math.round(sidebarShellBox.y) - Math.round(contentShellBox.y))).toBeLessThanOrEqual(2)
})

test('英雄筛选页中等桌面宽度下工具栏应保持单行，并把筛选状态收进左侧栏', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.removeItem('idle-champions-helper.locale')
  })

  await page.setViewportSize({ width: 1180, height: 900 })
  await page.goto('./#/champions')
  await expect(page.locator('.workbench-page__toolbar-title')).toHaveText('英雄筛选')
  await expect(page.locator('.workbench-page__toolbar-lead-status')).toContainText('条件待命')
  await expect(page.locator('.page-workbench__chrome-actions').getByText(/命中$/)).toHaveCount(0)

  const actionButtons = page.locator('.page-workbench__chrome-actions .workbench-page__toolbar-action')
  const buttonCount = await actionButtons.count()
  const tops = await Promise.all(
    Array.from({ length: buttonCount }, async (_, index) => {
      const box = await actionButtons.nth(index).boundingBox()

      if (!box) {
        throw new Error('工具栏按钮不可见，无法验证单行布局。')
      }

      return Math.round(box.y)
    }),
  )

  expect(new Set(tops).size).toBe(1)
})

const sharedFilterToolbarCases = [
  { route: './#/illustrations', title: '立绘图鉴' },
  { route: './#/pets', title: '宠物图鉴' },
  { route: './#/variants', title: '变体筛选' },
] as const

for (const scenario of sharedFilterToolbarCases) {
  test(`${scenario.title}页也应把筛选状态收进左侧工具栏，并保持右侧动作单行`, async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.removeItem('idle-champions-helper.locale')
    })

    await page.setViewportSize({ width: 1180, height: 900 })
    await page.goto(scenario.route)
    await expect(page.locator('.workbench-page__toolbar-title')).toHaveText(scenario.title)
    await expect(page.locator('.workbench-page__toolbar-lead-status')).toContainText('条件待命')
    await expect(page.locator('.page-workbench__chrome-actions').getByText(/命中$/)).toHaveCount(0)

    const actionButtons = page.locator('.page-workbench__chrome-actions .workbench-page__toolbar-action')
    const buttonCount = await actionButtons.count()
    const tops = await Promise.all(
      Array.from({ length: buttonCount }, async (_, index) => {
        const box = await actionButtons.nth(index).boundingBox()

        if (!box) {
          throw new Error('工具栏按钮不可见，无法验证单行布局。')
        }

        return Math.round(box.y)
      }),
    )

    expect(new Set(tops).size).toBeLessThanOrEqual(1)
  })
}

test('英雄筛选页桌面端收起抽屉后，应完全收起左栏并只保留展开入口', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.removeItem('idle-champions-helper.locale')
  })

  await page.setViewportSize({ width: 1440, height: 960 })
  await page.goto('./#/champions')
  await expect(page.getByRole('button', { name: '收起左侧面板' })).toBeVisible()

  const toggle = page.getByRole('button', { name: '收起左侧面板' })
  const sidebar = page.locator('.page-workbench__sidebar')
  const content = page.locator('.page-workbench__content-shell')
  const expandedSidebarWidth = await getElementWidth(sidebar)
  const expandedToggleBox = await toggle.boundingBox()
  const collapseMotion = await page.evaluate(async () => {
    const collapseToggle = document.querySelector('[aria-label="收起左侧面板"]')
    const contentShell = document.querySelector('.page-workbench__content-shell')

    if (!(collapseToggle instanceof HTMLButtonElement) || !(contentShell instanceof HTMLElement)) {
      throw new Error('工作台抽屉节点不存在，无法采集开合位移。')
    }

    const start = performance.now()
    collapseToggle.click()

    const workbench = document.querySelector('.page-workbench')

    if (!(workbench instanceof HTMLElement)) {
      throw new Error('工作台容器不存在，无法采集开合位移。')
    }

    return new Promise<{ widths: number[], lefts: number[], rightGaps: number[] }>((resolve) => {
      const widths: number[] = []
      const lefts: number[] = []
      const rightGaps: number[] = []

      const capture = (now: number) => {
        const rect = contentShell.getBoundingClientRect()
        const workbenchRect = workbench.getBoundingClientRect()
        widths.push(Math.round(rect.width))
        lefts.push(Math.round(rect.left))
        rightGaps.push(Math.round(workbenchRect.right - rect.right))

        if (now - start >= 460) {
          resolve({ widths, lefts, rightGaps })
          return
        }

        requestAnimationFrame(capture)
      }

      requestAnimationFrame(capture)
    })
  })

  await page.waitForTimeout(160)

  const collapsedSidebarWidth = await getElementWidth(sidebar)
  const contentLeft = await content.evaluate((element) => Math.round((element as HTMLElement).getBoundingClientRect().left))
  const workbenchLeft = await page.locator('.page-workbench').evaluate((element) => Math.round((element as HTMLElement).getBoundingClientRect().left))
  const collapsedToggle = page.getByRole('button', { name: '展开左侧面板' })
  const collapsedToggleBox = await collapsedToggle.boundingBox()
  const collapseTravel = collapseMotion.lefts.length >= 2
    ? collapseMotion.lefts[0]! - collapseMotion.lefts[collapseMotion.lefts.length - 1]!
    : 0

  expect(expandedSidebarWidth).toBeGreaterThanOrEqual(280)
  expect(collapsedSidebarWidth).toBeLessThanOrEqual(2)
  expect(Math.abs(contentLeft - workbenchLeft)).toBeLessThanOrEqual(10)
  expect(Math.max(...collapseMotion.widths) - Math.min(...collapseMotion.widths)).toBeLessThanOrEqual(2)
  expect(collapseTravel).toBeGreaterThanOrEqual(180)
  expect(Math.max(...collapseMotion.rightGaps)).toBeLessThanOrEqual(12)
  await expect(collapsedToggle).toBeVisible()

  if (!expandedToggleBox || !collapsedToggleBox) {
    throw new Error('抽屉开合按钮不可见，无法验证锚点是否稳定。')
  }

  expect(Math.abs(expandedToggleBox.x - collapsedToggleBox.x)).toBeLessThanOrEqual(1)
  expect(Math.abs(expandedToggleBox.y - collapsedToggleBox.y)).toBeLessThanOrEqual(1)

  const expandMotion = await page.evaluate(async () => {
    const expandToggle = document.querySelector('[aria-label="展开左侧面板"]')
    const contentShell = document.querySelector('.page-workbench__content-shell')
    const workbench = document.querySelector('.page-workbench')

    if (
      !(expandToggle instanceof HTMLButtonElement)
      || !(contentShell instanceof HTMLElement)
      || !(workbench instanceof HTMLElement)
    ) {
      throw new Error('工作台展开节点不存在，无法采集开合位移。')
    }

    const start = performance.now()
    expandToggle.click()

    return new Promise<{ lefts: number[], rightGaps: number[] }>((resolve) => {
      const lefts: number[] = []
      const rightGaps: number[] = []

      const capture = (now: number) => {
        const rect = contentShell.getBoundingClientRect()
        const workbenchRect = workbench.getBoundingClientRect()
        lefts.push(Math.round(rect.left))
        rightGaps.push(Math.round(workbenchRect.right - rect.right))

        if (now - start >= 460) {
          resolve({ lefts, rightGaps })
          return
        }

        requestAnimationFrame(capture)
      }

      requestAnimationFrame(capture)
    })
  })

  const expandTravel = expandMotion.lefts.length >= 2
    ? expandMotion.lefts[expandMotion.lefts.length - 1]! - expandMotion.lefts[0]!
    : 0

  expect(expandTravel).toBeGreaterThanOrEqual(180)
  expect(Math.max(...expandMotion.rightGaps)).toBeLessThanOrEqual(18)
  await expect(page.getByRole('button', { name: '收起左侧面板' })).toBeVisible()
})

test('阵型页左侧布局抽屉不应把标题和当前布局信息挤成窄列竖排', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.removeItem('idle-champions-helper.locale')
  })

  await page.setViewportSize({ width: 1440, height: 960 })
  await page.goto('./#/formation')
  await expect(page.locator('.workbench-page__toolbar-title')).toHaveText('阵型编辑')

  const layoutLibraryMetrics = await page.locator('.formation-layout-library').evaluate((element) => {
    if (!(element instanceof HTMLElement)) {
      throw new Error('阵型布局抽屉不存在。')
    }

    const hero = element.querySelector('.formation-layout-library__hero')
    const workspace = element.querySelector('.formation-layout-library__workspace')
    const title = element.querySelector('.formation-layout-library__title')
    const selectedTitle = element.querySelector('.formation-layout-library__selected-title')

    if (
      !(hero instanceof HTMLElement)
      || !(workspace instanceof HTMLElement)
      || !(title instanceof HTMLElement)
      || !(selectedTitle instanceof HTMLElement)
    ) {
      throw new Error('阵型布局抽屉关键节点不存在。')
    }

    return {
      heroTemplate: window.getComputedStyle(hero).gridTemplateColumns,
      workspaceTemplate: window.getComputedStyle(workspace).gridTemplateColumns,
      titleHeight: Math.round(title.getBoundingClientRect().height),
      selectedTitleHeight: Math.round(selectedTitle.getBoundingClientRect().height),
    }
  })

  expect(layoutLibraryMetrics.heroTemplate).not.toContain(' ')
  expect(layoutLibraryMetrics.workspaceTemplate).not.toContain(' ')
  expect(layoutLibraryMetrics.titleHeight).toBeLessThanOrEqual(80)
  expect(layoutLibraryMetrics.selectedTitleHeight).toBeLessThanOrEqual(80)
})

test('英雄筛选页超宽屏下仍应放宽到接近六列结果卡', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.removeItem('idle-champions-helper.locale')
  })

  await page.setViewportSize({ width: 2545, height: 1500 })
  await page.goto('./#/champions')
  await expect(page.locator('.workbench-page__toolbar-title')).toHaveText('英雄筛选')
  await expect(page.locator('.results-grid .result-card--link').first()).toBeVisible()

  const firstRowCardCount = await getFirstRowCardCount(page.locator('.results-grid .result-card--link'))

  expect(firstRowCardCount).toBeGreaterThanOrEqual(6)
})

test('英雄筛选页移动端宽度下结果区应自然收敛为单列', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.removeItem('idle-champions-helper.locale')
  })

  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('./#/champions')
  await expect(page.locator('.workbench-page__toolbar-title')).toHaveText('英雄筛选')
  await expect(page.locator('.results-grid .result-card--link').first()).toBeVisible()

  const firstRowCardCount = await getFirstRowCardCount(page.locator('.results-grid .result-card--link'))

  expect(firstRowCardCount).toBe(1)
})
