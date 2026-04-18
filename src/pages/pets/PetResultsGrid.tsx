import { useI18n } from '../../app/i18n'
import { StatusBanner } from '../../components/StatusBanner'
import { resolveDataUrl } from '../../data/client'
import { getPrimaryLocalizedText } from '../../domain/localizedText'
import type { Pet } from '../../domain/types'
import {
  buildAcquisitionDetail,
  buildAcquisitionLabel,
  buildAcquisitionNotes,
  buildIllustrationAlt,
  buildStatusLabel,
} from './formatting'

interface PetResultsGridProps {
  pets: Pet[]
}

export function PetResultsGrid({ pets }: PetResultsGridProps) {
  const { locale, t } = useI18n()

  if (pets.length === 0) {
    return (
      <StatusBanner
        tone="info"
        title={t({ zh: '没有匹配结果', en: 'No pets match' })}
        detail={t({
          zh: '当前筛选条件下没有宠物，试试清空搜索词或放宽图像状态。',
          en: 'No pets match the current filters. Try clearing the query or broadening the asset filter.',
        })}
      />
    )
  }

  return (
    <div className="pets-grid" aria-label={t({ zh: '宠物结果', en: 'Pet results' })}>
      {pets.map((pet) => {
        const primaryName = getPrimaryLocalizedText(pet.name, locale)
        const primaryDescription = pet.description ? getPrimaryLocalizedText(pet.description, locale) : null
        const acquisitionLabel = buildAcquisitionLabel(pet.acquisition, locale)
        const acquisitionDetail = buildAcquisitionDetail(pet.acquisition, locale)
        const acquisitionNotes = buildAcquisitionNotes(pet.acquisition, locale)

        return (
          <article key={pet.id} className="pet-card">
            <div className="pet-card__stage">
              <div className="pet-card__stage-grid" aria-hidden="true" />
              {pet.illustration ? (
                <img
                  className="pet-card__illustration"
                  src={resolveDataUrl(pet.illustration.path)}
                  alt={buildIllustrationAlt(pet, locale)}
                  loading="lazy"
                  width={pet.illustration.width}
                  height={pet.illustration.height}
                />
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

              <div className="pet-card__facts">
                <span>
                  {pet.iconGraphicId
                    ? t({ zh: `头像资源 #${pet.iconGraphicId}`, en: `Icon asset #${pet.iconGraphicId}` })
                    : t({ zh: '头像资源缺失', en: 'Icon asset missing' })}
                </span>
                <span>
                  {pet.illustrationGraphicId
                    ? t({ zh: `立绘资源 #${pet.illustrationGraphicId}`, en: `Illustration asset #${pet.illustrationGraphicId}` })
                    : t({ zh: '立绘资源缺失', en: 'Illustration asset missing' })}
                </span>
                {pet.acquisition.sourceType ? (
                  <span>{t({ zh: `来源标记 ${pet.acquisition.sourceType}`, en: `Source marker ${pet.acquisition.sourceType}` })}</span>
                ) : null}
              </div>
            </div>
          </article>
        )
      })}
    </div>
  )
}
