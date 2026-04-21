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

  const summary = page.getByText(/^当前展示 \d+ \/ \d+ 个变体/)
  const panel = page.locator('.variants-results .results-panel')
  await expect(summary).toBeVisible()
  const baselineTop = await summary.evaluate((element) => Math.round((element as HTMLElement).getBoundingClientRect().top))

  await page.getByRole('combobox').selectOption({ index: 1 })
  await page.waitForTimeout(100)

  const nextTop = await summary.evaluate((element) => Math.round((element as HTMLElement).getBoundingClientRect().top))

  expect(Math.abs(nextTop - baselineTop)).toBeLessThanOrEqual(2)
  await expect(panel).toBeVisible()
})

test('英雄筛选页桌面端应显示统一工作台大壳，并让工具栏左右两段无缝衔接', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.removeItem('idle-champions-helper.locale')
  })

  await page.setViewportSize({ width: 1440, height: 960 })
  await page.goto('./#/champions')
  await expect(page.getByRole('heading', { level: 2, name: '英雄筛选' })).toBeVisible()
  await expect(page.locator('.site-header')).toHaveClass(/site-header--condensed/)

  const workbench = page.locator('.filter-workbench')
  const chromeSidebar = page.locator('.filter-workbench__chrome-sidebar')
  const chromeMain = page.locator('.filter-workbench__chrome-main')

  await expect(workbench).toBeVisible()

  const [sidebarBox, mainBox] = await Promise.all([chromeSidebar.boundingBox(), chromeMain.boundingBox()])

  if (!sidebarBox || !mainBox) {
    throw new Error('工作台工具栏不可见，无法验证合并关系。')
  }

  expect(Math.abs(Math.round(sidebarBox.x + sidebarBox.width) - Math.round(mainBox.x))).toBeLessThanOrEqual(2)
})

test('英雄筛选页桌面端收起抽屉后，左侧边框和空轨道应一起退场', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.removeItem('idle-champions-helper.locale')
  })

  await page.goto('./#/champions')
  await expect(page.getByRole('button', { name: '收起筛选抽屉' })).toBeVisible()

  const toggle = page.getByRole('button', { name: '收起筛选抽屉' })
  const sidebar = page.locator('.filter-workbench__sidebar')
  const content = page.locator('.filter-workbench__content-shell')
  const expandedSidebarWidth = await getElementWidth(sidebar)

  await toggle.click()
  await page.waitForTimeout(220)

  const collapsedSidebarWidth = await getElementWidth(sidebar)
  const contentLeft = await content.evaluate((element) => Math.round((element as HTMLElement).getBoundingClientRect().left))
  const workbenchLeft = await page.locator('.filter-workbench').evaluate((element) => Math.round((element as HTMLElement).getBoundingClientRect().left))

  expect(expandedSidebarWidth).toBeGreaterThanOrEqual(280)
  expect(collapsedSidebarWidth).toBeLessThanOrEqual(1)
  expect(Math.abs(contentLeft - workbenchLeft - 16)).toBeLessThanOrEqual(16)
  await expect(page.getByRole('button', { name: '展开筛选抽屉' })).toBeVisible()
})

test('英雄筛选页超宽屏下仍应放宽到接近六列结果卡', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.removeItem('idle-champions-helper.locale')
  })

  await page.setViewportSize({ width: 2545, height: 1500 })
  await page.goto('./#/champions')
  await expect(page.getByRole('heading', { level: 2, name: '英雄筛选' })).toBeVisible()

  const firstRowCardCount = await getFirstRowCardCount(page.locator('.results-grid .result-card--link'))

  expect(firstRowCardCount).toBeGreaterThanOrEqual(6)
})

test('英雄筛选页移动端宽度下结果区应自然收敛为单列', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.removeItem('idle-champions-helper.locale')
  })

  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('./#/champions')
  await expect(page.getByRole('heading', { level: 2, name: '英雄筛选' })).toBeVisible()

  const firstRowCardCount = await getFirstRowCardCount(page.locator('.results-grid .result-card--link'))

  expect(firstRowCardCount).toBe(1)
})
