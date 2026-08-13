import { t } from '../../app/i18n-messages'
import { ChampionAvatar } from '../ChampionAvatar'
import { getDeliveryLabel, getPreviewStageClassName } from './asset-model'
import type { ChampionVisualWorkbenchModel } from './types'

type ChampionVisualWorkbenchStageProps = {
  readonly model: ChampionVisualWorkbenchModel
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
              ? t(locale, '当前槽位仅展示站内基座记录')
              : t(locale, '当前英雄没有更多视觉槽位')}
          </strong>
          <p className="visual-workbench__stage-empty-copy">
            {selectedAssetOption
              ? t(locale, '静态站不会请求官方资源。这里保留当前槽位的基座记录；如需实际图片，必须先走构建期同步并接入站内本地资源。')
              : t(locale, '当前英雄只有本地头像参考，没有更多可切换的视觉槽位。')}
          </p>
          {selectedAsset ? (
            <p className="visual-workbench__stage-empty-copy">
              {t(locale, '当前登记：graphic #{p0} · {p1} · {p2} 项用途', {
                p0: selectedAsset.graphicId,
                p1: getDeliveryLabel(selectedAsset.delivery, locale),
                p2: String(selectedAsset.uses.length),
              })}
            </p>
          ) : null}
        </div>

        <div className="visual-workbench__reference-chip">
          <ChampionAvatar champion={champion} locale={locale} className="visual-workbench__reference-avatar" loading="eager" />
          <div className="visual-workbench__reference-copy">
            <span className="visual-workbench__reference-label">{t(locale, '卡片参考头像')}</span>
            <strong className="visual-workbench__reference-value">{t(locale, '本地同步资源')}</strong>
          </div>
        </div>
      </div>

      <div className="visual-workbench__stage-footer">
        <span className="visual-workbench__stage-pill">
          {selectedAssetOption?.label ?? t(locale, '暂无槽位')}
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
