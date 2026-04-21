import { expect, test, type Locator, type Page } from '@playwright/test'

async function getScrollY(page: Page): Promise<number> {
  return page.evaluate(() => Math.round(window.scrollY))
}

async function getViewportTop(locator: Locator): Promise<number> {
  const box = await locator.boundingBox()

  if (!box) {
    throw new Error('目标元素不可见，无法读取位置。')
  }

  return Math.round(box.y)
}

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

async function getRelativeViewportTop(locator: Locator, container: Locator): Promise<number> {
  const [box, containerBox] = await Promise.all([locator.boundingBox(), container.boundingBox()])

  if (!box || !containerBox) {
    throw new Error('目标元素不可见，无法读取相对位置。')
  }

  return Math.round(box.y - containerBox.y)
}

async function getRelativeInsets(
  locator: Locator,
  container: Locator,
): Promise<{ top: number; right: number; bottom: number; left: number }> {
  const [box, containerBox] = await Promise.all([locator.boundingBox(), container.boundingBox()])

  if (!box || !containerBox) {
    throw new Error('目标元素不可见，无法读取相对边距。')
  }

  return {
    top: Math.round((box.y - containerBox.y) * 10) / 10,
    right: Math.round((containerBox.x + containerBox.width - box.x - box.width) * 10) / 10,
    bottom: Math.round((containerBox.y + containerBox.height - box.y - box.height) * 10) / 10,
    left: Math.round((box.x - containerBox.x) * 10) / 10,
  }
}

async function scrollWindowInstantly(page: Page, top: number): Promise<void> {
  await page.evaluate((targetTop) => {
    window.scrollTo({ top: targetTop, behavior: 'instant' })
    window.dispatchEvent(new Event('scroll'))
  }, top)
}

test('英雄筛选页首次显示当前筛选摘要时不应推挤结果说明位置', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.removeItem('idle-champions-helper.locale')
  })

  await page.goto('./#/champions')
  await expect(page.locator('.page-tab-header').getByText('英雄筛选', { exact: true })).toBeVisible()
  await expect(page.locator('.filter-group').first().getByRole('button', { name: '1 号位', exact: true })).toBeVisible()

  await scrollWindowInstantly(page, 320)
  await page.waitForTimeout(100)

  const baselineScrollY = await getScrollY(page)
  const summary = page.getByText(/^当前展示 \d+ \/ \d+ 名英雄/)
  const workspace = page.locator('.champions-workspace')
  const baselineTop = await getRelativeViewportTop(summary, workspace)

  await page.locator('.filter-group').first().getByRole('button', { name: '1 号位', exact: true }).click()
  await page.waitForTimeout(100)

  expect(Math.abs((await getScrollY(page)) - baselineScrollY)).toBeLessThanOrEqual(2)
  expect(Math.abs((await getRelativeViewportTop(summary, workspace)) - baselineTop)).toBeLessThanOrEqual(2)
})

test('变体筛选页首次显示当前筛选摘要时不应推挤结果说明位置', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.removeItem('idle-champions-helper.locale')
  })

  await page.goto('./#/variants')
  await expect(page.locator('.page-tab-header').getByText('变体筛选', { exact: true })).toBeVisible()

  await scrollWindowInstantly(page, 320)
  await page.waitForTimeout(100)

  const baselineScrollY = await getScrollY(page)
  const summary = page.getByText(/^当前展示 \d+ \/ \d+ 个变体/)
  const panel = page.locator('.variants-results .results-panel')
  const baselineTop = await getRelativeViewportTop(summary, panel)

  await page.getByRole('combobox').selectOption({ index: 1 })
  await page.waitForTimeout(100)

  expect(Math.abs((await getScrollY(page)) - baselineScrollY)).toBeLessThanOrEqual(2)
  expect(Math.abs((await getRelativeViewportTop(summary, panel)) - baselineTop)).toBeLessThanOrEqual(2)
})

test('英雄筛选页桌面宽度下的筛选区应保持粘性，减少视线往返', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.removeItem('idle-champions-helper.locale')
  })

  await page.goto('./#/champions')
  await expect(page.locator('.page-tab-header').getByText('英雄筛选', { exact: true })).toBeVisible()
  await expect(page.locator('.filter-group').first().getByRole('button', { name: '1 号位', exact: true })).toBeVisible()

  const stickyPanel = page.locator('.champions-workspace .filter-workspace__sidebar-sticky')

  await scrollWindowInstantly(page, 720)
  await page.waitForTimeout(100)
  const firstTop = await getViewportTop(stickyPanel)

  await scrollWindowInstantly(page, 1320)
  await page.waitForTimeout(100)
  const secondTop = await getViewportTop(stickyPanel)

  expect(firstTop).toBeGreaterThan(0)
  expect(Math.abs(secondTop - firstTop)).toBeLessThanOrEqual(6)
})

