import { useState } from 'react'
import { useI18n } from '../../app/i18n'
import { resolveDataUrl } from '../../data/client'
import { getPrimaryLocalizedText } from '../../domain/localizedText'
import type { Pet, PetAnimation } from '../../domain/types'
import { SkelAnimCanvas } from '../../features/skelanim-player/SkelAnimCanvas'
import {
  buildAcquisitionDetail,
  buildAcquisitionLabel,
  buildAcquisitionNotes,
  buildIllustrationAlt,
  buildStatusLabel,
} from './formatting'

interface PetResultCardProps {
  pet: Pet
  animation: PetAnimation | null
}

export function PetResultCard({ pet, animation }: PetResultCardProps) {
  const { locale, t } = useI18n()
  const [isPreviewActive, setPreviewActive] = useState(false)
  const primaryName = getPrimaryLocalizedText(pet.name, locale)
  const primaryDescription = pet.description ? getPrimaryLocalizedText(pet.description, locale) : null
  const acquisitionLabel = buildAcquisitionLabel(pet.acquisition, locale)
  const acquisitionDetail = buildAcquisitionDetail(pet.acquisition, locale)
  const acquisitionNotes = buildAcquisitionNotes(pet.acquisition, locale)
  const illustrationAlt = buildIllustrationAlt(pet, locale)
  const fallbackSrc = pet.illustration ? resolveDataUrl(pet.illustration.path) : null
  const shouldShowAnimatedPreview = Boolean(animation && isPreviewActive && fallbackSrc)

  return (
    <article
      className={animation ? 'pet-card pet-card--animated' : 'pet-card'}
      onMouseEnter={animation ? () => setPreviewActive(true) : undefined}
      onMouseLeave={animation ? () => setPreviewActive(false) : undefined}
    >
      <div className="pet-card__stage">
        <div className="pet-card__stage-grid" aria-hidden="true" />
        {pet.illustration ? (
          shouldShowAnimatedPreview ? (
            <SkelAnimCanvas
              className="pet-card__preview"
              animation={animation}
              fallbackSrc={fallbackSrc}
              alt={illustrationAlt}
              labels={{
                play: t({ zh: '播放动画', en: 'Play animation' }),
                pause: t({ zh: '暂停动画', en: 'Pause animation' }),
                reducedMotion: t({ zh: '已遵循减少动态偏好', en: 'Reduced motion is active' }),
                error: t({ zh: '动态预览加载失败', en: 'Animated preview failed to load' }),
                animated: t({ zh: '动态预览已启用', en: 'Animated preview enabled' }),
                fallback: t({ zh: '当前显示静态立绘', en: 'Showing static illustration' }),
              }}
              playbackMode="play"
              showControls={false}
              showStatus={false}
            />
          ) : (
            <img
              className="pet-card__illustration"
              src={fallbackSrc ?? undefined}
              alt={illustrationAlt}
              loading="lazy"
              width={pet.illustration.width}
              height={pet.illustration.height}
            />
          )
        ) : (
          <div className="pet-card__stage-empty">
            <strong>{t({ zh: '暂无立绘', en: 'No illustration yet' })}</strong>
            <span>
              {t({
                zh: '当前 definitions 里没有可用的 XL 图像槽位。',
                en: 'The current definitions do not expose a usable XL art slot yet.',
              })}
            </span>
          </div>
        )}
      </div>

      <div className="pet-card__body">
        <div className="pet-card__meta-row">
          <span className="pet-card__source">{acquisitionLabel}</span>
          <span className={pet.isAvailable ? 'pet-card__status' : 'pet-card__status pet-card__status--muted'}>
            {buildStatusLabel(pet, locale)}
          </span>
        </div>

        <h3 className="pet-card__title">{primaryName}</h3>
        {primaryDescription ? <p className="pet-card__description">{primaryDescription}</p> : null}

        <div className="pet-card__acquisition">
          <span className="pet-card__acquisition-label">{t({ zh: '获取方式', en: 'How to get' })}</span>
          <strong className="pet-card__acquisition-detail">
            {acquisitionDetail ?? t({ zh: '当前 definitions 没有给出稳定来源。', en: 'Current definitions do not expose a stable source.' })}
          </strong>
          {acquisitionNotes.map((note) => (
            <span key={`${pet.id}-${note}`} className="pet-card__acquisition-note">
              {note}
            </span>
          ))}
        </div>
      </div>
    </article>
  )
}
