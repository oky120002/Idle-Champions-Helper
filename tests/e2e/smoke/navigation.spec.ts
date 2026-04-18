import { readFileSync } from 'node:fs'
import { expect, test } from '@playwright/test'

const versionMeta = JSON.parse(
  readFileSync(new URL('../../../public/data/version.json', import.meta.url), 'utf8'),
) as { current: string; updatedAt: string }

test('GitHub Pages 基线路径下可以完成主页与个人数据 smoke 回归', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.removeItem('idle-champions-helper.locale')
  })

  await page.goto('.')

  await expect(page.getByRole('heading', { level: 1, name: '个人成长决策台' })).toBeVisible()
  await expect(page.getByText(`公共数据 ${versionMeta.current}`)).toBeVisible()
  await expect(page.getByText(`采集 ${versionMeta.updatedAt}`)).toBeVisible()

  await page.getByRole('link', { name: '个人数据' }).click()
  await expect(page.getByRole('heading', { level: 2, name: '在本地解析账号凭证并检查导入条件' })).toBeVisible()

  await page.getByRole('button', { name: '填入脱敏示例' }).click()
  await page.getByRole('button', { name: '读取并校验' }).click()

  await expect(page.getByText('已在本地解析出一组合法凭证，当前页面仅展示脱敏结果，不会自动保存。')).toBeVisible()
  await expect(page.getByText('12***89')).toBeVisible()
  await expect(page.getByText('abcdef***7890')).toBeVisible()
})
