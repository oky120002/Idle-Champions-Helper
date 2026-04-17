import { LocalizedText } from '../../components/LocalizedText'
import { getLocalizedTextPair } from '../../domain/localizedText'
import type { VariantAreaHighlight } from '../../domain/types'
import {
  getAreaHighlightLabel,
  getAttackMixSummary,
  getEnemyTypeLabel,
} from './variant-labels'
import type { VariantAdventureGroup, VariantsPageModel } from './types'
import { VariantFormationMiniBoard } from './VariantFormationMiniBoard'
import { VariantResultCard } from './VariantResultCard'

type VariantAdventureSectionProps = {
  model: Pick<VariantsPageModel, 'locale' | 't'>
  group: VariantAdventureGroup
}

function getObjectiveAreaSummaryLabel(group: VariantAdventureGroup, locale: 'zh-CN' | 'en-US'): string | null {
  if (group.objectiveAreas.length === 0) {
    return null
  }

  if (group.objectiveAreas.length <= 3) {
    const joined = group.objectiveAreas
      .map((area) => (locale === 'zh-CN' ? `${area} 区` : `Area ${area}`))
      .join(locale === 'zh-CN' ? ' / ' : ' / ')

    return locale === 'zh-CN' ? `目标 ${joined}` : `Targets ${joined}`
  }

  const firstArea = group.objectiveAreas[0]
  const lastArea = group.objectiveAreas[group.objectiveAreas.length - 1]

  if (firstArea === undefined || lastArea === undefined) {
    return null
  }

  return locale === 'zh-CN'
    ? `目标 ${firstArea}-${lastArea} 区`
    : `Targets ${firstArea}-${lastArea}`
}

function getSpecialEnemySummaryLabel(group: VariantAdventureGroup, locale: 'zh-CN' | 'en-US'): string {
  if (group.specialEnemyMin === group.specialEnemyMax) {
    return locale === 'zh-CN'
      ? `${group.specialEnemyMax} 个特别敌人`
      : `${group.specialEnemyMax} special enemies`
  }

  return locale === 'zh-CN'
    ? `${group.specialEnemyMin}-${group.specialEnemyMax} 个特别敌人`
    : `${group.specialEnemyMin}-${group.specialEnemyMax} special enemies`
}

function getGroupAreaHighlights(group: VariantAdventureGroup): VariantAreaHighlight[] {
  const byId = new Map<string, VariantAreaHighlight>()

  for (const variant of group.variants) {
    for (const highlight of variant.areaHighlights) {
      if (!byId.has(highlight.id)) {
        byId.set(highlight.id, highlight)
      }
    }
  }

  return Array.from(byId.values()).sort(
    (left, right) => left.start - right.start || left.kind.localeCompare(right.kind),
  )
}

export function VariantAdventureSection({ model, group }: VariantAdventureSectionProps) {
  const { locale, t } = model
  const areaHighlights = getGroupAreaHighlights(group)
  const enemyTypes = group.enemyTypes.slice(0, 8)
  const sceneLabel = group.scene ? getLocalizedTextPair(group.scene, locale) : null
  const objectiveAreaSummary = getObjectiveAreaSummaryLabel(group, locale)

  return (
    <section className="variant-adventure">
      <div className="variant-adventure__hero">
        <div className="variant-adventure__copy">
          <LocalizedText
            text={group.adventure}
            mode="stacked"
            as="div"
            className="variant-adventure__title-stack"
            primaryAs="h4"
            primaryClassName="variant-adventure__title"
            secondaryAs="span"
            secondaryClassName="variant-adventure__secondary"
          />

          <p className="variant-adventure__summary">
            {t({
              zh: `按游戏结构把同一冒险底下的变体并排展开，方便先看阵型、敌人和区域，再决定要不要细看限制。`,
              en: `Variants from the same adventure stay grouped together so you can scan formation, enemies, and area pacing before diving into restriction text.`,
            })}
          </p>

          <div className="variant-meta-row">
            {sceneLabel ? <span className="variant-meta-pill">{sceneLabel}</span> : null}
            {objectiveAreaSummary ? <span className="variant-meta-pill">{objectiveAreaSummary}</span> : null}
            <span className="variant-meta-pill variant-meta-pill--accent">
              {getSpecialEnemySummaryLabel(group, locale)}
            </span>
          </div>
        </div>

        <VariantFormationMiniBoard formation={group.formation} locale={locale} t={t} />
      </div>

      <div className="variant-adventure__intel-grid">
        <section className="variant-adventure__intel">
          <span className="variant-adventure__intel-label">{t({ zh: '敌人类型', en: 'Enemy types' })}</span>
          <div className="variant-chip-row">
            {enemyTypes.map((enemyType) => (
              <span key={enemyType} className="variant-chip">
                {getEnemyTypeLabel(enemyType, locale)}
              </span>
            ))}
          </div>
        </section>

        <section className="variant-adventure__intel">
          <span className="variant-adventure__intel-label">{t({ zh: '攻击占比', en: 'Attack mix' })}</span>
          <div className="variant-attack-bar" aria-hidden="true">
            <span
              className="variant-attack-bar__segment variant-attack-bar__segment--melee"
              style={{ flexGrow: Math.max(group.attackMix.melee, 0.35) }}
            />
            <span
              className="variant-attack-bar__segment variant-attack-bar__segment--ranged"
              style={{ flexGrow: Math.max(group.attackMix.ranged, 0.2) }}
            />
            <span
              className="variant-attack-bar__segment variant-attack-bar__segment--other"
              style={{ flexGrow: Math.max(group.attackMix.magic + group.attackMix.other, 0.15) }}
            />
          </div>
          <p className="variant-adventure__intel-copy">{getAttackMixSummary(group.attackMix, locale)}</p>
        </section>

        <section className="variant-adventure__intel">
          <span className="variant-adventure__intel-label">{t({ zh: '区域（Area）', en: 'Areas' })}</span>
          <div className="variant-chip-row">
            {group.areaMilestones.slice(0, 6).map((area) => (
              <span key={`${group.id}-area-${area}`} className="variant-chip variant-chip--soft">
                {locale === 'zh-CN' ? `${area} 区` : `Area ${area}`}
              </span>
            ))}
            {areaHighlights.slice(0, 3).map((highlight) => (
              <span key={highlight.id} className="variant-chip variant-chip--soft">
                {getAreaHighlightLabel(highlight, locale)}
              </span>
            ))}
          </div>
        </section>
      </div>

      <div className="variant-entry-stack">
        {group.variants.map((variant) => (
          <VariantResultCard key={variant.id} model={model} variant={variant} />
        ))}
      </div>
    </section>
  )
}
