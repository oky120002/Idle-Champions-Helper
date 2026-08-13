import type { LocaleText, TranslateParams } from '../../app/i18n'
import { pickText } from '../../app/i18n-messages'
import { SkelAnimCanvas } from '../../features/skelanim-player/SkelAnimCanvas'
import type { ChampionAnimation, ChampionDetail, ChampionIllustration, ChampionSkinDetail } from '../../domain/types'
import { getPrimaryLocalizedText } from '../../domain/localizedText'
import { buildSkinPreviewAlt, getSkinArtworkIds } from './detail-card-model'
import { DetailField, LocalizedTextStack } from './detail-cards'
import { formatNullableText } from './detail-value-formatters'
import type { SkinArtworkIds } from './types'

interface SkinArtworkDialogProps {
  readonly detail: ChampionDetail
  readonly locale: 'zh-CN' | 'en-US'
  readonly t: (text: string | LocaleText, params?: TranslateParams) => string
  readonly isArtworkDialogOpen: boolean
  readonly selectedSkin: ChampionSkinDetail | null
  readonly selectedSkinAnimation: ChampionAnimation | null
  readonly selectedSkinIllustration: ChampionIllustration | null
  readonly selectedSkinArtworkIds: SkinArtworkIds | null
  readonly selectedSkinPreviewUrl: string | null
  readonly closeArtworkDialog: () => void
  readonly setSelectedSkinId: (skinId: string | null) => void
}

export function SkinArtworkDialog({
  detail,
  locale,
  t,
  isArtworkDialogOpen,
  selectedSkin,
  selectedSkinAnimation,
  selectedSkinIllustration,
  selectedSkinArtworkIds,
  selectedSkinPreviewUrl,
  closeArtworkDialog,
  setSelectedSkinId,
}: SkinArtworkDialogProps) {
  if (!isArtworkDialogOpen || !selectedSkin) {
    return null
  }

  return (
    <div
      className="skin-artwork-dialog"
      role="dialog"
      aria-modal="true"
      aria-label={t("皮肤立绘预览")}
    >
      <button
        type="button"
        className="skin-artwork-dialog__backdrop"
        aria-label={t("关闭皮肤立绘预览")}
        onClick={closeArtworkDialog}
      />
      <div className="skin-artwork-dialog__panel">
        <div className="skin-artwork-dialog__header">
          <div className="skin-artwork-dialog__copy">
            <p className="champion-detail-sidebar__eyebrow">{t("皮肤立绘预览")}</p>
            <h3 className="skin-artwork-dialog__title"><LocalizedTextStack value={selectedSkin.name} /></h3>
            <p className="skin-artwork-dialog__hint">
              {pickText(
                locale,
                selectedSkinIllustration
                  ? '当前预览来自站内版本化立绘静态资源；下方继续保留原始 graphic id 与来源槽位，方便核对基座。'
                  : '当前这套皮肤还没有站内立绘资源。为保证全站静态立绘统一来自动画导出，这里不再回退英雄头像。',
                selectedSkinIllustration
                  ? 'This preview is now served from the versioned local illustration asset while the original graphic ids stay visible below for verification.'
                  : 'This skin does not have a local illustration yet. To keep every static illustration sourced from animation exports, the dialog no longer falls back to the champion portrait.',
              )}
            </p>
          </div>
          <button
            type="button"
            className="skin-artwork-dialog__close"
            aria-label={t("关闭皮肤立绘预览")}
            onClick={closeArtworkDialog}
          >
            ×
          </button>
        </div>

        <div className="skin-artwork-dialog__body">
          <div className="skin-artwork-dialog__stage">
            <div className="skin-artwork-dialog__canvas">
              {selectedSkinPreviewUrl != null && selectedSkinPreviewUrl !== '' ? (
                <SkelAnimCanvas
                  key={selectedSkin.id}
                  animation={selectedSkinAnimation}
                  fallbackSrc={selectedSkinPreviewUrl}
                  alt={buildSkinPreviewAlt(selectedSkin, locale)}
                  labels={{
                    play: t("播放动画"),
                    pause: t("暂停动画"),
                    reducedMotion: t("已遵循减少动态偏好"),
                    error: t("动态预览加载失败"),
                    animated: t("动态预览已启用"),
                    fallback: t("当前显示静态立绘回退"),
                  }}
                />
              ) : (
                <div className="skin-artwork-dialog__fallback">
                  {t("当前没有可用的皮肤预览资源。")}
                </div>
              )}
            </div>

            <div className="detail-field-grid detail-field-grid--compact">
              <DetailField label={t("本地立绘")} value={selectedSkinIllustration ? t("已命中") : t("未命中")} variant="compact" />
              <DetailField label={t("动态预览")} value={selectedSkinAnimation ? t("已命中") : t("未命中")} variant="compact" />
              <DetailField label={t("来源槽位")} value={selectedSkinIllustration?.sourceSlot ?? t("未知")} variant="compact" />
              <DetailField label={t("Base Graphic ID")} value={formatNullableText(selectedSkinArtworkIds?.baseGraphicId ?? null, locale)} variant="compact" />
              <DetailField label={t("Large Graphic ID")} value={formatNullableText(selectedSkinArtworkIds?.largeGraphicId ?? null, locale)} variant="compact" />
              <DetailField label={t("XL Graphic ID")} value={formatNullableText(selectedSkinArtworkIds?.xlGraphicId ?? null, locale)} variant="compact" />
              <DetailField label={t("Portrait Graphic ID")} value={formatNullableText(selectedSkinArtworkIds?.portraitGraphicId ?? null, locale)} variant="compact" />
            </div>
          </div>

          <div className="skin-artwork-dialog__selector">
            <p className="skin-artwork-dialog__selector-title">{t("切换皮肤")}</p>
            <div className="skin-artwork-dialog__tabs">
              {detail.skins.map((skin) => {
                const artworkIds = getSkinArtworkIds(skin)
                const primaryGraphicId =
                  artworkIds.largeGraphicId ?? artworkIds.xlGraphicId ?? artworkIds.portraitGraphicId
                const hasGraphicId = [
                  artworkIds.largeGraphicId,
                  artworkIds.xlGraphicId,
                  artworkIds.portraitGraphicId,
                ].some((id) => id != null && id !== '')

                return (
                  <button
                    key={skin.id}
                    type="button"
                    className={
                      selectedSkin.id === skin.id
                        ? 'skin-artwork-dialog__tab skin-artwork-dialog__tab--active'
                        : 'skin-artwork-dialog__tab'
                    }
                    aria-label={
                      locale === 'zh-CN'
                        ? `切换皮肤：${getPrimaryLocalizedText(skin.name, locale)}`
                        : `Switch skin: ${getPrimaryLocalizedText(skin.name, locale)}`
                    }
                    aria-pressed={selectedSkin.id === skin.id}
                    onClick={() => setSelectedSkinId(skin.id)}
                  >
                    <span className="skin-artwork-dialog__tab-title">{getPrimaryLocalizedText(skin.name, locale)}</span>
                    <span className="skin-artwork-dialog__tab-meta">
                      {hasGraphicId && primaryGraphicId != null
                        ? `ID ${primaryGraphicId}`
                        : t("暂无图像字段")}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
