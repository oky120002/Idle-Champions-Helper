import type { ReactNode } from 'react'
import { useI18n } from '../app/i18n'
import { useDataVersionState } from '../data/useDataVersionState'

interface PageTabHeaderProps {
  eyebrow?: string
  accentLabel: string
  title: string
  aside?: ReactNode
  layout?: 'default' | 'headline'
}

export function PageTabHeader({
  eyebrow,
  accentLabel,
  title,
  aside,
  layout = 'default',
}: PageTabHeaderProps) {
  const { locale } = useI18n()
  const versionState = useDataVersionState()

  return (
    <div className={layout === 'headline' ? 'page-tab-header page-tab-header--headline' : 'page-tab-header'}>
      <div className="page-tab-header__topline">
        <div className="page-tab-header__signals">
          <p className={eyebrow ? 'page-tab-header__eyebrow' : 'page-tab-header__eyebrow page-tab-header__eyebrow--accent-only'}>
            {eyebrow ? <span className="page-tab-header__eyebrow-label">{eyebrow}</span> : null}
            <span className="page-tab-header__eyebrow-accent">{accentLabel}</span>
          </p>
          {versionState.status === 'ready' ? (
            <div className="page-tab-header__meta" aria-label={locale === 'zh-CN' ? '公共数据版本' : 'Public data version'}>
              <span className="page-tab-header__meta-pill">
                {locale === 'zh-CN' ? `公共数据 ${versionState.data.current}` : `Data ${versionState.data.current}`}
              </span>
              <span className="page-tab-header__meta-text">
                {locale === 'zh-CN'
                  ? `采集 ${versionState.data.updatedAt}`
                  : `Collected ${versionState.data.updatedAt}`}
              </span>
            </div>
          ) : null}
        </div>
      </div>
      <div className="page-tab-header__body">
        <div className="page-tab-header__copy">
          <h2 className="page-tab-header__title">{title}</h2>
        </div>
        {aside ? <div className="page-tab-header__aside">{aside}</div> : null}
      </div>
    </div>
  )
}
