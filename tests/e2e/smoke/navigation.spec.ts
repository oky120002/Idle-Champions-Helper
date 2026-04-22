import { expect, test } from '@playwright/test'

test('GitHub Pages 基线路径下可以完成主页与个人数据 smoke 回归', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.removeItem('idle-champions-helper.locale')
  })

  await page.goto('.')

  await expect(page.locator('.workbench-page__toolbar-title')).toHaveText('英雄筛选')
  await expect(page.getByRole('button', { name: '显示全部' })).toBeVisible()

  await page.getByRole('link', { name: '个人数据' }).click()
  await expect(page.locator('.workbench-page__toolbar-title')).toHaveText('个人数据')

  const supportUrlInput = page.getByRole('textbox', { name: /Support URL/ })

  await page.getByRole('button', { name: '填入脱敏示例' }).click()
  await expect(supportUrlInput).toHaveValue(/user_id=/)
  await page.getByRole('button', { name: '读取并校验' }).click()

  await expect(page.getByText('已在本地解析出一组合法凭证，当前页面仅展示脱敏结果，不会自动保存。')).toBeVisible()
  await expect(page.getByText('12***89')).toBeVisible()
  await expect(page.getByText('abcdef***7890')).toBeVisible()
})
