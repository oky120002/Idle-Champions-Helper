import { expect, test, type Page } from '@playwright/test'

async function getDocumentHorizontalOverflow(page: Page): Promise<number> {
  return page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
}

test('移动端阵型页应以无横滑棋盘配合槽位编辑卡完成编辑', async ({ page }) => {
  await page.addInitScript(async () => {
    window.localStorage.removeItem('idle-champions-helper.locale')

    await new Promise<void>((resolve) => {
      const request = window.indexedDB.deleteDatabase('idle-champions-helper')

      request.onsuccess = () => resolve()
      request.onerror = () => resolve()
      request.onblocked = () => resolve()
    })
  })

  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('./#/formation')
  await expect(page.locator('.page-tab-header').getByText('阵型编辑', { exact: true })).toBeVisible()
  await expect(page.getByTestId('formation-mobile-editor')).toBeVisible()

  const boardMetrics = await page.locator('.formation-board').evaluate((element) => {
    if (!(element instanceof HTMLElement)) {
      throw new Error('阵型棋盘不存在。')
    }

    return {
      clientWidth: Math.round(element.clientWidth),
      scrollWidth: Math.round(element.scrollWidth),
    }
  })

  expect(boardMetrics.scrollWidth - boardMetrics.clientWidth).toBeLessThanOrEqual(1)
  expect(await getDocumentHorizontalOverflow(page)).toBeLessThanOrEqual(1)

  const firstSlot = page.locator('[data-testid^="formation-mobile-slot-"]').first()
  await expect(firstSlot).toHaveAttribute('aria-pressed', 'true')

  await page.getByTestId('formation-mobile-slot-select').selectOption({ index: 0 })

  const initialEditorText = (await page.getByTestId('formation-mobile-current-name').textContent())?.trim() ?? ''

  await page.getByTestId('formation-mobile-slot-select').selectOption({ index: 1 })

  const updatedEditorText = (await page.getByTestId('formation-mobile-current-name').textContent())?.trim() ?? ''
  expect(updatedEditorText).not.toBe('')
  expect(updatedEditorText).not.toBe(initialEditorText)

  const secondSlot = page.locator('[data-testid^="formation-mobile-slot-"]').nth(1)
  await secondSlot.click()
  await expect(secondSlot).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByTestId('formation-mobile-editor-slot')).not.toHaveText('槽位 1')
  expect(await getDocumentHorizontalOverflow(page)).toBeLessThanOrEqual(1)
})
