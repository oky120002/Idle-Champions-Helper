import { SurfaceCard } from '../../components/SurfaceCard'
import { getPrimaryLocalizedText } from '../../domain/localizedText'
import type { ChampionDetail } from '../../domain/types'
import { DetailField, LocalizedTextStack } from './detail-cards'
import { formatNumber } from './detail-value-formatters'

type DetailCharacterSectionProps = {
  detail: ChampionDetail
  locale: 'zh-CN' | 'en-US'
  t: (text: { zh: string; en: string }) => string
}

export function DetailCharacterSection({ detail, locale, t }: DetailCharacterSectionProps) {
  return (
    <SurfaceCard
      className="detail-section detail-section--character"
      eyebrow={t({ zh: '角色卡', en: 'Character sheet' })}
      title={t({ zh: '叙事资料与能力分布', en: 'Narrative profile and ability spread' })}
      description={t({
        zh: '把角色设定、D&D 属性和背景故事分在同一段，方便同时看机制与人设。',
        en: 'Keep the lore profile, D&D stats, and backstory together so mechanics and flavor stay connected.',
      })}
    >
      <div id="character-sheet" className="detail-section-anchor" />
      {detail.characterSheet ? (
        <>
          <div className="detail-field-grid">
            <DetailField
              label={t({ zh: '全名', en: 'Full name' })}
              value={
                detail.characterSheet.fullName ? (
                  <LocalizedTextStack value={detail.characterSheet.fullName} />
                ) : (
                  t({ zh: '暂无', en: 'Not available' })
                )
              }
            />
            <DetailField
              label={t({ zh: '职业', en: 'Class' })}
              value={
                detail.characterSheet.class ? (
                  <LocalizedTextStack value={detail.characterSheet.class} />
                ) : (
                  t({ zh: '暂无', en: 'Not available' })
                )
              }
            />
            <DetailField
              label={t({ zh: '种族', en: 'Race' })}
              value={
                detail.characterSheet.race ? (
                  <LocalizedTextStack value={detail.characterSheet.race} />
                ) : (
                  t({ zh: '暂无', en: 'Not available' })
                )
              }
            />
            <DetailField
              label={t({ zh: '阵营', en: 'Alignment' })}
              value={
                detail.characterSheet.alignment ? (
                  <LocalizedTextStack value={detail.characterSheet.alignment} />
                ) : (
                  t({ zh: '暂无', en: 'Not available' })
                )
              }
            />
            <DetailField label={t({ zh: '年龄', en: 'Age' })} value={formatNumber(detail.characterSheet.age, locale)} />
          </div>

          <div className="ability-score-grid">
            {(['str', 'dex', 'con', 'int', 'wis', 'cha'] as const).map((key) => (
              <article key={key} className="ability-score-card">
                <span className="ability-score-card__label">{key.toUpperCase()}</span>
                <strong className="ability-score-card__value">
                  {formatNumber(detail.characterSheet?.abilityScores[key] ?? null, locale)}
                </strong>
              </article>
            ))}
          </div>

          {detail.characterSheet.backstory ? (
            <article className="detail-subcard detail-subcard--story">
              <h3 className="detail-subcard__title">{t({ zh: '背景故事', en: 'Backstory' })}</h3>
              <p className="detail-subcard__body">{getPrimaryLocalizedText(detail.characterSheet.backstory, locale)}</p>
            </article>
          ) : null}
        </>
      ) : (
        <div className="status-banner status-banner--info">
          {t({ zh: '当前没有角色卡字段。', en: 'No character sheet fields are available here.' })}
        </div>
      )}
    </SurfaceCard>
  )
}
