import { pickLocaleText } from '../../app/i18n'
import { getPrimaryLocalizedText, getSecondaryLocalizedText } from '../../domain/localizedText'
import { getDeliveryLabel } from './asset-model'
import type { ChampionVisualWorkbenchModel } from './types'

type ChampionVisualWorkbenchConsoleProps = {
  model: ChampionVisualWorkbenchModel
}

export function ChampionVisualWorkbenchConsole({ model }: ChampionVisualWorkbenchConsoleProps) {
  const { locale, visual, selectedSkin, selectedAsset, assetOptions, selectedAssetOption, setSelectedSkinId, setSelectedAssetId } = model

  return (
    <div className="visual-workbench__console">
      <div className="visual-workbench__resource-panel">
        <div className="visual-workbench__resource-panel-header">
          <strong className="visual-workbench__panel-title">{pickLocaleText(locale, { zh: '资源槽位', en: 'Asset slots' })}</strong>
          <span className="visual-workbench__panel-hint">
            {pickLocaleText(locale, {
              zh: '这里只切换槽位和查看基座记录；静态站不会对这些槽位发起任何官方请求。',
              en: 'This panel only switches between catalog slots and metadata. The static site never issues official requests for them.',
            })}
          </span>
        </div>

        <div className="visual-workbench__resource-tabs">
          {assetOptions.map((option) => {
            const isActive = selectedAssetOption?.id === option.id
            const isAvailable = Boolean(option.asset)

            return (
              <button
                key={option.id}
                type="button"
                className={isActive ? 'visual-workbench__resource-button visual-workbench__resource-button--active' : 'visual-workbench__resource-button'}
                aria-label={option.label}
                aria-pressed={isActive}
                disabled={!isAvailable}
                onClick={() => setSelectedAssetId(option.id)}
              >
                <span className="visual-workbench__resource-label">{option.label}</span>
                <span className="visual-workbench__resource-meta">
                  {isAvailable ? option.hint : pickLocaleText(locale, { zh: '当前无此槽位', en: 'This slot is unavailable' })}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {visual && visual.skins.length > 0 ? (
        <div className="visual-workbench__skin-panel">
          <div className="visual-workbench__resource-panel-header">
            <strong className="visual-workbench__panel-title">{pickLocaleText(locale, { zh: '皮肤库', en: 'Skin library' })}</strong>
            <span className="visual-workbench__panel-hint">
              {pickLocaleText(locale, {
                zh: '切换皮肤后，皮肤立绘 / large / xl / 头像槽位会同步更新。',
                en: 'Switching skins updates the art, large, xl, and portrait slots together.',
              })}
            </span>
          </div>
          <div className="visual-workbench__skin-strip">
            {visual.skins.map((skin) => {
              const isActive = selectedSkin?.id === skin.id
              const skinPrimaryName = getPrimaryLocalizedText(skin.name, locale)
              const skinSecondaryName = getSecondaryLocalizedText(skin.name, locale)
              const availableCount = [skin.portrait, skin.base, skin.large, skin.xl].filter(Boolean).length

              return (
                <button
                  key={skin.id}
                  type="button"
                  className={isActive ? 'visual-workbench__skin-button visual-workbench__skin-button--active' : 'visual-workbench__skin-button'}
                  aria-pressed={isActive}
                  onClick={() => setSelectedSkinId(skin.id)}
                >
                  <span className="visual-workbench__skin-kicker">skin #{skin.id}</span>
                  <strong className="visual-workbench__skin-name">{skinPrimaryName}</strong>
                  {skinSecondaryName ? <span className="visual-workbench__skin-secondary">{skinSecondaryName}</span> : null}
                  <span className="visual-workbench__skin-meta">
                    {pickLocaleText(locale, {
                      zh: `已登记 ${availableCount} 个资源槽位`,
                      en: `${availableCount} asset slots registered`,
                    })}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      ) : null}

      {selectedAsset ? (
        <div className="visual-workbench__meta-grid">
          <div className="visual-workbench__meta-item">
            <span className="visual-workbench__meta-key">graphic id</span>
            <strong className="visual-workbench__meta-value">{selectedAsset.graphicId}</strong>
          </div>
          <div className="visual-workbench__meta-item">
            <span className="visual-workbench__meta-key">delivery</span>
            <strong className="visual-workbench__meta-value">{getDeliveryLabel(selectedAsset.delivery, locale)}</strong>
          </div>
          <div className="visual-workbench__meta-item visual-workbench__meta-item--wide">
            <span className="visual-workbench__meta-key">source graphic</span>
            <strong className="visual-workbench__meta-value visual-workbench__meta-value--mono">{selectedAsset.sourceGraphic}</strong>
          </div>
          <div className="visual-workbench__meta-item">
            <span className="visual-workbench__meta-key">source version</span>
            <strong className="visual-workbench__meta-value">{selectedAsset.sourceVersion ?? 'null'}</strong>
          </div>
          <div className="visual-workbench__meta-item">
            <span className="visual-workbench__meta-key">{pickLocaleText(locale, { zh: '接入方式', en: 'Delivery mode' })}</span>
            <strong className="visual-workbench__meta-value">
              {pickLocaleText(locale, { zh: '构建期同步 / 站内不请求', en: 'Build-time sync / no in-site request' })}
            </strong>
          </div>
          <div className="visual-workbench__meta-item visual-workbench__meta-item--wide">
            <span className="visual-workbench__meta-key">uses</span>
            <strong className="visual-workbench__meta-value">{selectedAsset.uses.join(', ') || '—'}</strong>
          </div>
        </div>
      ) : null}
    </div>
  )
}