test('英雄筛选页桌面宽度下的筛选工具条应独立于抽屉体，不与滚动面板重叠', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.removeItem('idle-champions-helper.locale')
  })

  await page.goto('./#/champions')
  await expect(page.locator('.page-tab-header').getByText('英雄筛选', { exact: true })).toBeVisible()
  await expect(page.locator('.filter-group').first().getByRole('button', { name: '1 号位', exact: true })).toBeVisible()

  const toggle = page.locator('.champions-workspace .filter-workspace__toggle')
  const panel = page.locator('.champions-workspace .filter-sidebar-panel')
  const [toggleBox, panelBox] = await Promise.all([toggle.boundingBox(), panel.boundingBox()])

  if (!toggleBox || !panelBox) {
    throw new Error('侧栏开关或筛选面板不可见，无法验证布局关系。')
  }

  expect(Math.round(toggleBox.y + toggleBox.height)).toBeLessThanOrEqual(Math.round(panelBox.y - 4))
})

test('英雄筛选页桌面宽度下收起筛选抽屉后，左栏应完全让出结果宽度', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.removeItem('idle-champions-helper.locale')
  })

  await page.goto('./#/champions')
  await expect(page.locator('.page-tab-header').getByText('英雄筛选', { exact: true })).toBeVisible()
  await expect(page.locator('.filter-group').first().getByRole('button', { name: '1 号位', exact: true })).toBeVisible()

  const toggle = page.locator('.champions-workspace .filter-workspace__toggle')
  const layout = page.locator('.champions-workspace .filter-workspace__layout')
  const sidebar = page.locator('.champions-workspace .filter-workspace__sidebar')
  const content = page.locator('.champions-workspace .filter-workspace__content')

  await toggle.click()
  await page.waitForTimeout(220)

  const [layoutBox, sidebarBox, contentBox] = await Promise.all([
    layout.boundingBox(),
    sidebar.boundingBox(),
    content.boundingBox(),
  ])

  if (!layoutBox || !sidebarBox || !contentBox) {
    throw new Error('布局节点不可见，无法验证桌面抽屉收起后的宽度释放。')
  }

  expect(Math.round(sidebarBox.width)).toBeLessThanOrEqual(1)
  expect(Math.abs(Math.round(contentBox.x) - Math.round(layoutBox.x))).toBeLessThanOrEqual(6)
})

test('英雄筛选页桌面宽度下主内容区应更舒展，不再过窄', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.removeItem('idle-champions-helper.locale')
  })

  await page.setViewportSize({ width: 1600, height: 1200 })
  await page.goto('./#/champions')
  await expect(page.locator('.page-tab-header').getByText('英雄筛选', { exact: true })).toBeVisible()

  const mainWidth = await page.locator('.site-main').evaluate((element) => {
    if (!(element instanceof HTMLElement)) {
      throw new Error('主内容区节点不存在。')
    }

    return Math.round(element.getBoundingClientRect().width)
  })

  expect(mainWidth).toBeGreaterThanOrEqual(1520)
})

test('英雄筛选页结果卡头像在桌面宽度下应明显内收，不贴住右上角', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.removeItem('idle-champions-helper.locale')
  })

  await page.setViewportSize({ width: 1146, height: 1038 })
  await page.goto('./#/champions')
  await expect(page.locator('.page-tab-header').getByText('英雄筛选', { exact: true })).toBeVisible()
  await expect(page.getByText(/^当前展示 \d+ \/ \d+ 名英雄/)).toBeVisible()

  const firstCard = page.locator('.result-card--champion').first()
  const avatar = firstCard.locator('.champion-avatar--spotlight')
  const insets = await getRelativeInsets(avatar, firstCard)

  expect(insets.right).toBeGreaterThanOrEqual(10)
  expect(insets.top - insets.right).toBeLessThanOrEqual(10)
})

test('英雄筛选页超宽屏下应放宽到接近六列结果卡', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.removeItem('idle-champions-helper.locale')
  })

  await page.setViewportSize({ width: 2545, height: 1500 })
  await page.goto('./#/champions')
  await expect(page.locator('.page-tab-header').getByText('英雄筛选', { exact: true })).toBeVisible()
  await expect(page.getByText(/^当前展示 \d+ \/ \d+ 名英雄/)).toBeVisible()

  const mainWidth = await page.locator('.site-main').evaluate((element) => {
    if (!(element instanceof HTMLElement)) {
      throw new Error('主内容区节点不存在。')
    }

    return Math.round(element.getBoundingClientRect().width)
  })

  const firstRowCardCount = await getFirstRowCardCount(page.locator('.results-grid .result-card--link'))

  expect(mainWidth).toBeGreaterThanOrEqual(2180)
  expect(firstRowCardCount).toBeGreaterThanOrEqual(6)
})

test('英雄筛选页移动端宽度下结果区应自然收敛为单列', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.removeItem('idle-champions-helper.locale')
  })

  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('./#/champions')
  await expect(page.locator('.page-tab-header').getByText('英雄筛选', { exact: true })).toBeVisible()
  await expect(page.getByText(/^当前展示 \d+ \/ \d+ 名英雄/)).toBeVisible()

  const firstRowCardCount = await getFirstRowCardCount(page.locator('.results-grid .result-card--link'))

  expect(firstRowCardCount).toBe(1)
})
