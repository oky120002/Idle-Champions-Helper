import { FieldGroup } from '../../components/FieldGroup'
import { getFormationLayoutLabel } from '../../domain/formationLayout'
import { LAYOUT_FILTER_OPTIONS, type FormationPageModel } from './types'

interface FormationLayoutFiltersProps {
  model: FormationPageModel
}

export function FormationLayoutFilters({ model }: FormationLayoutFiltersProps) {
  const {
    filteredLayouts,
    layoutSearch,
    selectedContextKind,
    selectedLayout,
    locale,
    t,
    setLayoutSearch,
    setSelectedContextKind,
    getLayoutFilterLabel,
    handleSelectLayout,
  } = model

  return (
    <>
      <FieldGroup label={t({ zh: '布局筛选', en: 'Layout filters' })} className="filter-group">
        <div className="filter-panel filter-panel--compact">
          <FieldGroup
            label={t({ zh: '关键词', en: 'Keyword' })}
            hint={t({
              zh: '支持搜索布局名、布局备注和来源场景名称，保留中英混搜。',
              en: 'Search layout names, notes, and source context names with mixed Chinese and English.',
            })}
            labelFor="formation-layout-search"
            className="filter-group"
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
              zh: '筛选只影响上方布局选择区，不会自动清空正在编辑的布局。',
              en: 'Filters only affect the layout picker and never clear the layout you are editing.',
            })}
            className="filter-group"
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
      </FieldGroup>

      <FieldGroup label={t({ zh: '布局选择', en: 'Layout' })} className="filter-group">
        {filteredLayouts.length > 0 ? (
          <div className="filter-chip-grid">
            {filteredLayouts.map((layout) => (
              <button
                key={layout.id}
                type="button"
                className={selectedLayout?.id === layout.id ? 'filter-chip filter-chip--active' : 'filter-chip'}
                onClick={() => handleSelectLayout(layout.id)}
              >
                {getFormationLayoutLabel(layout, locale)}
              </button>
            ))}
          </div>
        ) : null}
      </FieldGroup>
    </>
  )
}
