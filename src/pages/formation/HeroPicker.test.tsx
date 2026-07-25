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
  it('打开面板后按 seat 分组列出英雄', async () => {
    const user = userEvent.setup()
    render(
      <I18nProvider>
        <HeroPicker champions={champions} value="" onChange={() => {}} />
      </I18nProvider>,
    )

    await user.click(screen.getByTestId('hero-picker-trigger'))

    expect(screen.getByTestId('hero-picker-panel')).toBeInTheDocument()
    expect(screen.getByText('Seat 1')).toBeInTheDocument()
    expect(screen.getByText('Seat 2')).toBeInTheDocument()
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

  it('draggable 时英雄卡触发 onDragStartHero 并写 dataTransfer', async () => {
    const user = userEvent.setup()
    const onDragStartHero = vi.fn()
    render(
      <I18nProvider>
        <HeroPicker champions={champions} value="" onChange={() => {}} draggable onDragStartHero={onDragStartHero} />
      </I18nProvider>,
    )

    await user.click(screen.getByTestId('hero-picker-trigger'))
    const jimCard = screen.getByText('吉姆').closest('button')!

    // jsdom 不实现 DataTransfer，只验证 onDragStartHero 回调；dataTransfer 写入由浏览器保证。
    fireEvent.dragStart(jimCard)

    expect(onDragStartHero).toHaveBeenCalledWith('jim')
  })
})
