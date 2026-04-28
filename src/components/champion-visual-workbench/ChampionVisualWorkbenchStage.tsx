import { pickLocaleText } from '../../app/i18n'
import { ChampionAvatar } from '../ChampionAvatar'
import { getDeliveryLabel, getPreviewStageClassName } from './asset-model'
import type { ChampionVisualWorkbenchModel } from './types'

type ChampionVisualWorkbenchStageProps = {
  model: ChampionVisualWorkbenchModel
}

export function ChampionVisualWorkbenchStage({ model }: ChampionVisualWorkbenchStageProps) {
  const { locale, champion, selectedAssetOption, selectedAsset } = model

  return (
    <div className="visual-workbench__stage-shell">
      <div className={getPreviewStageClassName(selectedAssetOption)}>
        <div className="visual-workbench__stage-grid" aria-hidden="true" />
        <div className="visual-workbench__stage-empty">
          <strong className="visual-workbench__stage-empty-title">
            {selectedAssetOption
              ? pickLocaleText(locale, {
                  zh: '当前槽位仅展示站内基座记录',
                  en: 'This slot stays metadata-only inside the static site',
                })
              : pickLocaleText(locale, {
                  zh: '当前英雄没有更多视觉槽位',
                  en: 'No additional visual slots are available for this champion',
                })}
          </strong>
          <p className="visual-workbench__stage-empty-copy">
            {selectedAssetOption
              ? pickLocaleText(locale, {
                  zh: '静态站不会请求官方资源。这里保留当前槽位的基座记录；如需实际图片，必须先走构建期同步并接入站内本地资源。',
                  en: 'The static site never requests official assets. This stage keeps the current slot as catalog metadata only; actual imagery must be synced during the build and then served locally.',
                })
              : pickLocaleText(locale, {
                  zh: '当前英雄只有本地头像参考，没有更多可切换的视觉槽位。',
                  en: 'Only the local avatar reference is available here for now, with no additional visual slots to inspect.',
                })}
          </p>
          {selectedAsset ? (
            <p className="visual-workbench__stage-empty-copy">
              {pickLocaleText(locale, {
                zh: `当前登记：graphic #${selectedAsset.graphicId} · ${getDeliveryLabel(selectedAsset.delivery, locale)} · ${selectedAsset.uses.length || 0} 项用途`,
                en: `Registered as graphic #${selectedAsset.graphicId} · ${getDeliveryLabel(selectedAsset.delivery, locale)} · ${selectedAsset.uses.length || 0} uses`,
              })}
            </p>
          ) : null}
        </div>

        <div className="visual-workbench__reference-chip">
          <ChampionAvatar champion={champion} locale={locale} className="visual-workbench__reference-avatar" loading="eager" />
          <div className="visual-workbench__reference-copy">
            <span className="visual-workbench__reference-label">{pickLocaleText(locale, { zh: '卡片参考头像', en: 'Card portrait reference' })}</span>
            <strong className="visual-workbench__reference-value">{pickLocaleText(locale, { zh: '本地同步资源', en: 'Local synced asset' })}</strong>
          </div>
        </div>
      </div>

      <div className="visual-workbench__stage-footer">
        <span className="visual-workbench__stage-pill">
          {selectedAssetOption?.label ?? pickLocaleText(locale, { zh: '暂无槽位', en: 'No slot yet' })}
        </span>
        {selectedAsset ? <span className="visual-workbench__stage-pill visual-workbench__stage-pill--muted">graphic #{selectedAsset.graphicId}</span> : null}
        {selectedAsset ? (
          <span className="visual-workbench__stage-pill visual-workbench__stage-pill--muted">
            {getDeliveryLabel(selectedAsset.delivery, locale)}
          </span>
        ) : null}
      </div>
    </div>
  )
}
