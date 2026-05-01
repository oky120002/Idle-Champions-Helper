import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Link2 } from 'lucide-react'
import { describe, expect, it, vi } from 'vitest'
import { I18nProvider } from '../../src/app/i18n'
import { ConfiguredWorkbenchPage } from '../../src/components/workbench/ConfiguredWorkbenchPage'

describe('ConfiguredWorkbenchPage', () => {
  it('根据配置渲染标准 workbench chrome', async () => {
    const user = userEvent.setup()
    const onCopy = vi.fn()
    const onScrollToTop = vi.fn()

    render(
      <I18nProvider>
        <ConfiguredWorkbenchPage
          pageClassName="configured-workbench"
          storageKey="configured-workbench"
          ariaLabel="标准工作台"
          shellClassName="configured-workbench__shell"
          floatingTopButton={{
            onClick: onScrollToTop,
            detailLabel: '内容区',
          }}
          toolbar={{
            lead: {
              kind: 'mark',
              label: 'PRESETS',
              accentTone: 'steel',
            },
            primary: {
              kind: 'copy',
              kicker: '归档工作台',
              title: '方案存档',
              detail: '统一查看、恢复和整理本地命名阵型方案',
            },
            actions: {
              kind: 'items',
              items: [
                {
                  id: 'badge',
                  kind: 'badge',
                  label: '12 条方案',
                },
                {
                  id: 'share',
                  kind: 'button',
                  label: '',
                  title: '复制当前页面链接',
                  tone: 'share',
                  state: 'idle',
                  icon: <Link2 aria-hidden="true" strokeWidth={2.2} />,
                  onClick: onCopy,
                },
              ],
            },
          }}
        >
          <div>内容区</div>
        </ConfiguredWorkbenchPage>
      </I18nProvider>,
    )

    expect(screen.getByText('PRESETS')).toBeInTheDocument()
    expect(screen.getByText('方案存档')).toBeInTheDocument()
    expect(screen.getByText('12 条方案')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '复制当前页面链接' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '返回顶部' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '复制当前页面链接' }))
    await user.click(screen.getByRole('button', { name: '返回顶部' }))

    expect(onCopy).toHaveBeenCalledTimes(1)
    expect(onScrollToTop).toHaveBeenCalledTimes(1)
  })
})
