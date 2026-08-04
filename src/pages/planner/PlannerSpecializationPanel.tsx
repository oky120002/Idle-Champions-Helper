import { useI18n } from '../../app/i18n'
import { getPrimaryLocalizedText } from '../../domain/localizedText'
import type { Champion } from '../../domain/types'
import type { OwnedHero } from '../../domain/user-profile/types'
import type { SpecializationCatalog, SpecializationEntry } from '../../domain/abilities/specializationSignals'
import {
  applyTierSelection,
  availableSpecializations,
  groupSpecializationsByTier,
  pruneOrphanedSpecializations,
  type SpecializationOverrideMap,
  type SpecializationTier,
} from './specializationSelection'

interface PlannerSpecializationPanelProps {
  ownedHeroes: OwnedHero[]
  catalog: SpecializationCatalog
  overrides: SpecializationOverrideMap
  championById: Map<string, Champion>
  onSetOverride: (heroId: string, upgradeIds: string[]) => void
  onClearOverride: (heroId: string) => void
}

/**
 * 专精选择面板（ADR 0017 的页面 UI 输入来源）。
 *
 * 列出「已拥有 ∧ catalog 有专精」的英雄，按 requiredLevel 分层渲染互斥单选；
 * 选择写入 session 级 override（不写回存档），经 usePlannerPageModel 合并进有效 snapshot 喂 engine。
 * 多层英雄（如 hero 88 的 6 层）每层各选一个；单层英雄（多数）即一组单选。
 *
 * 级联型专精树（hero 165/81）：依赖层选项 requiredUpgradeId 指向上层某个选择。每层渲染前用
 * availableSpecializations 过滤掉前置未满足的选项（仅显示与已选上层匹配的分支），且每次选择后用
 * pruneOrphanedSpecializations 级联清掉因改上层而孤立的下层——杜绝游戏不可能的组合（DPS 虚高）。
 * catalog 保留无 signal 的结构 gate 节点，使依赖链完整、上层可选择。
 *
 * 折叠用原生 <details>（默认收起，避免长列表挤占工作台）。
 */
export function PlannerSpecializationPanel({
  ownedHeroes,
  catalog,
  overrides,
  championById,
  onSetOverride,
  onClearOverride,
}: PlannerSpecializationPanelProps) {
  const { t, locale } = useI18n()

  const heroesWithSpecs = ownedHeroes.filter((hero) => (catalog[hero.heroId]?.length ?? 0) > 0)
  if (heroesWithSpecs.length === 0) {
    return null
  }

  const customizedCount = heroesWithSpecs.reduce(
    (count, hero) => count + (Object.prototype.hasOwnProperty.call(overrides, hero.heroId) ? 1 : 0),
    0,
  )

  return (
    <details className="planner-specialization-panel" data-testid="planner-specialization-panel">
      <summary className="planner-specialization-panel__summary">
        <strong className="planner-specialization-panel__title">
          {t({ zh: '专精选择', en: 'Specializations' })}
        </strong>
        <span className="planner-specialization-panel__hint">
          {customizedCount > 0
            ? t({ zh: `${customizedCount} 名已自定义`, en: `${customizedCount} customized` })
            : t({ zh: '按英雄设定专精偏好', en: 'Set specialization per champion' })}
        </span>
      </summary>
      <div className="planner-specialization-panel__body">
        {heroesWithSpecs.map((hero) => {
          const entries = catalog[hero.heroId] ?? []
          const effective = overrides[hero.heroId] ?? hero.specializations
          const isOverridden = Object.prototype.hasOwnProperty.call(overrides, hero.heroId)
          const champion = championById.get(hero.heroId)
          const heroName = champion ? getPrimaryLocalizedText(champion.name, locale) : hero.heroId
          return (
            <div key={hero.heroId} className="planner-specialization-row" data-hero-id={hero.heroId}>
              <div className="planner-specialization-row__header">
                <strong className="planner-specialization-row__name">{heroName}</strong>
                {isOverridden ? (
                  <button
                    type="button"
                    className="planner-specialization-row__reset"
                    data-reset-hero={hero.heroId}
                    onClick={() => onClearOverride(hero.heroId)}
                  >
                    {t({ zh: '恢复存档', en: 'Reset' })}
                  </button>
                ) : null}
              </div>
              {groupSpecializationsByTier(availableSpecializations(entries, effective)).map((tier, tierIndex) => (
                <SpecializationTierRadios
                  key={tier.requiredLevel ?? `tier-${tierIndex}`}
                  heroId={hero.heroId}
                  tier={tier}
                  tierIndex={tierIndex}
                  effective={effective}
                  t={t}
                  onSelect={(selected) => {
                    const afterTier = applyTierSelection(
                      effective,
                      tier.entries.map((entry) => entry.upgradeId),
                      selected,
                    )
                    onSetOverride(hero.heroId, pruneOrphanedSpecializations(afterTier, entries))
                  }}
                />
              ))}
            </div>
          )
        })}
      </div>
    </details>
  )
}

interface SpecializationTierRadiosProps {
  heroId: string
  tier: SpecializationTier
  tierIndex: number
  effective: readonly string[]
  t: (text: { zh: string; en: string }) => string
  onSelect: (selected: string | null) => void
}

function SpecializationTierRadios({
  heroId,
  tier,
  tierIndex,
  effective,
  t,
  onSelect,
}: SpecializationTierRadiosProps) {
  const tierIds = tier.entries.map((entry) => entry.upgradeId)
  const selectedId = effective.find((id) => tierIds.includes(id)) ?? null
  const groupName = `spec-${heroId}-tier-${tier.requiredLevel ?? tierIndex}`
  const legend =
    tier.requiredLevel !== null
      ? t({ zh: `解锁等级 ${tier.requiredLevel}`, en: `Unlocks at Lv.${tier.requiredLevel}` })
      : t({ zh: '专精', en: 'Specialization' })

  return (
    <fieldset className="planner-specialization-tier">
      <legend className="planner-specialization-tier__legend">{legend}</legend>
      <label className="planner-specialization-tier__option">
        <input
          type="radio"
          name={groupName}
          value=""
          checked={selectedId === null}
          onChange={() => onSelect(null)}
          data-spec-option="none"
        />
        <span>{t({ zh: '无', en: 'None' })}</span>
      </label>
      {tier.entries.map((entry: SpecializationEntry) => (
        <label key={entry.upgradeId} className="planner-specialization-tier__option">
          <input
            type="radio"
            name={groupName}
            value={entry.upgradeId}
            checked={selectedId === entry.upgradeId}
            onChange={() => onSelect(entry.upgradeId)}
            data-spec-option={entry.upgradeId}
          />
          <span>{entry.specializationName?.display ?? entry.upgradeId}</span>
        </label>
      ))}
    </fieldset>
  )
}
