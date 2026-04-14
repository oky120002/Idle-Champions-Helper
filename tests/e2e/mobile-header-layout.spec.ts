import { expect, test } from '@playwright/test'

test('移动端顶部导航应压缩为单行横滑，避免长期遮挡大部分页面内容', async ({ page }) => {
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

  const navMetrics = await page.locator('.site-nav').evaluate((element) => {
    if (!(element instanceof HTMLElement)) {
      throw new Error('导航容器不存在。')
    }

    const style = window.getComputedStyle(element)

    return {
      clientWidth: Math.round(element.clientWidth),
      scrollWidth: Math.round(element.scrollWidth),
      overflowX: style.overflowX,
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

  const titleHeight = await page.locator('.site-title').evaluate((element) => {
    if (!(element instanceof HTMLElement)) {
      throw new Error('站点标题不存在。')
    }

    return Math.round(element.getBoundingClientRect().height)
  })

  expect(headerMetrics.top).toBe(0)
  expect(headerMetrics.height).toBeLessThanOrEqual(180)
  expect(titleHeight).toBeLessThanOrEqual(28)
  expect(Math.max(...navLinkTops) - Math.min(...navLinkTops)).toBeLessThanOrEqual(4)
  expect(navMetrics.overflowX).toBe('auto')
  expect(navMetrics.scrollWidth).toBeGreaterThan(navMetrics.clientWidth)
})
