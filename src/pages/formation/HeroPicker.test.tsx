import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { I18nProvider } from '../../app/i18n'
import type { Champion } from '../../domain/types'
import { HeroPicker } from './HeroPicker'

const champions: Champion[] = [
  { id: 'bruenor', name: { original: 'Bruenor', display: '布鲁诺' }, seat: 1, roles: [], affiliations: [], tags: [] },
  { id: 'jim', name: { original: 'Jim', display: '吉姆' }, seat: 2, roles: [], affiliations: [], tags: [] },
  { id: 'celia', name: { original: 'Celia', display: '西莉亚' }, seat: 1, roles: [], affiliations: [], tags: [] },
]

describe('HeroPicker', () => {
  it('打开面板后按 seat 分组列出英雄（复用 formatSeatLabel）', async () => {
    const user = userEvent.setup()
    render(
      <I18nProvider>
        <HeroPicker champions={champions} value="" onChange={() => {}} />
      </I18nProvider>,
    )

    await user.click(screen.getByTestId('hero-picker-trigger'))

    expect(screen.getByTestId('hero-picker-panel')).toBeInTheDocument()
    // 默认 zh-CN → formatSeatLabel 输出「N 号位」，与 FormationMobileEditor 一致。
    expect(screen.getByText('1 号位')).toBeInTheDocument()
    expect(screen.getByText('2 号位')).toBeInTheDocument()
    expect(screen.getByText('布鲁诺')).toBeInTheDocument()
    expect(screen.getByText('西莉亚')).toBeInTheDocument()
    expect(screen.getByText('吉姆')).toBeInTheDocument()
  })

  it('搜索过滤英雄', async () => {
    const user = userEvent.setup()
    render(
      <I18nProvider>
        <HeroPicker champions={champions} value="" onChange={() => {}} />
      </I18nProvider>,
    )

    await user.click(screen.getByTestId('hero-picker-trigger'))
    await user.type(screen.getByTestId('hero-picker-search'), '吉姆')

    expect(screen.getByText('吉姆')).toBeInTheDocument()
    expect(screen.queryByText('布鲁诺')).toBeNull()
  })

  it('点击英雄触发 onChange 并关闭面板', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(
      <I18nProvider>
        <HeroPicker champions={champions} value="" onChange={onChange} />
      </I18nProvider>,
    )

    await user.click(screen.getByTestId('hero-picker-trigger'))
    await user.click(screen.getByText('吉姆'))

    expect(onChange).toHaveBeenCalledWith('jim')
    expect(screen.queryByTestId('hero-picker-panel')).toBeNull()
  })

  it('picker 模式英雄卡为 button（可点击选择），不可拖', async () => {
    const user = userEvent.setup()
    render(
      <I18nProvider>
        <HeroPicker champions={champions} value="" onChange={() => {}} />
      </I18nProvider>,
    )

    await user.click(screen.getByTestId('hero-picker-trigger'))
    const jimCard = screen.getByText('吉姆').closest('button')!

    expect(jimCard).toHaveAttribute('data-hero-id', 'jim')
    expect(jimCard).not.toHaveAttribute('draggable')
  })

  it('trigger 的 aria-expanded 随面板开关切换', async () => {
    const user = userEvent.setup()
    render(
      <I18nProvider>
        <HeroPicker champions={champions} value="" onChange={() => {}} />
      </I18nProvider>,
    )

    const trigger = screen.getByTestId('hero-picker-trigger')
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    await user.click(trigger)
    expect(trigger).toHaveAttribute('aria-expanded', 'true')
  })

  it('按 Esc 关闭面板', async () => {
    const user = userEvent.setup()
    render(
      <I18nProvider>
        <HeroPicker champions={champions} value="" onChange={() => {}} />
      </I18nProvider>,
    )

    await user.click(screen.getByTestId('hero-picker-trigger'))
    expect(screen.getByTestId('hero-picker-panel')).toBeInTheDocument()

    await user.keyboard('{Escape}')

    expect(screen.queryByTestId('hero-picker-panel')).toBeNull()
  })

  it('点击面板外部关闭', async () => {
    const user = userEvent.setup()
    render(
      <I18nProvider>
        <HeroPicker champions={champions} value="" onChange={() => {}} />
      </I18nProvider>,
    )

    await user.click(screen.getByTestId('hero-picker-trigger'))
    expect(screen.getByTestId('hero-picker-panel')).toBeInTheDocument()

    // 模拟在面板外部触发 pointerdown（复用 ChampionRosterFlyout 的外击模式）。
    fireEvent.pointerDown(document.body)

    expect(screen.queryByTestId('hero-picker-panel')).toBeNull()
  })

  it('拖拽源模式（不传 onChange）：trigger 显示拖拽提示、不渲染未放置、英雄卡为 div 且 draggable', async () => {
    const user = userEvent.setup()
    render(
      <I18nProvider>
        <HeroPicker champions={champions} />
      </I18nProvider>,
    )

    expect(screen.getByTestId('hero-picker-trigger')).toHaveTextContent('拖拽英雄到槽位')

    await user.click(screen.getByTestId('hero-picker-trigger'))

    expect(screen.queryByText('未放置')).toBeNull()
    // jsdom 不实现 DataTransfer，无法验证 dataTransfer 写入；仅校验英雄卡为 div + draggable + data-hero-id。
    const jimCard = screen.getByText('吉姆').closest('div')!
    expect(jimCard).toHaveAttribute('draggable', 'true')
    expect(jimCard).toHaveAttribute('data-hero-id', 'jim')
  })
})
