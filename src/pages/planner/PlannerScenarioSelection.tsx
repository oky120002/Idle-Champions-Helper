import { useMemo, useState } from 'react'
import { useI18n } from '../../app/i18n'
import { getPrimaryLocalizedText } from '../../domain/localizedText'
import type { Variant } from '../../domain/types'

interface PlannerScenarioSelectionProps {
  variants: Variant[]
  selectedId?: string | null
  onSelectedIdChange?: (variantId: string | null) => void
}

export function PlannerScenarioSelection({
  variants,
  selectedId: controlledSelectedId,
  onSelectedIdChange,
}: PlannerScenarioSelectionProps) {
  const { locale, t } = useI18n()
  const [search, setSearch] = useState('')
  const [uncontrolledSelectedId, setUncontrolledSelectedId] = useState<string | null>(null)
  const selectedId = controlledSelectedId === undefined ? uncontrolledSelectedId : controlledSelectedId

  function updateSelectedId(nextSelectedId: string | null) {
    if (controlledSelectedId === undefined) {
      setUncontrolledSelectedId(nextSelectedId)
    }
    onSelectedIdChange?.(nextSelectedId)
  }

  const query = search.trim().toLowerCase()

  const filtered = useMemo(
    () =>
      query
        ? variants.filter((v) => {
            const name = getPrimaryLocalizedText(v.name, locale).toLowerCase()
            const campaign = getPrimaryLocalizedText(v.campaign, locale).toLowerCase()
            const adventure = v.adventure ? getPrimaryLocalizedText(v.adventure, locale).toLowerCase() : ''
            const restrictions = v.restrictions
              .map((r) => getPrimaryLocalizedText(r, locale).toLowerCase())
              .join(' ')
            return (
              name.includes(query) ||
              campaign.includes(query) ||
              adventure.includes(query) ||
              restrictions.includes(query)
            )
          })
        : variants,
    [variants, query, locale],
  )

  const selected = selectedId ? variants.find((v) => v.id === selectedId) ?? null : null

  return (
    <div className="planner-scenario-selection">
      <div className="planner-scenario-selection__filter">
        <label htmlFor="planner-scenario-search">
          {t({ zh: '搜索场景', en: 'Search scenarios' })}
        </label>
        <input
          id="planner-scenario-search"
          type="search"
          role="searchbox"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={t({ zh: '按名称、战役或限制筛选', en: 'Filter by name, campaign, or restrictions' })}
        />
      </div>

      <ul className="planner-scenario-selection__list" role="listbox" aria-label={t({ zh: '场景列表', en: 'Scenario list' })}>
        {filtered.map((variant) => {
          const isSelected = variant.id === selectedId
          const label = getPrimaryLocalizedText(variant.name, locale)
          const campaign = getPrimaryLocalizedText(variant.campaign, locale)

          return (
            <li key={variant.id} role="option" aria-selected={isSelected}>
              <button
                type="button"
                className={`planner-scenario-selection__item${isSelected ? ' planner-scenario-selection__item--selected' : ''}`}
                onClick={() => updateSelectedId(isSelected ? null : variant.id)}
              >
                <span className="planner-scenario-selection__item-name">{label}</span>
                <span className="planner-scenario-selection__item-campaign">{campaign}</span>
                {variant.objectiveArea !== null ? (
                  <span className="planner-scenario-selection__item-area">
                    {locale === 'zh-CN'
                      ? `${variant.objectiveArea} 区完成`
                      : `Finish at ${variant.objectiveArea}`}
                  </span>
                ) : null}
              </button>
            </li>
          )
        })}
      </ul>

      {selected ? (
        <section
          className="planner-scenario-selection__detail"
          aria-label={t({ zh: '选中场景详情', en: 'Selected scenario details' })}
        >
          <h4 className="planner-scenario-selection__detail-title">
            {getPrimaryLocalizedText(selected.name, locale)}
          </h4>

          <div className="planner-scenario-selection__detail-formation">
            <span className="planner-scenario-selection__detail-label">
              {t({ zh: '阵型信息', en: 'Formation info' })}
            </span>
            {selected.adventure ? (
              <p>{getPrimaryLocalizedText(selected.adventure, locale)}</p>
            ) : null}
            {selected.objectiveArea !== null ? (
              <p>
                {locale === 'zh-CN'
                  ? `目标区域：${selected.objectiveArea}`
                  : `Objective area: ${selected.objectiveArea}`}
              </p>
            ) : null}
            {selected.scene ? (
              <p>{getPrimaryLocalizedText(selected.scene, locale)}</p>
            ) : null}
          </div>

          <div className="planner-scenario-selection__detail-restrictions">
            <span className="planner-scenario-selection__detail-label">
              {t({ zh: '限制条件', en: 'Restrictions' })}
            </span>
            {selected.restrictions.length > 0 ? (
              <ul className="planner-scenario-selection__restriction-list">
                {selected.restrictions.map((restriction) => (
                  <li key={`${restriction.original}-${restriction.display}`}>
                    {getPrimaryLocalizedText(restriction, locale)}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="supporting-text">
                {t({ zh: '无额外限制。', en: 'No additional restrictions.' })}
              </p>
            )}
          </div>
        </section>
      ) : null}
    </div>
  )
}
