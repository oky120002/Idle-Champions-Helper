import { ActionButton } from '../ActionButton'
import { t } from '../../app/i18n-messages'
import { formatSeatLabel } from '../../domain/localizedText'
import type { ChampionVisualWorkbenchModel } from './types'

type ChampionVisualWorkbenchHeaderProps = {
  readonly model: ChampionVisualWorkbenchModel
  readonly onClose: () => void
}

export function ChampionVisualWorkbenchHeader({ model, onClose }: ChampionVisualWorkbenchHeaderProps) {
  const { locale, champion, primaryName, secondaryName, skinCount, visualSlotCount } = model

  return (
    <div className="visual-workbench__header">
      <div className="visual-workbench__copy">
        <p className="visual-workbench__eyebrow">{t(locale, '英雄视觉档案')}</p>
        <div className="visual-workbench__title-row">
          <h3 className="visual-workbench__title">{primaryName}</h3>
          <span className="visual-workbench__seat-chip">{formatSeatLabel(champion.seat, locale)}</span>
        </div>
        {secondaryName != null && secondaryName !== '' ? <p className="visual-workbench__secondary">{secondaryName}</p> : null}
        <p className="visual-workbench__description">
          {t(locale, '已登记 {p0} 个视觉槽位，涵盖本体立绘、头像资源与 {p1} 套皮肤。静态站只展示本地同步头像和基座元数据，不会在浏览器里请求官方资源。', {
            p0: String(visualSlotCount),
            p1: String(skinCount),
          })}
        </p>
      </div>

      <div className="visual-workbench__summary-strip" aria-label={t(locale, '视觉档案概况')}>
        <div className="visual-workbench__summary-pill">
          <span className="visual-workbench__summary-label">{t(locale, '皮肤数')}</span>
          <strong className="visual-workbench__summary-value">{skinCount}</strong>
        </div>
        <div className="visual-workbench__summary-pill">
          <span className="visual-workbench__summary-label">{t(locale, '登记槽位')}</span>
          <strong className="visual-workbench__summary-value">{visualSlotCount}</strong>
        </div>
        <ActionButton tone="ghost" className="visual-workbench__close" onClick={onClose}>
          {t(locale, '收起档案')}
        </ActionButton>
      </div>
    </div>
  )
}
