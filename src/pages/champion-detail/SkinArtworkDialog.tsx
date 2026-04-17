import { SkelAnimCanvas } from '../../features/skelanim-player/SkelAnimCanvas'
import type { ChampionAnimation, ChampionDetail, ChampionIllustration, ChampionSkinDetail } from '../../domain/types'
import { getPrimaryLocalizedText } from '../../domain/localizedText'
import { buildSkinPreviewAlt, getSkinArtworkIds } from './detail-card-model'
import { DetailField, LocalizedTextStack } from './detail-cards'
import { formatNullableText } from './detail-value-formatters'
import type { SkinArtworkIds } from './types'

interface SkinArtworkDialogProps {
  detail: ChampionDetail
  locale: 'zh-CN' | 'en-US'
  t: (text: { zh: string; en: string }) => string
  isArtworkDialogOpen: boolean
  selectedSkin: ChampionSkinDetail | null
  selectedSkinAnimation: ChampionAnimation | null
  selectedSkinIllustration: ChampionIllustration | null
  selectedSkinArtworkIds: SkinArtworkIds | null
  selectedSkinPreviewUrl: string | null
  closeArtworkDialog: () => void
  setSelectedSkinId: (skinId: string | null) => void
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
      aria-label={t({ zh: '皮肤立绘预览', en: 'Skin artwork preview' })}
      onClick={closeArtworkDialog}
    >
      <div className="skin-artwork-dialog__backdrop" aria-hidden="true" />
      <div className="skin-artwork-dialog__panel" onClick={(event) => event.stopPropagation()}>
        <div className="skin-artwork-dialog__header">
          <div className="skin-artwork-dialog__copy">
            <p className="champion-detail-sidebar__eyebrow">{t({ zh: '皮肤立绘预览', en: 'Skin artwork preview' })}</p>
            <h3 className="skin-artwork-dialog__title"><LocalizedTextStack value={selectedSkin.name} /></h3>
            <p className="skin-artwork-dialog__hint">
              {t({
                zh: selectedSkinIllustration
                  ? '当前预览来自站内版本化立绘静态资源；下方继续保留原始 graphic id 与来源槽位，方便核对基座。'
                  : '当前没有命中本地皮肤立绘时，会回退到英雄头像；下方继续保留原始 graphic id，方便排查缺口。',
                en: selectedSkinIllustration
                  ? 'This preview is now served from the versioned local illustration asset while the original graphic ids stay visible below for verification.'
                  : 'When a local skin illustration is unavailable, this preview falls back to the champion portrait while keeping the original graphic ids visible below.',
              })}
            </p>
          </div>
          <button
            type="button"
            className="skin-artwork-dialog__close"
            aria-label={t({ zh: '关闭皮肤立绘预览', en: 'Close skin artwork preview' })}
            onClick={closeArtworkDialog}
          >
            ×
          </button>
        </div>

        <div className="skin-artwork-dialog__body">
          <div className="skin-artwork-dialog__stage">
            <div className="skin-artwork-dialog__canvas">
              {selectedSkinPreviewUrl ? (
                <SkelAnimCanvas
                  key={selectedSkin.id}
                  animation={selectedSkinAnimation}
                  fallbackSrc={selectedSkinPreviewUrl}
                  alt={buildSkinPreviewAlt(selectedSkin, locale)}
                  labels={{
                    loading: t({ zh: '正在载入动态预览…', en: 'Loading animated preview…' }),
                    play: t({ zh: '播放动画', en: 'Play animation' }),
                    pause: t({ zh: '暂停动画', en: 'Pause animation' }),
                    reducedMotion: t({ zh: '已遵循减少动态偏好', en: 'Reduced motion is active' }),
                    error: t({ zh: '动态预览加载失败', en: 'Animated preview failed to load' }),
                    animated: t({ zh: '动态预览已启用', en: 'Animated preview enabled' }),
                    fallback: t({ zh: '当前显示静态立绘回退', en: 'Showing the static illustration fallback' }),
                  }}
                />
              ) : (
                <div className="skin-artwork-dialog__fallback">
                  {t({ zh: '当前没有可用的皮肤预览资源。', en: 'No skin preview asset is available right now.' })}
                </div>
              )}
            </div>

            <div className="detail-field-grid detail-field-grid--compact">
              <DetailField label={t({ zh: '本地立绘', en: 'Local illustration' })} value={selectedSkinIllustration ? t({ zh: '已命中', en: 'Available' }) : t({ zh: '未命中', en: 'Missing' })} variant="compact" />
              <DetailField label={t({ zh: '动态预览', en: 'Animated preview' })} value={selectedSkinAnimation ? t({ zh: '已命中', en: 'Available' }) : t({ zh: '未命中', en: 'Missing' })} variant="compact" />
              <DetailField label={t({ zh: '来源槽位', en: 'Source slot' })} value={selectedSkinIllustration?.sourceSlot ?? t({ zh: '未知', en: 'Unknown' })} variant="compact" />
              <DetailField label={t({ zh: 'Base Graphic ID', en: 'Base graphic ID' })} value={formatNullableText(selectedSkinArtworkIds?.baseGraphicId ?? null, locale)} variant="compact" />
              <DetailField label={t({ zh: 'Large Graphic ID', en: 'Large graphic ID' })} value={formatNullableText(selectedSkinArtworkIds?.largeGraphicId ?? null, locale)} variant="compact" />
              <DetailField label={t({ zh: 'XL Graphic ID', en: 'XL graphic ID' })} value={formatNullableText(selectedSkinArtworkIds?.xlGraphicId ?? null, locale)} variant="compact" />
              <DetailField label={t({ zh: 'Portrait Graphic ID', en: 'Portrait graphic ID' })} value={formatNullableText(selectedSkinArtworkIds?.portraitGraphicId ?? null, locale)} variant="compact" />
            </div>
          </div>

          <div className="skin-artwork-dialog__selector">
            <p className="skin-artwork-dialog__selector-title">{t({ zh: '切换皮肤', en: 'Switch skins' })}</p>
            <div className="skin-artwork-dialog__tabs">
              {detail.skins.map((skin) => {
                const artworkIds = getSkinArtworkIds(skin)

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
                      {artworkIds.largeGraphicId || artworkIds.xlGraphicId || artworkIds.portraitGraphicId
                        ? `ID ${artworkIds.largeGraphicId ?? artworkIds.xlGraphicId ?? artworkIds.portraitGraphicId}`
                        : t({ zh: '暂无图像字段', en: 'No graphic id' })}
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
