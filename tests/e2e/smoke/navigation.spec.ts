import { expect, test } from '@playwright/test'

test('GitHub Pages 基线路径下可以完成主页与个人数据 smoke 回归', async ({ page }) => {
  await page.goto('.')

  await expect(page.getByRole('heading', { level: 1, name: '个人成长决策台' })).toBeVisible()
  await expect(page.getByText('v1 · 2026-04-13')).toBeVisible()

  await page.getByRole('link', { name: '个人数据' }).click()
  await expect(page.getByRole('heading', { level: 2, name: '先把本地导入链路和安全边界立住' })).toBeVisible()

  await page.getByRole('button', { name: '填入脱敏示例' }).click()
  await page.getByRole('button', { name: '读取并校验' }).click()

  await expect(page.getByText('已在本地解析出一组合法凭证，当前页面仅展示脱敏结果，不会自动保存。')).toBeVisible()
  await expect(page.getByText('12***89')).toBeVisible()
  await expect(page.getByText('abcdef***7890')).toBeVisible()
})
