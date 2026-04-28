import { ChampionAvatar } from '../../components/ChampionAvatar'
import { resolveDataUrl } from '../../data/client'
import { getPrimaryLocalizedText, getRoleLabel } from '../../domain/localizedText'
import type { AbilityScoreKey, ChampionDetail, ChampionIllustration } from '../../domain/types'
import { DetailField, LocalizedTextStack } from './detail-cards'
import { formatNumber } from './detail-value-formatters'

interface DossierSectionProps {
  detail: ChampionDetail
  locale: 'zh-CN' | 'en-US'
  t: (text: { zh: string; en: string }) => string
  heroIllustration: ChampionIllustration | null
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
  heroIllustration,
  openArtworkDialog,
}: DossierSectionProps) {
  const characterSheet = detail.characterSheet
  const hasSkinPreview = detail.skins.length > 0
  const primaryName = getPrimaryLocalizedText(detail.summary.name, locale)
  const portrait = heroIllustration ? (
    <img
      className="champion-dossier__hero-art"
      src={resolveDataUrl(heroIllustration.image.path)}
      alt={locale === 'zh-CN' ? `${primaryName}正面立绘` : `${primaryName} front artwork`}
      loading="eager"
      width={heroIllustration.image.width}
      height={heroIllustration.image.height}
    />
  ) : (
    <ChampionAvatar champion={detail.summary} locale={locale} className="champion-avatar--dossier" loading="eager" />
  )

  return (
    <div className="workbench-page__sidebar-stack champion-dossier" role="group" aria-label={t({ zh: '英雄资料栏', en: 'Champion dossier' })}>
      <section className="filter-subgroup champion-dossier__media-panel" aria-label={t({ zh: '英雄立绘', en: 'Champion artwork' })}>
        {hasSkinPreview ? (
          <button
            type="button"
            className="champion-dossier__portrait-action"
            aria-label={t({ zh: '打开皮肤立绘预览', en: 'Open skin artwork preview' })}
            onClick={() => openArtworkDialog()}
          >
            {portrait}
            <span aria-hidden="true" className="champion-dossier__portrait-action-icon">
              ◎
            </span>
          </button>
        ) : (
          portrait
        )}
      </section>

      <section className="filter-subgroup champion-dossier__section">
        <p className="filter-sidebar-panel__section-label">{t({ zh: '定位与来源', en: 'Role and source' })}</p>
        <div className="tag-row champion-dossier__role-strip">
          {detail.summary.roles.map((role) => (
            <span key={role} className="tag-pill">
              {getRoleLabel(role, locale)}
            </span>
          ))}
        </div>
        {detail.eventName ? (
          <DetailField
            label={t({ zh: '活动', en: 'Event' })}
            value={<LocalizedTextStack value={detail.eventName} />}
            variant="compact"
          />
        ) : null}
      </section>

      {characterSheet ? (
        <section className="filter-subgroup champion-dossier__section champion-dossier__section--scores">
          <p className="filter-sidebar-panel__section-label">{t({ zh: '属性', en: 'Abilities' })}</p>
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
        </section>
      ) : null}

      <section className="filter-subgroup champion-dossier__section champion-dossier__section--facts">
        <p className="filter-sidebar-panel__section-label">{t({ zh: '身份', en: 'Identity' })}</p>
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
      </section>

    </div>
  )
}
