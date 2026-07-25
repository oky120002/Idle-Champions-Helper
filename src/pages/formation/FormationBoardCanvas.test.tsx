import { createEvent, fireEvent, render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { I18nProvider } from '../../app/i18n'
import type { Champion, FormationSlot } from '../../domain/types'
import { FormationBoardCanvas } from './FormationBoardCanvas'

const slots: FormationSlot[] = [
  { id: 'slot-a', row: 1, column: 1 },
  { id: 'slot-b', row: 1, column: 2 },
]

const bruenor: Champion = {
  id: 'bruenor',
  name: { original: 'Bruenor', display: '布鲁诺' },
  seat: 7,
  roles: [],
  affiliations: [],
  tags: [],
}

const championById = new Map<string, Champion>([['bruenor', bruenor]])

function renderCanvas(overrides: Partial<React.ComponentProps<typeof FormationBoardCanvas>> = {}) {
  return render(
    <I18nProvider>
      <FormationBoardCanvas
        slots={slots}
        placements={{ 'slot-a': 'bruenor' }}
        championById={championById}
        {...overrides}
      />
    </I18nProvider>,
  )
}

describe('FormationBoardCanvas', () => {
  it('渲染所有槽位', () => {
    const { container } = renderCanvas()

    expect(container.querySelector('[data-slot-id="slot-a"]')).not.toBeNull()
    expect(container.querySelector('[data-slot-id="slot-b"]')).not.toBeNull()
  })

  it('已放置槽位标记英雄 id，空槽位不标记', () => {
    const { container } = renderCanvas()

    expect(container.querySelector('[data-slot-id="slot-a"][data-hero-id="bruenor"]')).not.toBeNull()
    expect(container.querySelector('[data-slot-id="slot-b"][data-hero-id]')).toBeNull()
  })

  it('已放置槽位显示 seat', () => {
    const { container } = renderCanvas()

    expect(container.querySelector('[data-slot-id="slot-a"] .formation-slot__summary-seat')?.textContent).toBe('7')
  })

  it('命中 carrySlotId 的槽位加 carry 修饰与标记', () => {
    const { container } = renderCanvas({ carrySlotId: 'slot-a' })

    expect(container.querySelector('[data-slot-id="slot-a"].formation-slot--carry')).not.toBeNull()
    expect(container.querySelector('[data-slot-id="slot-a"][data-carry="true"]')).not.toBeNull()
    expect(container.querySelector('[data-slot-id="slot-a"] .formation-slot__carry-mark')).not.toBeNull()
  })

  it('未指定 carrySlotId 时不加 carry 标记', () => {
    const { container } = renderCanvas()

    expect(container.querySelector('.formation-slot--carry')).toBeNull()
    expect(container.querySelector('.formation-slot__carry-mark')).toBeNull()
  })

  it('调用方经 slotExtras 注入额外交互控件', () => {
    const { getByTestId } = renderCanvas({
      slotExtras: (slot) => <button type="button" data-testid={`extra-${slot.id}`} />,
    })

    expect(getByTestId('extra-slot-a')).toBeInTheDocument()
    expect(getByTestId('extra-slot-b')).toBeInTheDocument()
  })

  it('调用方经 slotClassName 追加状态修饰', () => {
    const { container } = renderCanvas({
      slotClassName: (slot) => (slot.id === 'slot-b' ? 'formation-slot--active' : undefined),
    })

    expect(container.querySelector('[data-slot-id="slot-b"].formation-slot--active')).not.toBeNull()
  })

  it('传入 onSlotDrop 时 drop 被 preventDefault 且触发回调', () => {
    const onSlotDrop = vi.fn()
    const { container } = renderCanvas({ onSlotDrop })
    const slot = container.querySelector('[data-slot-id="slot-a"]')!
    const event = createEvent.drop(slot)

    fireEvent(slot, event)

    expect(event.defaultPrevented).toBe(true)
    expect(onSlotDrop).toHaveBeenCalledWith('slot-a', expect.anything())
  })

  it('未传 onSlotDrop 时只读棋盘不拦截 drop（planner 结果卡片不应成为 drop 目标）', () => {
    const { container } = renderCanvas()
    const slot = container.querySelector('[data-slot-id="slot-a"]')!
    const event = createEvent.drop(slot)

    fireEvent(slot, event)

    expect(event.defaultPrevented).toBe(false)
  })
})
