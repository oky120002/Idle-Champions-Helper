import type { MessageRef, TranslateParams } from '../../app/i18n'
import { SurfaceCard } from '../../components/SurfaceCard'
import { getPrimaryLocalizedText } from '../../domain/localizedText'
import type { ChampionDetail } from '../../domain/types'
import { DetailField, LocalizedTextStack } from './detail-cards'
import { formatNumber } from './detail-value-formatters'

type DetailCharacterSectionProps = {
  readonly detail: ChampionDetail
  readonly locale: 'zh-CN' | 'en-US'
  readonly t: (text: string | MessageRef, params?: TranslateParams) => string
}

export function DetailCharacterSection({ detail, locale, t }: DetailCharacterSectionProps) {
  return (
    <SurfaceCard className="detail-section detail-section--character detail-section--headerless">
      <div id="character-sheet" className="detail-section-anchor" />

      {detail.characterSheet ? (
        <>
          <div className="detail-field-grid">
            <DetailField
              label={t("全名")}
              value={
                detail.characterSheet.fullName ? (
                  <LocalizedTextStack value={detail.characterSheet.fullName} />
                ) : (
                  t("暂无")
                )
              }
            />
            <DetailField
              label={t("职业")}
              value={
                detail.characterSheet.class ? (
                  <LocalizedTextStack value={detail.characterSheet.class} />
                ) : (
                  t("暂无")
                )
              }
            />
            <DetailField
              label={t("种族")}
              value={
                detail.characterSheet.race ? (
                  <LocalizedTextStack value={detail.characterSheet.race} />
                ) : (
                  t("暂无")
                )
              }
            />
            <DetailField
              label={t("阵营")}
              value={
                detail.characterSheet.alignment ? (
                  <LocalizedTextStack value={detail.characterSheet.alignment} />
                ) : (
                  t("暂无")
                )
              }
            />
            <DetailField label={t("年龄")} value={formatNumber(detail.characterSheet.age, locale)} />
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
              <h3 className="detail-subcard__title">{t("背景故事")}</h3>
              <p className="detail-subcard__body">{getPrimaryLocalizedText(detail.characterSheet.backstory, locale)}</p>
            </article>
          ) : null}
        </>
      ) : (
        <div className="status-banner status-banner--info">
          {t("当前没有角色卡字段。")}
        </div>
      )}
    </SurfaceCard>
  )
}
