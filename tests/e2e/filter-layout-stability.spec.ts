import { expect, test, type Locator } from '@playwright/test'

// 抽屉开合 transform transition 时长（CSS --page-workbench-layout-duration: 340ms）+ 余量。
// preview 读 dist，CSS 时长固定；用固定等待替代 rAF 持续采样，避免 fullyParallel 下 rAF 节流
// 导致帧不足（collapseTravel=0）或抓到过渡态 rightGap 峰值（超阈）。
const LAYOUT_TRANSITION_MS = 500

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

async function getElementLeft(locator: Locator): Promise<number> {
  return locator.evaluate((element) => {
    if (!(element instanceof HTMLElement)) {
      throw new Error('目标节点不存在。')
    }

    return Math.round(element.getBoundingClientRect().left)
  })
}

async function getElementRight(locator: Locator): Promise<number> {
  return locator.evaluate((element) => {
    if (!(element instanceof HTMLElement)) {
      throw new Error('目标节点不存在。')
    }

    return Math.round(element.getBoundingClientRect().right)
  })
}

async function getToolbarActionRows(locator: Locator): Promise<number> {
  const tops = await locator.evaluateAll((elements) => {
    return elements
      .map((element) => {
        if (!(element instanceof HTMLElement)) {
          return null
        }

        return Math.round(element.getBoundingClientRect().top)
      })
      .filter((top): top is number => top !== null)
  })

  if (tops.length === 0) {
    return 0
  }

  const rows: number[] = []

  tops.forEach((top) => {
    const matchedRow = rows.find((rowTop) => Math.abs(rowTop - top) <= 8)

    if (matchedRow === undefined) {
      rows.push(top)
    }
  })

  return rows.length
}

test('变体筛选页首次显示当前筛选摘要时不应推挤结果说明位置', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.removeItem('idle-champions-helper.locale')
  })

  await page.goto('./#/variants')
  await expect(page.locator('.variants-page')).toBeVisible()

  const panel = page.locator('.variants-results .results-panel')
  const baselineTop = await panel.evaluate((element) => Math.round((element as HTMLElement).getBoundingClientRect().top))

  await page.getByRole('searchbox', { name: '地图 / 关卡' }).fill('冰风谷')
  await page.getByRole('button', { name: /冰风谷/ }).click()
  await expect(page.locator('.variants-campaign-combobox__current')).toContainText('当前地图：冰风谷')
  await expect(page.getByRole('heading', { level: 3, name: '巨人的祸根旅店' })).toBeVisible()

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
  await expect(page.locator('.page-workbench__toolbar-region--actions').getByText(/命中$/)).toHaveCount(0)

  const actionButtons = page.locator('.page-workbench__toolbar-region--actions .workbench-page__toolbar-action')
  await expect(actionButtons).toHaveCount(3)
  expect(await getToolbarActionRows(actionButtons)).toBe(1)
})

const sharedFilterToolbarCases = [
  { route: './#/illustrations', title: '立绘图鉴' },
  { route: './#/pets', title: '宠物图鉴' },
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
    await expect(page.locator('.page-workbench__toolbar-region--actions').getByText(/命中$/)).toHaveCount(0)

    const actionButtons = page.locator('.page-workbench__toolbar-region--actions .workbench-page__toolbar-action')
    await expect(actionButtons).toHaveCount(3)
    expect(await getToolbarActionRows(actionButtons)).toBe(1)
  })
}

test('变体筛选页应展示默认导航筛选状态，并保持右侧动作单行', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.removeItem('idle-champions-helper.locale')
  })

  await page.setViewportSize({ width: 1180, height: 900 })
  await page.goto('./#/variants')
  await expect(page.locator('.workbench-page__toolbar-title')).toHaveText('变体筛选')
  await expect(page.locator('.workbench-page__toolbar-lead-status')).toContainText('2 项条件')
  await expect(page.locator('.page-workbench__toolbar-region--actions').getByText(/命中$/)).toHaveCount(0)

  const actionButtons = page.locator('.page-workbench__toolbar-region--actions .workbench-page__toolbar-action')
  await expect(actionButtons).toHaveCount(1)
  expect(await getToolbarActionRows(actionButtons)).toBe(1)
})

