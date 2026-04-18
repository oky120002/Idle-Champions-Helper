import { ChampionAvatar } from '../../components/ChampionAvatar'
import { getPrimaryLocalizedText, getRoleLabel, getSecondaryLocalizedText } from '../../domain/localizedText'
import type { ChampionDetail } from '../../domain/types'
import { DetailField, LocalizedTextStack } from './detail-cards'
import type { DetailFieldProps, DetailSectionLink } from './types'

interface DossierSectionProps {
  detail: ChampionDetail
  locale: 'zh-CN' | 'en-US'
  t: (text: { zh: string; en: string }) => string
  summaryAvailabilityBadges: Array<{ key: string; label: string; active?: boolean }>
  overviewFields: DetailFieldProps[]
  sectionLinks: DetailSectionLink[]
  activeSectionId: DetailSectionLink['id']
  scrollToSection: (id: string) => void
  openArtworkDialog: (skinId?: string) => void
}

export function DossierSection({
  detail,
  locale,
  t,
  summaryAvailabilityBadges,
  overviewFields,
  sectionLinks,
  activeSectionId,
  scrollToSection,
  openArtworkDialog,
}: DossierSectionProps) {
  return (
    <section className="champion-dossier">
      <div id="overview" className="detail-section-anchor" />

      <div className="champion-dossier__grid">
        <div className="champion-dossier__identity">
          <div className="champion-dossier__avatar-stage">
            <ChampionAvatar champion={detail.summary} locale={locale} className="champion-avatar--dossier" loading="eager" />
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
                <span>{t({ zh: '看皮肤立绘', en: 'View skins' })}</span>
              </button>
            ) : null}
          </div>
          <div className="champion-dossier__copy">
            <div className="champion-dossier__title-block">
              <p className="champion-dossier__eyebrow">
                {locale === 'zh-CN' ? `${detail.summary.seat} 号位` : `Seat ${detail.summary.seat}`}
              </p>
              <h2 className="champion-dossier__title">{getPrimaryLocalizedText(detail.summary.name, locale)}</h2>
              {getSecondaryLocalizedText(detail.summary.name, locale) ? (
                <p className="champion-dossier__secondary">{getSecondaryLocalizedText(detail.summary.name, locale)}</p>
              ) : null}
            </div>

            <div className="tag-row champion-dossier__role-strip">
              {detail.summary.roles.map((role) => (
                <span key={role} className="tag-pill">
                  {getRoleLabel(role, locale)}
                </span>
              ))}
            </div>

            <div className="champion-dossier__meta-strip">
              <div className="champion-dossier__meta-stack">
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
            </div>
          </div>
        </div>

        <div className="champion-dossier__stats-panel">
          <div className="champion-dossier__stats-head">
            <span className="champion-dossier__meta-label">{t({ zh: '卷宗计数', en: 'Dossier tally' })}</span>
            <p className="champion-dossier__line">
              {t({
                zh: '先看资料体量，再决定深入哪一段。',
                en: 'Check the dossier weight first, then decide where to dig in.',
              })}
            </p>
          </div>
          <div className="champion-dossier__stats">
            <article className="dossier-stat">
              <span className="dossier-stat__label">{t({ zh: '升级', en: 'Upgrades' })}</span>
              <strong className="dossier-stat__value">{detail.upgrades.length}</strong>
              <span className="dossier-stat__meta">{t({ zh: '成长轨道', en: 'Progression track' })}</span>
            </article>
            <article className="dossier-stat">
              <span className="dossier-stat__label">{t({ zh: '天赋', en: 'Feats' })}</span>
              <strong className="dossier-stat__value">{detail.feats.length}</strong>
              <span className="dossier-stat__meta">{t({ zh: '可装备条目', en: 'Equipable entries' })}</span>
            </article>
            <article className="dossier-stat">
              <span className="dossier-stat__label">{t({ zh: '皮肤', en: 'Skins' })}</span>
              <strong className="dossier-stat__value">{detail.skins.length}</strong>
              <span className="dossier-stat__meta">{t({ zh: '立绘与外观', en: 'Art + cosmetics' })}</span>
            </article>
          </div>
        </div>
      </div>

      <div className="champion-dossier__overview-panel">
        <div className="champion-dossier__panel-head">
          <div className="champion-dossier__panel-copy">
            <span className="champion-dossier__meta-label">{t({ zh: '概览', en: 'Overview' })}</span>
            <p className="champion-dossier__line">
              {t({
                zh: '把会影响筛选、解读和排错的系统字段直接并入顶部卡片，避免来回切区块。',
                en: 'Keep the fields used for filtering, interpretation, and data checks inside the top dossier card.',
              })}
            </p>
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

        <div className="detail-field-grid detail-field-grid--compact champion-dossier__overview-grid">
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
      </div>

      <div className="champion-dossier__footer">
        <div className="champion-dossier__footer-panel champion-dossier__footer-panel--jump">
          <div className="champion-dossier__panel-head champion-dossier__panel-head--jump">
            <div className="champion-dossier__panel-copy">
              <span className="champion-dossier__meta-label">{t({ zh: '章节跳转', en: 'Section jump' })}</span>
              <p className="champion-dossier__line">
                {t({
                  zh: '概览已经并入顶部卡片，下面继续按角色卡、战斗、升级和天赋展开。',
                  en: 'Overview now lives in the top dossier card. Continue through character, combat, upgrades, and feats below.',
                })}
              </p>
            </div>
          </div>
          <div className="section-jump-bar">
            {sectionLinks.map((section, index) => (
              <button
                key={section.id}
                type="button"
                aria-label={section.label}
                className={
                  activeSectionId === section.id
                    ? 'section-jump-bar__button section-jump-bar__button--active'
                    : 'section-jump-bar__button'
                }
                aria-pressed={activeSectionId === section.id}
                onClick={() => scrollToSection(section.id)}
              >
                <span aria-hidden="true" className="section-jump-bar__button-index">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <span className="section-jump-bar__button-text">{section.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
