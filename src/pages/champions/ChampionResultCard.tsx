import { Link } from 'react-router-dom'
import { ChampionIdentity } from '../../components/ChampionIdentity'
import { getChampionAttributeGroupLabel, getChampionAttributeGroups, getChampionTagLabel } from '../../domain/championTags'
import { formatSeatLabel, getLocalizedTextPair, getPrimaryLocalizedText, getRoleLabel } from '../../domain/localizedText'
import type { Champion } from '../../domain/types'
import type { ChampionsPageModel } from './types'

interface ChampionResultCardProps {
  champion: Champion
  model: ChampionsPageModel
}

export function ChampionResultCard({ champion, model }: ChampionResultCardProps) {
  const { locale, t, selectedChampion, toggleChampionVisual, locationSearch, saveListScroll } = model
  const attributeGroups = getChampionAttributeGroups(champion.tags)
  const isSelected = champion.id === selectedChampion?.id

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
        aria-label={t({
          zh: `查看详情：${getPrimaryLocalizedText(champion.name, locale)}`,
          en: `Open details for ${getPrimaryLocalizedText(champion.name, locale)}`,
        })}
        onClick={saveListScroll}
      >
        <ChampionIdentity
          champion={champion}
          locale={locale}
          eyebrow={formatSeatLabel(champion.seat, locale)}
          avatarClassName="champion-avatar--spotlight"
          variant="spotlight"
        />

        <div className="tag-row">
          {champion.roles.map((role) => (
            <span key={role} className="tag-pill">
              {getRoleLabel(role, locale)}
            </span>
          ))}
        </div>

        <p className="supporting-text">
          {t({ zh: '联动队伍', en: 'Affiliation' })}：
          {champion.affiliations.length > 0
            ? champion.affiliations.map((affiliation) => getLocalizedTextPair(affiliation, locale)).join(' / ')
            : t({ zh: '暂无', en: 'None yet' })}
        </p>

        <div className="result-block">
          <strong className="result-block__title">{t({ zh: '属性概览', en: 'Attributes' })}</strong>
          {attributeGroups.length > 0 ? (
            <div className="result-attribute-grid">
              {attributeGroups.map((group) => (
                <div key={group.id} className="result-block result-block--compact">
                  <strong className="result-block__title result-block__title--small">
                    {getChampionAttributeGroupLabel(group.id, locale)}
                  </strong>
                  <div className="tag-row tag-row--tight">
                    {group.tags.map((tag) => (
                      <span key={tag} className="tag-pill tag-pill--muted">
                        {getChampionTagLabel(tag, locale)}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="supporting-text">
              {t({
                zh: '当前数据里还没有更多属性标签。',
                en: 'No extra attribute tags are exposed in the current dataset yet.',
              })}
            </p>
          )}
        </div>

        <div className="result-card__section">
          <span className="result-card__link">{t({ zh: '点击卡片查看详情', en: 'Open details from the card' })}</span>
        </div>
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