test('英雄筛选页桌面端收起抽屉后，应完全收起左栏并只保留展开入口', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.removeItem('idle-champions-helper.locale')
  })

  await page.setViewportSize({ width: 1440, height: 960 })
  await page.goto('./#/champions')
  await expect(page.getByRole('button', { name: '收起左侧面板' })).toBeVisible()

  const collapseToggle = page.getByRole('button', { name: '收起左侧面板' })
  const sidebar = page.locator('.page-workbench__sidebar')
  const content = page.locator('.page-workbench__content-shell')
  const workbench = page.locator('.page-workbench')

  // 展开态基线（动画前的确定态）。travel/width/rightGap 均改为首末态读取，
  // 不再用 rAF 在 evaluate 内持续采样——fullyParallel 下 rAF 易被节流导致帧不足
  // （collapseTravel=0）或抓到过渡态 rightGap 峰值（超阈）。
  const expandedSidebarWidth = await getElementWidth(sidebar)
  const expandedContentLeft = await getElementLeft(content)
  const expandedContentWidth = await getElementWidth(content)
  const expandedToggleBox = await collapseToggle.boundingBox()

  expect(expandedSidebarWidth).toBeGreaterThanOrEqual(280)

  await collapseToggle.click()
  await page.waitForTimeout(LAYOUT_TRANSITION_MS)

  const collapsedSidebarWidth = await getElementWidth(sidebar)
  const collapsedContentLeft = await getElementLeft(content)
  const collapsedContentWidth = await getElementWidth(content)
  const workbenchLeft = await getElementLeft(workbench)
  const collapsedRightGap = (await getElementRight(workbench)) - (await getElementRight(content))
  const collapseTravel = expandedContentLeft - collapsedContentLeft

  expect(collapsedSidebarWidth).toBeLessThanOrEqual(2)
  expect(Math.abs(collapsedContentLeft - workbenchLeft)).toBeLessThanOrEqual(10)
  // collapse 后 content 扩展填充原 sidebar 空间（width: calc(100% + sidebar-open-size)，约 +280px）。
  // 原过程采样验证「width 无 transition 渐变」终态无法复现，改为验证扩展量符合 collapse 行为。
  expect(collapsedContentWidth - expandedContentWidth).toBeGreaterThanOrEqual(180)
  expect(collapseTravel).toBeGreaterThanOrEqual(180)
  expect(collapsedRightGap).toBeLessThanOrEqual(12)

  const expandToggle = page.getByRole('button', { name: '展开左侧面板' })
  await expect(expandToggle).toBeVisible()
  const collapsedToggleBox = await expandToggle.boundingBox()

  if (!expandedToggleBox || !collapsedToggleBox) {
    throw new Error('抽屉开合按钮不可见，无法验证锚点是否稳定。')
  }

  expect(Math.abs(expandedToggleBox.x - collapsedToggleBox.x)).toBeLessThanOrEqual(1)
  expect(Math.abs(expandedToggleBox.y - collapsedToggleBox.y)).toBeLessThanOrEqual(1)

  // 展开反向：同样读首末态，不依赖过程采样。
  await expandToggle.click()
  await page.waitForTimeout(LAYOUT_TRANSITION_MS)

  const expandedAgainContentLeft = await getElementLeft(content)
  const expandedAgainRightGap = (await getElementRight(workbench)) - (await getElementRight(content))
  const expandTravel = expandedAgainContentLeft - collapsedContentLeft

  expect(expandTravel).toBeGreaterThanOrEqual(180)
  expect(expandedAgainRightGap).toBeLessThanOrEqual(18)
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
