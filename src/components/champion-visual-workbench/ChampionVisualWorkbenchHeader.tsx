import { ActionButton } from '../ActionButton'
import { pickLocaleText } from '../../app/i18n'
import { formatSeatLabel } from '../../domain/localizedText'
import type { ChampionVisualWorkbenchModel } from './types'

type ChampionVisualWorkbenchHeaderProps = {
  model: ChampionVisualWorkbenchModel
  onClose: () => void
}

export function ChampionVisualWorkbenchHeader({ model, onClose }: ChampionVisualWorkbenchHeaderProps) {
  const { locale, champion, primaryName, secondaryName, skinCount, visualSlotCount } = model

  return (
    <div className="visual-workbench__header">
      <div className="visual-workbench__copy">
        <p className="visual-workbench__eyebrow">{pickLocaleText(locale, { zh: '英雄视觉档案', en: 'Champion visual dossier' })}</p>
        <div className="visual-workbench__title-row">
          <h3 className="visual-workbench__title">{primaryName}</h3>
          <span className="visual-workbench__seat-chip">{formatSeatLabel(champion.seat, locale)}</span>
        </div>
        {secondaryName ? <p className="visual-workbench__secondary">{secondaryName}</p> : null}
        <p className="visual-workbench__description">
          {pickLocaleText(locale, {
            zh: `已登记 ${visualSlotCount} 个视觉槽位，涵盖本体立绘、头像资源与 ${skinCount} 套皮肤。静态站只展示本地同步头像和基座元数据，不会在浏览器里请求官方资源。`,
            en: `The catalog currently tracks ${visualSlotCount} visual slots across base art, portraits, and ${skinCount} skin sets. The static site only shows the local synced avatar plus catalog metadata and never requests official assets in the browser.`,
          })}
        </p>
      </div>

      <div className="visual-workbench__summary-strip" aria-label={pickLocaleText(locale, { zh: '视觉档案概况', en: 'Visual dossier summary' })}>
        <div className="visual-workbench__summary-pill">
          <span className="visual-workbench__summary-label">{pickLocaleText(locale, { zh: '皮肤数', en: 'Skins' })}</span>
          <strong className="visual-workbench__summary-value">{skinCount}</strong>
        </div>
        <div className="visual-workbench__summary-pill">
          <span className="visual-workbench__summary-label">{pickLocaleText(locale, { zh: '登记槽位', en: 'Catalog slots' })}</span>
          <strong className="visual-workbench__summary-value">{visualSlotCount}</strong>
        </div>
        <ActionButton tone="ghost" className="visual-workbench__close" onClick={onClose}>
          {pickLocaleText(locale, { zh: '收起档案', en: 'Hide dossier' })}
        </ActionButton>
      </div>
    </div>
  )
}
