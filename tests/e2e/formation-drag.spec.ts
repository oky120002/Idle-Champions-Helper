import { expect, test, type Page } from '@playwright/test'
import { unwrap } from '../utils/dom-assertions'

// HTML5 DnD 在 Playwright 下用 mouse 手势不可靠；用 DataTransfer 合成事件确定性测试
// 拖拽接线（dragstart 写 dataTransfer → drop 读 → handleAssignChampion）。
async function drag(page: Page, source: string, target: string) {
  await page.evaluate(
    ({ source, target }) => {
      const sourceEl = document.querySelector(source)
      const targetEl = document.querySelector(target)
      if (!sourceEl || !targetEl) {
        throw new Error(`drag source/target 未找到：${source} → ${target}`)
      }
      const dataTransfer = new DataTransfer()
      sourceEl.dispatchEvent(new DragEvent('dragstart', { dataTransfer, bubbles: true }))
      targetEl.dispatchEvent(new DragEvent('dragover', { dataTransfer, bubbles: true }))
      targetEl.dispatchEvent(new DragEvent('drop', { dataTransfer, bubbles: true }))
    },
    { source, target },
  )
}

test.describe('阵型编辑器拖拽主链路（桌面）', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(async () => {
      window.localStorage.removeItem('idle-champions-helper.locale')
      await new Promise<void>((resolve) => {
        const request = window.indexedDB.deleteDatabase('idle-champions-helper')
        request.onsuccess = () => { resolve(); }
        request.onerror = () => { resolve(); }
        request.onblocked = () => { resolve(); }
      })
    })
    await page.setViewportSize({ width: 1280, height: 900 })
    await page.goto('./#/formation')
    await expect(page.locator('.formation-board')).toBeVisible()
  })

  test('HeroPicker→空槽 放入英雄', async ({ page }) => {
    await page.locator('.hero-picker--source').getByTestId('hero-picker-trigger').click()
    const heroId = await page
      .locator('.hero-picker--source [data-hero-id]:not([data-hero-id=""])')
      .first()
      .getAttribute('data-hero-id')
    expect(heroId).toBeTruthy()

    const firstSlot = await page.locator('[data-slot-id]').first().getAttribute('data-slot-id')
    expect(firstSlot).toBeTruthy()

    await drag(page, `.hero-picker--source [data-hero-id="${unwrap(heroId, 'heroId')}"]`, `[data-slot-id="${unwrap(firstSlot, 'firstSlot')}"]`)

    await expect(page.locator(`[data-slot-id="${unwrap(firstSlot, 'firstSlot')}"]`)).toHaveAttribute('data-hero-id', unwrap(heroId, 'heroId'))
  })

  test('slot→slot 槽位间拖动原子清原 slot', async ({ page }) => {
    await page.locator('.hero-picker--source').getByTestId('hero-picker-trigger').click()
    const heroId = await page
      .locator('.hero-picker--source [data-hero-id]:not([data-hero-id=""])')
      .first()
      .getAttribute('data-hero-id')
    const slots = await page.locator('[data-slot-id]').evaluateAll((els) =>
      els.map((e) => e.getAttribute('data-slot-id')),
    )
    const [slot1, slot2] = slots
    expect(slot1 !== null && slot1 !== undefined && slot2 !== null && slot2 !== undefined).toBeTruthy()

    // 先放入 slot1
    await drag(page, `.hero-picker--source [data-hero-id="${unwrap(heroId, 'heroId')}"]`, `[data-slot-id="${unwrap(slot1, 'slot1')}"]`)
    await expect(page.locator(`[data-slot-id="${unwrap(slot1, 'slot1')}"]`)).toHaveAttribute('data-hero-id', unwrap(heroId, 'heroId'))

    // 拖 slot1 的英雄到 slot2 → slot1 应清空、slot2 接管
    await drag(page, `[data-slot-id="${unwrap(slot1, 'slot1')}"] .formation-slot__summary-badge`, `[data-slot-id="${unwrap(slot2, 'slot2')}"]`)

    await expect(page.locator(`[data-slot-id="${unwrap(slot1, 'slot1')}"]`)).not.toHaveAttribute('data-hero-id')
    await expect(page.locator(`[data-slot-id="${unwrap(slot2, 'slot2')}"]`)).toHaveAttribute('data-hero-id', unwrap(heroId, 'heroId'))
  })

  test('slot→移除区 拖出移除', async ({ page }) => {
    await page.locator('.hero-picker--source').getByTestId('hero-picker-trigger').click()
    const heroId = await page
      .locator('.hero-picker--source [data-hero-id]:not([data-hero-id=""])')
      .first()
      .getAttribute('data-hero-id')
    const firstSlot = await page.locator('[data-slot-id]').first().getAttribute('data-slot-id')

    await drag(page, `.hero-picker--source [data-hero-id="${unwrap(heroId, 'heroId')}"]`, `[data-slot-id="${unwrap(firstSlot, 'firstSlot')}"]`)
    await expect(page.locator(`[data-slot-id="${unwrap(firstSlot, 'firstSlot')}"]`)).toHaveAttribute('data-hero-id', unwrap(heroId, 'heroId'))

    // 拖到移除区 → 该槽清空
    await drag(
      page,
      `[data-slot-id="${unwrap(firstSlot, 'firstSlot')}"] .formation-slot__summary-badge`,
      '[data-testid="formation-remove-zone"]',
    )

    await expect(page.locator(`[data-slot-id="${unwrap(firstSlot, 'firstSlot')}"]`)).not.toHaveAttribute('data-hero-id')
  })
})
