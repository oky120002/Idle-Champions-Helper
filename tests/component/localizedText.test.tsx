import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { I18nProvider, useI18n } from '../../src/app/i18n'
import { LocalizedText } from '../../src/components/LocalizedText'
import type { LocalizedText as LocalizedTextValue } from '../../src/domain/types'

const briv: LocalizedTextValue = {
  original: 'Briv',
  display: '布里夫',
}

function renderWithI18n(node: ReactNode) {
  return render(<I18nProvider>{node}</I18nProvider>)
}

function LocaleSwitchHarness() {
  const { setLocale } = useI18n()

  return (
    <>
      <button type="button" onClick={() => setLocale('en-US')}>
        切换到英文
      </button>
      <LocalizedText
        text={briv}
        mode="stacked"
        as="div"
        className="localized-block"
        primaryAs="strong"
        primaryClassName="localized-block__primary"
        secondaryAs="small"
        secondaryClassName="localized-block__secondary"
      />
    </>
  )
}

function PrimaryModeHarness() {
  const { setLocale } = useI18n()

  return (
    <>
      <button type="button" onClick={() => setLocale('en-US')}>
        切到英文主文本
      </button>
      <LocalizedText text={briv} mode="primary" as="span" className="localized-primary" />
    </>
  )
}

describe('LocalizedText', () => {
  it('默认按中文界面渲染主副文本块', () => {
    const { container } = renderWithI18n(
      <LocalizedText
        text={briv}
        mode="stacked"
        as="div"
        className="localized-block"
        primaryAs="h3"
        primaryClassName="localized-block__primary"
        secondaryAs="p"
        secondaryClassName="localized-block__secondary"
      />,
    )

    expect(container.querySelector('.localized-block')).toBeInTheDocument()
    expect(container.querySelector('h3.localized-block__primary')).toHaveTextContent('布里夫')
    expect(container.querySelector('p.localized-block__secondary')).toHaveTextContent('Briv')
  })

  it('切换到英文后会自动反转主副文本', async () => {
    const user = userEvent.setup()
    const { container } = renderWithI18n(<LocaleSwitchHarness />)

    await user.click(screen.getByRole('button', { name: '切换到英文' }))

    expect(container.querySelector('.localized-block__primary')).toHaveTextContent('Briv')
    expect(container.querySelector('.localized-block__secondary')).toHaveTextContent('布里夫')
  })

  it('pair 模式支持自定义包装元素和分隔符', () => {
    const { container } = renderWithI18n(
      <LocalizedText text={briv} mode="pair" as="p" className="localized-inline" separator=" / " />,
    )

    expect(container.querySelector('p.localized-inline')).toHaveTextContent('布里夫 / Briv')
  })

  it('primary 模式只渲染当前语言主文本', async () => {
    const user = userEvent.setup()
    const { container } = renderWithI18n(<PrimaryModeHarness />)

    await user.click(screen.getByRole('button', { name: '切到英文主文本' }))

    expect(container.querySelector('span.localized-primary')).toHaveTextContent('Briv')
    expect(screen.queryByText('布里夫')).not.toBeInTheDocument()
  })

  it('原文和展示名相同时会省略副文本节点', () => {
    const { container } = renderWithI18n(
      <LocalizedText
        text={{ original: 'Lae\'zel', display: 'Lae\'zel' }}
        mode="stacked"
        as="div"
        primaryAs="span"
        secondaryAs="small"
        secondaryClassName="localized-block__secondary"
      />,
    )

    expect(container.querySelector('.localized-block__secondary')).not.toBeInTheDocument()
  })
})
