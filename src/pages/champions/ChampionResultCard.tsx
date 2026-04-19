import { Link } from 'react-router-dom'
import { ChampionIdentity } from '../../components/ChampionIdentity'
import { resolveDataUrl } from '../../data/client'
import { getChampionAttributeGroupLabel, getChampionAttributeGroups, getChampionTagLabel } from '../../domain/championTags'
import { formatSeatLabel, getLocalizedTextPair, getPrimaryLocalizedText, getRoleLabel } from '../../domain/localizedText'
import type { Champion } from '../../domain/types'
import { filterChampionCardAttributeGroups } from './champion-card-model'
import type { ChampionsPageModel } from './types'

interface ChampionResultCardProps {
  champion: Champion
  model: ChampionsPageModel
}

export function ChampionResultCard({ champion, model }: ChampionResultCardProps) {
  const { locale, t, selectedChampion, toggleChampionVisual, locationSearch, saveListScroll, heroIllustrationByChampionId } =
    model
  const attributeGroups = filterChampionCardAttributeGroups(getChampionAttributeGroups(champion.tags), {
    selectedAcquisitions: model.selectedAcquisitions,
    selectedMechanics: model.selectedMechanics,
  })
  const isSelected = champion.id === selectedChampion?.id
  const heroIllustration = heroIllustrationByChampionId.get(champion.id) ?? null
  const affiliationText =
    champion.affiliations.length > 0
      ? champion.affiliations.map((affiliation) => getLocalizedTextPair(affiliation, locale)).join(' / ')
      : null

  return (
    <article
      className={
        isSelected
          ? 'result-card result-card--champion result-card--interactive result-card--selected'
          : 'result-card result-card--champion result-card--interactive'
      }
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
            eyebrow={formatSeatLabel(champion.seat, locale)}
            avatarClassName="champion-avatar--spotlight"
            variant="spotlight"
          />

          <div className="result-card__meta-strip">
            <div className="tag-row result-card__role-row">
              {champion.roles.map((role) => (
                <span key={role} className="tag-pill">
                  {getRoleLabel(role, locale)}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="result-card__attributes">
          {attributeGroups.length > 0 ? (
            <div className="result-attribute-grid result-attribute-grid--compact">
              {attributeGroups.map((group) => (
                <div key={group.id} className="result-block result-block--compact result-card__attribute-group">
                  <strong className="result-block__title result-block__title--small">
                    {getChampionAttributeGroupLabel(group.id, locale)}
                  </strong>
                  <div className="tag-row tag-row--tight result-card__attribute-tags">
                    {group.tags.slice(0, 3).map((tag) => (
                      <span key={tag} className="tag-pill tag-pill--muted">
                        {getChampionTagLabel(tag, locale)}
                      </span>
                    ))}
                    {group.tags.length > 3 ? (
                      <span className="tag-pill tag-pill--muted result-card__role-overflow">
                        {t({ zh: `+${group.tags.length - 3}`, en: `+${group.tags.length - 3}` })}
                      </span>
                    ) : null}
                  </div>
                </div>
              ))}
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

        {affiliationText ? <p className="result-card__affiliation">{affiliationText}</p> : null}
      </Link>

      <div className="result-card__actions">
        <button
          type="button"
          className={
            isSelected
              ? 'action-button action-button--secondary action-button--compact action-button--toggled'
              : 'action-button action-button--ghost action-button--compact'
          }
          aria-label={t({
            zh: `查看 ${getPrimaryLocalizedText(champion.name, locale)} 视觉档案`,
            en: `View ${getPrimaryLocalizedText(champion.name, locale)} visual dossier`,
          })}
          aria-pressed={isSelected}
          onClick={() => toggleChampionVisual(champion.id)}
        >
          {isSelected ? t({ zh: '收起视觉档案', en: 'Hide visual dossier' }) : t({ zh: '视觉档案', en: 'Visual dossier' })}
        </button>
      </div>
    </article>
  )
}
