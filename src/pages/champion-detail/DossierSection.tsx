import { ChampionAvatar } from '../../components/ChampionAvatar'
import { getPrimaryLocalizedText, getRoleLabel, getSecondaryLocalizedText } from '../../domain/localizedText'
import type { AbilityScoreKey, ChampionDetail } from '../../domain/types'
import { DetailField, LocalizedTextStack } from './detail-cards'
import { formatNumber } from './detail-value-formatters'
import type { DetailFieldProps } from './types'

interface DossierSectionProps {
  detail: ChampionDetail
  locale: 'zh-CN' | 'en-US'
  t: (text: { zh: string; en: string }) => string
  summaryAvailabilityBadges: Array<{ key: string; label: string; active?: boolean }>
  overviewFields: DetailFieldProps[]
  openArtworkDialog: (skinId?: string) => void
}

const ABILITY_SCORE_KEYS: AbilityScoreKey[] = ['str', 'dex', 'con', 'int', 'wis', 'cha']

function formatAbilityModifier(score: number | null | undefined): string {
  if (typeof score !== 'number' || !Number.isFinite(score)) {
    return ''
  }

  const modifier = Math.floor((score - 10) / 2)

  return modifier >= 0 ? `+${modifier}` : `${modifier}`
}

export function DossierSection({
  detail,
  locale,
  t,
  summaryAvailabilityBadges,
  overviewFields,
  openArtworkDialog,
}: DossierSectionProps) {
  const secondaryName = getSecondaryLocalizedText(detail.summary.name, locale)
  const characterSheet = detail.characterSheet

  return (
    <aside className="champion-dossier" aria-label={t({ zh: '英雄资料栏', en: 'Champion dossier' })}>
      <div className="champion-dossier__portrait-card">
        <ChampionAvatar champion={detail.summary} locale={locale} className="champion-avatar--dossier" loading="eager" />
        <div className="champion-dossier__title-block">
          <p className="champion-dossier__eyebrow">
            {locale === 'zh-CN' ? `${detail.summary.seat} 号位` : `Seat ${detail.summary.seat}`}
          </p>
          <h2 className="champion-dossier__title">{getPrimaryLocalizedText(detail.summary.name, locale)}</h2>
          {secondaryName ? <p className="champion-dossier__secondary">{secondaryName}</p> : null}
        </div>
      </div>

      <div className="champion-dossier__section">
        <div className="tag-row champion-dossier__role-strip">
          {detail.summary.roles.map((role) => (
            <span key={role} className="tag-pill">
              {getRoleLabel(role, locale)}
            </span>
          ))}
        </div>
        <div className="detail-badge-row detail-badge-row--wrap champion-dossier__badge-grid">
          {summaryAvailabilityBadges.map((badge) => (
            <span key={badge.key} className={badge.active ? 'detail-badge detail-badge--active' : 'detail-badge'}>
              {badge.label}
            </span>
          ))}
          {detail.eventName ? (
            <span className="detail-badge detail-badge--stacked">
              <span className="detail-badge__prefix">{t({ zh: '活动', en: 'Event' })}</span>
              <LocalizedTextStack value={detail.eventName} />
            </span>
          ) : null}
        </div>
      </div>

      {characterSheet ? (
        <div className="champion-dossier__section champion-dossier__section--scores">
          <div className="champion-dossier__score-grid">
            {ABILITY_SCORE_KEYS.map((key) => {
              const score = characterSheet.abilityScores[key] ?? null

              return (
                <article key={key} className="champion-dossier__score">
                  <span>{key.toUpperCase()}</span>
                  <strong>{formatNumber(score, locale)}</strong>
                  <em>{formatAbilityModifier(score)}</em>
                </article>
              )
            })}
          </div>
        </div>
      ) : null}

      <div className="champion-dossier__section champion-dossier__section--facts">
        <DetailField
          label={t({ zh: '种族', en: 'Race' })}
          value={characterSheet?.race ? <LocalizedTextStack value={characterSheet.race} /> : t({ zh: '暂无', en: 'None' })}
          variant="compact"
        />
        <DetailField
          label={t({ zh: '职业', en: 'Class' })}
          value={characterSheet?.class ? <LocalizedTextStack value={characterSheet.class} /> : t({ zh: '暂无', en: 'None' })}
          variant="compact"
        />
        <DetailField
          label={t({ zh: '阵营', en: 'Alignment' })}
          value={characterSheet?.alignment ? <LocalizedTextStack value={characterSheet.alignment} /> : t({ zh: '暂无', en: 'None' })}
          variant="compact"
        />
        <DetailField
          label={t({ zh: '年龄', en: 'Age' })}
          value={formatNumber(characterSheet?.age ?? null, locale)}
          variant="compact"
        />
      </div>

      <div className="champion-dossier__section">
        <span className="champion-dossier__meta-label">{t({ zh: '联动', en: 'Affiliations' })}</span>
        {detail.summary.affiliations.length > 0 ? (
          <div className="champion-dossier__meta-list">
            {detail.summary.affiliations.map((item) => (
              <LocalizedTextStack key={`${item.display}-${item.original}`} value={item} />
            ))}
          </div>
        ) : (
          <p className="supporting-text champion-dossier__line">{t({ zh: '暂无', en: 'None yet' })}</p>
        )}
      </div>

      <div className="champion-dossier__stats">
        <article className="dossier-stat">
          <span className="dossier-stat__label">{t({ zh: '升级', en: 'Upgrades' })}</span>
          <strong className="dossier-stat__value">{detail.upgrades.length}</strong>
        </article>
        <article className="dossier-stat">
          <span className="dossier-stat__label">{t({ zh: '天赋', en: 'Feats' })}</span>
          <strong className="dossier-stat__value">{detail.feats.length}</strong>
        </article>
        <article className="dossier-stat">
          <span className="dossier-stat__label">{t({ zh: '皮肤', en: 'Skins' })}</span>
          <strong className="dossier-stat__value">{detail.skins.length}</strong>
        </article>
      </div>

      {overviewFields.length > 0 ? (
        <div className="champion-dossier__section champion-dossier__section--facts">
          {overviewFields.map((field) => (
            <DetailField
              key={field.label}
              label={field.label}
              value={field.value}
              hint={field.hint}
              variant="compact"
            />
          ))}
        </div>
      ) : null}

      {detail.skins.length > 0 ? (
        <button
          type="button"
          className="champion-dossier__artwork-button"
          aria-label={t({ zh: '打开皮肤立绘预览', en: 'Open skin artwork preview' })}
          onClick={() => openArtworkDialog()}
        >
          <span aria-hidden="true" className="champion-dossier__artwork-icon">
            ◎
          </span>
          <span>{t({ zh: '预览皮肤', en: 'Preview skins' })}</span>
        </button>
      ) : null}
    </aside>
  )
}
