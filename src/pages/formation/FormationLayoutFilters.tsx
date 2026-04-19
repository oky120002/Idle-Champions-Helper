import { FieldGroup } from '../../components/FieldGroup'
import { getFormationLayoutLabel } from '../../domain/formationLayout'
import { getLocalizedTextPair } from '../../domain/localizedText'
import type { FormationLayout } from '../../domain/types'
import { LAYOUT_FILTER_OPTIONS, type FormationPageModel, type LayoutFilterKind } from './types'

interface FormationLayoutFiltersProps {
  model: FormationPageModel
}

export function FormationLayoutFilters({ model }: FormationLayoutFiltersProps) {
  const {
    filteredLayouts,
    layoutSearch,
    selectedContextKind,
    selectedLayout,
    selectedLayoutLabel,
    locale,
    t,
    setLayoutSearch,
    setSelectedContextKind,
    getLayoutFilterLabel,
    handleSelectLayout,
  } = model

  const selectedLayoutKinds = selectedLayout ? getLayoutKinds(selectedLayout) : []
  const selectedLayoutSource = selectedLayout ? getPrimarySourceLabel(selectedLayout, locale) : null

  return (
    <section className="formation-layout-library" aria-label={t({ zh: '布局选择', en: 'Layout library' })}>
      <div className="formation-layout-library__hero">
        <div className="formation-layout-library__copy">
          <span className="formation-layout-library__eyebrow">{t({ zh: '布局选择', en: 'Layout library' })}</span>
          <h3 className="formation-layout-library__title">{t({ zh: '先定场景，再从布局库里选当前画板', en: 'Pick the scenario first, then choose the board from the layout library' })}</h3>
          <p className="formation-layout-library__description">
            {t({
              zh: '参考外部资料站常见的“筛条件 + 当前选中 + 可滚动布局库”节奏，把海量布局收进一个可控面板里，避免整页被按钮淹没。',
              en: 'This follows the common “filters + current selection + scrollable library” rhythm from reference data sites so the full layout library stays manageable instead of flooding the page.',
            })}
          </p>
        </div>

        <div className="formation-layout-library__stats" aria-label={t({ zh: '布局选择概览', en: 'Layout picker overview' })}>
          <article className="formation-layout-library__stat-card">
            <span className="formation-layout-library__stat-label">{t({ zh: '当前匹配', en: 'Matches' })}</span>
            <strong className="formation-layout-library__stat-value">{filteredLayouts.length}</strong>
          </article>
          <article className="formation-layout-library__stat-card">
            <span className="formation-layout-library__stat-label">{t({ zh: '当前布局', en: 'Current layout' })}</span>
            <strong className="formation-layout-library__stat-value formation-layout-library__stat-value--compact">
              {selectedLayoutLabel ?? t({ zh: '未选择', en: 'Not selected' })}
            </strong>
          </article>
        </div>
      </div>

      <div className="formation-layout-library__workspace">
        <div className="formation-layout-library__filters">
          <FieldGroup
            label={t({ zh: '关键词', en: 'Keyword' })}
            hint={t({
              zh: '支持搜索布局名、布局备注和来源场景名称，保留中英混搜。',
              en: 'Search layout names, notes, and source context names with mixed Chinese and English.',
            })}
            labelFor="formation-layout-search"
            className="form-field"
          >
            <input
              id="formation-layout-search"
              className="text-input"
              type="text"
              value={layoutSearch}
              onChange={(event) => setLayoutSearch(event.target.value)}
              placeholder={t({
                zh: '搜布局名、来源战役、冒险或变体',
                en: 'Search layouts, campaigns, adventures, or variants',
              })}
            />
          </FieldGroup>

          <FieldGroup
            label={t({ zh: '场景类型', en: 'Scenario type' })}
            hint={t({
              zh: '筛选只影响布局库，不会自动清空正在编辑的布局。',
              en: 'Filters only affect the library and never clear the layout currently being edited.',
            })}
            className="form-field"
          >
            <div className="filter-chip-grid">
              {LAYOUT_FILTER_OPTIONS.map((kind) => (
                <button
                  key={kind}
                  type="button"
                  className={selectedContextKind === kind ? 'filter-chip filter-chip--active' : 'filter-chip'}
                  onClick={() => setSelectedContextKind(kind)}
                >
                  {getLayoutFilterLabel(kind)}
                </button>
              ))}
            </div>
          </FieldGroup>
        </div>

        <article className="formation-layout-library__selected-card">
          <span className="formation-layout-library__selected-kicker">{t({ zh: '当前编辑布局', en: 'Editing now' })}</span>
          <strong className="formation-layout-library__selected-title">
            {selectedLayoutLabel ?? t({ zh: '未选择布局', en: 'No layout selected' })}
          </strong>
          <p className="formation-layout-library__selected-description">
            {selectedLayoutSource
              ? t({
                  zh: `默认来源：${selectedLayoutSource}`,
                  en: `Primary source: ${selectedLayoutSource}`,
                })
              : t({
                  zh: '当前布局还没有来源场景标记。',
                  en: 'This layout does not expose a source context yet.',
                })}
          </p>

          {selectedLayout ? (
            <div className="formation-layout-library__selected-meta">
              <span className="formation-layout-library__selected-pill">
                {locale === 'zh-CN' ? `${selectedLayout.slots.length} 槽` : `${selectedLayout.slots.length} slots`}
              </span>
              {selectedLayoutKinds.map((kind) => (
                <span key={kind} className="formation-layout-library__selected-pill formation-layout-library__selected-pill--muted">
                  {getLayoutFilterLabel(kind)}
                </span>
              ))}
            </div>
          ) : null}
        </article>
      </div>

      <div className="formation-layout-library__results-head">
        <div className="formation-layout-library__results-copy">
          <strong>{t({ zh: '布局库', en: 'Layout list' })}</strong>
          <span>
            {filteredLayouts.length > 0
              ? t({
                  zh: `按当前条件命中 ${filteredLayouts.length} 个布局，选中后下方画板会立即切换。`,
                  en: `${filteredLayouts.length} layouts match the current filters, and the board below switches immediately once you pick one.`,
                })
              : t({
                  zh: '当前没有匹配布局，可以先放宽关键词或场景类型。',
                  en: 'No layouts match right now. Loosen the keyword or scenario type first.',
                })}
          </span>
        </div>
      </div>

      {filteredLayouts.length > 0 ? (
        <div className="formation-layout-library__list" role="list" aria-label={t({ zh: '可选布局列表', en: 'Available layouts' })}>
          {filteredLayouts.map((layout) => {
            const isSelected = selectedLayout?.id === layout.id
            const primarySource = getPrimarySourceLabel(layout, locale)
            const kinds = getLayoutKinds(layout)

            return (
              <button
                key={layout.id}
                type="button"
                aria-label={getFormationLayoutLabel(layout, locale)}
                className={
                  isSelected
                    ? 'formation-layout-card formation-layout-card--active'
                    : 'formation-layout-card'
                }
                onClick={() => handleSelectLayout(layout.id)}
              >
                <div className="formation-layout-card__topline">
                  <strong className="formation-layout-card__title">{getFormationLayoutLabel(layout, locale)}</strong>
                  <span className="formation-layout-card__count">
                    {locale === 'zh-CN' ? `${layout.slots.length} 槽` : `${layout.slots.length} slots`}
                  </span>
                </div>

                <div className="formation-layout-card__meta-row">
                  {kinds.map((kind) => (
                    <span key={kind} className="formation-layout-card__meta-pill">
                      {getLayoutFilterLabel(kind)}
                    </span>
                  ))}
                </div>

                <span className="formation-layout-card__source">
                  {primarySource ?? t({ zh: '当前没有来源场景标记', en: 'No source context label yet' })}
                </span>
              </button>
            )
          })}
        </div>
      ) : null}
    </section>
  )
}

function getPrimarySourceLabel(layout: FormationLayout, locale: FormationPageModel['locale']): string | null {
  const primarySource = layout.sourceContexts?.[0]

  return primarySource ? getLocalizedTextPair(primarySource.name, locale) : null
}

function getLayoutKinds(layout: FormationLayout): Array<Exclude<LayoutFilterKind, 'all'>> {
  const sourceKinds = layout.sourceContexts?.map((context) => context.kind) ?? []
  const applicableKinds = layout.applicableContexts?.map((context) => context.kind) ?? []

  return [...new Set([...sourceKinds, ...applicableKinds])].filter(isLayoutFilterKind)
}

function isLayoutFilterKind(kind: string): kind is Exclude<LayoutFilterKind, 'all'> {
  return kind === 'campaign' || kind === 'adventure' || kind === 'variant'
}
