import { Link } from 'react-router-dom'
import { ChampionIdentity } from '../../components/ChampionIdentity'
import { resolveDataUrl } from '../../data/client'
import { getChampionAttributeGroupLabel, getChampionAttributeGroups, getChampionTagLabel } from '../../domain/championTags'
import { getLocalizedTextPair, getPrimaryLocalizedText, getRoleLabel } from '../../domain/localizedText'
import type { Champion } from '../../domain/types'
import { buildChampionCardAttributePills } from './champion-card-model'
import type { ChampionsPageModel } from './types'

interface ChampionResultCardProps {
  champion: Champion
  model: ChampionsPageModel
}

export function ChampionResultCard({ champion, model }: ChampionResultCardProps) {
  const { locale, t, locationSearch, saveListScroll, heroIllustrationByChampionId } = model
  const attributePills = buildChampionCardAttributePills(getChampionAttributeGroups(champion.tags), {
    selectedAcquisitions: model.selectedAcquisitions,
    selectedMechanics: model.selectedMechanics,
  })
  const heroIllustration = heroIllustrationByChampionId.get(champion.id) ?? null
  const seatLabel = t({ zh: `${champion.seat}位`, en: `Seat ${champion.seat}` })
  const affiliationLabel = t({ zh: '所属', en: 'Affiliations' })
  const affiliationText =
    champion.affiliations.length > 0
      ? champion.affiliations.map((affiliation) => getPrimaryLocalizedText(affiliation, locale)).join(' / ')
      : null
  const affiliationTitle =
    champion.affiliations.length > 0
      ? champion.affiliations.map((affiliation) => getLocalizedTextPair(affiliation, locale)).join(' / ')
      : null

  return (
    <article
      className="result-card result-card--champion result-card--interactive"
      data-grid-motion-key={champion.id}
    >
      <Link
        className="result-card--link"
        to={{
          pathname: `/champions/${champion.id}`,
          search: locationSearch,
        }}
        state={{ activeNavigationTo: '/champions' }}
        aria-label={t({
          zh: `查看详情：${getPrimaryLocalizedText(champion.name, locale)}`,
          en: `Open details for ${getPrimaryLocalizedText(champion.name, locale)}`,
        })}
        onClick={saveListScroll}
      >
        {heroIllustration ? (
          <div className="result-card__artbackdrop" aria-hidden="true">
            <img
              className="result-card__artbackdrop-image"
              src={resolveDataUrl(heroIllustration.image.path)}
              alt=""
              loading="lazy"
              width={heroIllustration.image.width}
              height={heroIllustration.image.height}
            />
          </div>
        ) : null}

        <div className="result-card__hero-shell">
          <ChampionIdentity
            champion={champion}
            locale={locale}
            eyebrow={seatLabel}
            avatarClassName="champion-avatar--spotlight"
            supporting={
              affiliationText ? (
                <p className="result-card__affiliation" title={affiliationTitle ?? affiliationText}>
                  <span className="result-card__affiliation-label">{affiliationLabel}</span>
                  <span className="result-card__affiliation-value">{affiliationText}</span>
                </p>
              ) : null
            }
            variant="spotlight"
          />

          <div className="result-card__meta-strip">
            <div className="tag-row result-card__role-row">
              <span className="tag-pill tag-pill--seat">{seatLabel}</span>
              {champion.roles.map((role) => (
                <span key={role} className="tag-pill">
                  {getRoleLabel(role, locale)}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="result-card__attributes">
          {attributePills.length > 0 ? (
            <div className="tag-row result-card__attribute-trail">
              {attributePills.map((attribute) => {
                const tagLabel = getChampionTagLabel(attribute.tag, locale)
                const groupLabel = getChampionAttributeGroupLabel(attribute.groupId, locale)

                return (
                  <span
                    key={attribute.key}
                    className={`tag-pill tag-pill--muted result-card__attribute-pill result-card__attribute-pill--${attribute.groupId}`}
                    title={`${groupLabel} · ${tagLabel}`}
                  >
                    {tagLabel}
                  </span>
                )
              })}
            </div>
          ) : (
            <p className="supporting-text result-card__attributes-empty">
              {t({
                zh: '当前数据里还没有更多属性标签。',
                en: 'No extra attribute tags are exposed in the current dataset yet.',
              })}
            </p>
          )}
        </div>
      </Link>
    </article>
  )
}
