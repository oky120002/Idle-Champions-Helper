import { resolveDataUrl } from '../../data/client'
import { SurfaceCard } from '../../components/SurfaceCard'
import type { ChampionSpecializationGraphic } from '../../domain/types'
import { UpgradeSpecializationArt } from './detail-primitives'
import { buildNotAvailableLabel, formatNumber } from './detail-value-formatters'
import type {
  ChampionDetailCssProperties,
  SpecializationUpgradeColumn,
  SpecializationUpgradeEntry,
} from './types'

type DetailUpgradeSectionProps = {
  locale: 'zh-CN' | 'en-US'
  specializationColumns: SpecializationUpgradeColumn[]
  specializationGraphicsById: Map<string, ChampionSpecializationGraphic>
}

function buildEntryNotes(entry: SpecializationUpgradeEntry): string[] {
  const { presentation } = entry

  return [presentation.targetHint, ...presentation.detailLines].filter(
    (value, index, list): value is string =>
      Boolean(value) && value !== presentation.summary && list.indexOf(value) === index,
  )
}

function formatUpgradeLevel(entry: SpecializationUpgradeEntry, locale: 'zh-CN' | 'en-US'): string {
  if (entry.upgrade.requiredLevel == null) {
    return locale === 'zh-CN' ? '无等级' : 'No level'
  }

  return locale === 'zh-CN'
    ? `等级 ${formatNumber(entry.upgrade.requiredLevel, locale)}`
    : `Level ${formatNumber(entry.upgrade.requiredLevel, locale)}`
}

function formatSpecTitle(title: string, locale: 'zh-CN' | 'en-US'): string {
  return locale === 'zh-CN' ? `专精：${title}` : `Spec: ${title}`
}

function formatSpecSummaryLabel(locale: 'zh-CN' | 'en-US'): string {
  return locale === 'zh-CN' ? '专精方案' : 'Specialization plan'
}

function buildUpgradeTypeBadge(
  entry: SpecializationUpgradeEntry | undefined,
): { label: string; className: string } | null {
  if (!entry) {
    return null
  }

  if (entry.relation === 'primary') {
    return null
  }

  if (entry.upgrade.upgradeType === 'unlock_ability' || entry.upgrade.upgradeType === 'unlock_ultimate') {
    return null
  }

  return {
    label: entry.presentation.typeLabel,
    className: 'upgrade-card__type-badge',
  }
}

function SpecializationColumnEntryCard({
  entry,
  locale,
  iconGraphic,
}: {
  entry: SpecializationUpgradeEntry
  locale: 'zh-CN' | 'en-US'
  iconGraphic: ChampionSpecializationGraphic | null
}) {
  const notes = buildEntryNotes(entry)
  const metaItems = [
    entry.presentation.targetLabel
      ? `${locale === 'zh-CN' ? '对象' : 'Target'} · ${entry.presentation.targetLabel}`
      : null,
    entry.presentation.staticMultiplierLabel
      ? `${locale === 'zh-CN' ? '倍率' : 'Multiplier'} · ${entry.presentation.staticMultiplierLabel}`
      : null,
    entry.upgrade.requiredUpgradeId
      ? `${locale === 'zh-CN' ? '前置' : 'Prerequisite'} · ${entry.presentation.prerequisiteLabel}`
      : null,
    !entry.upgrade.defaultEnabled ? (locale === 'zh-CN' ? '默认关闭' : 'Disabled by default') : null,
  ].filter((value): value is string => Boolean(value))
  const typeBadge = buildUpgradeTypeBadge(entry)
  const title = entry.relation === 'primary' ? formatSpecTitle(entry.presentation.title, locale) : entry.presentation.title

  return (
    <article
      className={
        entry.relation === 'primary'
          ? 'specialization-column__entry specialization-column__entry--primary'
          : 'specialization-column__entry'
      }
    >
      <div className="specialization-column__entry-topbar">
        <div className="specialization-column__entry-topline">
          <span className="upgrade-card__level-pill">{formatUpgradeLevel(entry, locale)}</span>
          <h3 className="specialization-column__entry-title">{title}</h3>
          {typeBadge ? <span className={typeBadge.className}>{typeBadge.label}</span> : null}
        </div>
        {iconGraphic ? (
          <UpgradeSpecializationArt
            src={resolveDataUrl(iconGraphic.image.path)}
            alt={locale === 'zh-CN' ? `${entry.presentation.title}图标` : `${entry.presentation.title} icon`}
          />
        ) : null}
      </div>
      {entry.presentation.summary ? (
        <p className="specialization-column__entry-summary">{entry.presentation.summary}</p>
      ) : null}
      {metaItems.length > 0 ? (
        <div className="specialization-column__entry-meta">
          {metaItems.map((item) => (
            <span key={item}>{item}</span>
          ))}
        </div>
      ) : null}
      {notes.length > 0 ? (
        <div className="specialization-column__entry-notes">
          {notes.map((note) => (
            <p key={note}>{note}</p>
          ))}
        </div>
      ) : null}
    </article>
  )
}

