import { useState, type ReactNode } from 'react'
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
  readonly pet: Pet
  readonly animation: PetAnimation | null
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
  const shouldShowAnimatedPreview =
    animation !== null && isPreviewActive && fallbackSrc !== null && fallbackSrc !== ''
  const hasPrimaryDescription = primaryDescription != null && primaryDescription !== ''

  const illustrationContent: ReactNode = (() => {
    if (pet.illustration === null) {
      return (
        <div className="pet-card__stage-empty">
          <strong>{t("暂无立绘")}</strong>
          <span>
            {t("当前 definitions 里没有可用的 XL 图像槽位。")}
          </span>
        </div>
      )
    }

    if (shouldShowAnimatedPreview) {
      return (
        <SkelAnimCanvas
          className="pet-card__preview"
          animation={animation}
          fallbackSrc={fallbackSrc}
          alt={illustrationAlt}
          labels={{
            play: t("播放动画"),
            pause: t("暂停动画"),
            reducedMotion: t("已遵循减少动态偏好"),
            error: t("动态预览加载失败"),
            animated: t("动态预览已启用"),
            fallback: t("当前显示静态立绘"),
          }}
          playbackMode="play"
          showControls={false}
          showStatus={false}
        />
      )
    }

    return (
      <img
        className="pet-card__illustration"
        src={fallbackSrc ?? undefined}
        alt={illustrationAlt}
        loading="lazy"
        width={pet.illustration.width}
        height={pet.illustration.height}
      />
    )
  })()

  return (
    <article
      className={animation !== null ? 'pet-card pet-card--animated' : 'pet-card'}
      onMouseEnter={animation !== null ? () => setPreviewActive(true) : undefined}
      onMouseLeave={animation !== null ? () => setPreviewActive(false) : undefined}
    >
      <div className="pet-card__stage">
        <div className="pet-card__stage-grid" aria-hidden="true" />
        {illustrationContent}
      </div>

      <div className="pet-card__body">
        <div className="pet-card__meta-row">
          <span className="pet-card__source">{acquisitionLabel}</span>
          <span className={pet.isAvailable ? 'pet-card__status' : 'pet-card__status pet-card__status--muted'}>
            {buildStatusLabel(pet, locale)}
          </span>
        </div>

        <h3 className="pet-card__title">{primaryName}</h3>
        {hasPrimaryDescription ? (
          <p className="pet-card__description">{primaryDescription}</p>
        ) : null}

        <div className="pet-card__acquisition">
          <span className="pet-card__acquisition-label">{t("获取方式")}</span>
          <strong className="pet-card__acquisition-detail">
            {acquisitionDetail ?? t("当前 definitions 没有给出稳定来源。")}
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