function SpecializationColumnCard({
  column,
  locale,
  specializationGraphic,
  specializationGraphicsById,
}: {
  column: SpecializationUpgradeColumn
  locale: 'zh-CN' | 'en-US'
  specializationGraphic: ChampionSpecializationGraphic | null
  specializationGraphicsById: Map<string, ChampionSpecializationGraphic>
}) {
  const primaryEntry = column.entries.find((entry) => entry.relation === 'primary')
  const metricItems = [
    {
      label: locale === 'zh-CN' ? '解锁等级' : 'Unlocks',
      value: primaryEntry ? formatUpgradeLevel(primaryEntry, locale) : buildNotAvailableLabel(locale),
    },
    {
      label: locale === 'zh-CN' ? '关联升级' : 'Linked',
      value: formatNumber(column.entries.length, locale),
    },
    {
      label: locale === 'zh-CN' ? '作用对象' : 'Target',
      value: column.targetLabel ?? (locale === 'zh-CN' ? '当前英雄' : 'Current champion'),
    },
    ...(column.staticMultiplierLabel
      ? [
          {
            label: locale === 'zh-CN' ? '倍率' : 'Multiplier',
            value: column.staticMultiplierLabel,
          },
        ]
      : []),
  ]
  const columnTypeBadge = buildUpgradeTypeBadge(primaryEntry)
  const columnTitle = formatSpecTitle(column.title, locale)

  return (
    <article className="specialization-column">
      <header className="specialization-column__header">
        <div className="specialization-column__header-main">
          <div className="specialization-column__eyebrow-row">
            <span className="specialization-column__summary-pill">{formatSpecSummaryLabel(locale)}</span>
            <h3 className="specialization-column__title">{columnTitle}</h3>
            {columnTypeBadge ? <span className={columnTypeBadge.className}>{columnTypeBadge.label}</span> : null}
          </div>
          {column.summary ? <p className="specialization-column__summary">{column.summary}</p> : null}
        </div>
        {specializationGraphic ? (
          <UpgradeSpecializationArt
            src={resolveDataUrl(specializationGraphic.image.path)}
            alt={locale === 'zh-CN' ? `${column.title}专精图` : `${column.title} specialization art`}
          />
        ) : null}
      </header>

      <dl className="specialization-column__metrics">
        {metricItems.map((item) => (
          <div key={item.label} className="specialization-column__metric">
            <dt>{item.label}</dt>
            <dd>{item.value}</dd>
          </div>
        ))}
      </dl>

      {column.detailLines.length > 0 ? (
        <div className="specialization-column__overview">
          {column.detailLines.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>
      ) : null}

      <div className="specialization-column__timeline">
        {column.entries.map((entry) => (
          <SpecializationColumnEntryCard
            key={entry.upgrade.id}
            entry={entry}
            locale={locale}
            iconGraphic={
              entry.iconGraphicId ? specializationGraphicsById.get(entry.iconGraphicId) ?? null : null
            }
          />
        ))}
      </div>
    </article>
  )
}

export function DetailUpgradeSection({
  locale,
  specializationColumns,
  specializationGraphicsById,
}: DetailUpgradeSectionProps) {
  return (
    <SurfaceCard className="detail-section detail-section--upgrades detail-section--headerless">
      <div id="specializations" className="detail-section-anchor" />

      {specializationColumns.length > 0 ? (
        <div
          className="specialization-column-grid"
          style={{ '--specialization-column-count': specializationColumns.length } as ChampionDetailCssProperties}
        >
          {specializationColumns.map((column) => (
            <SpecializationColumnCard
              key={column.key}
              column={column}
              locale={locale}
              specializationGraphicsById={specializationGraphicsById}
              specializationGraphic={
                column.specializationGraphicId
                  ? specializationGraphicsById.get(column.specializationGraphicId) ?? null
                  : null
              }
            />
          ))}
        </div>
      ) : null}
    </SurfaceCard>
  )
}
