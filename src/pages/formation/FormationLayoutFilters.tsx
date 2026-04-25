import { getFormationLayoutLabel } from '../../domain/formationLayout'
import { getLocalizedTextPair } from '../../domain/localizedText'
import type { FormationLayout } from '../../domain/types'
import { LAYOUT_FILTER_OPTIONS, type FormationPageModel, type LayoutFilterKind } from './types'
import { FormationLayoutLibraryScaffold } from './FormationLayoutLibraryScaffold'

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
  const stats = [
    {
      id: 'matches',
      label: t({ zh: '当前匹配', en: 'Matches' }),
      value: filteredLayouts.length,
    },
    {
      id: 'selected-layout',
      label: t({ zh: '当前布局', en: 'Current layout' }),
      value: selectedLayoutLabel ?? t({ zh: '未选择', en: 'Not selected' }),
      compact: true,
    },
  ]
  const fields = [
    {
      kind: 'search' as const,
      id: 'keyword',
      inputId: 'formation-layout-search',
      label: t({ zh: '关键词', en: 'Keyword' }),
      value: layoutSearch,
      onChange: setLayoutSearch,
      hint: t({
        zh: '支持搜索布局名、布局备注和来源场景名称，保留中英混搜。',
        en: 'Search layout names, notes, and source context names with mixed Chinese and English.',
      }),
      placeholder: t({
        zh: '搜布局名、来源战役、冒险或变体',
        en: 'Search layouts, campaigns, adventures, or variants',
      }),
    },
    {
      kind: 'chip-single' as const,
      id: 'scenario-type',
      label: t({ zh: '场景类型', en: 'Scenario type' }),
      selectedValue: selectedContextKind,
      onChange: (value: string) => setSelectedContextKind(value as LayoutFilterKind),
      hint: t({
        zh: '筛选只影响布局库，不会自动清空正在编辑的布局。',
        en: 'Filters only affect the library and never clear the layout currently being edited.',
      }),
      options: LAYOUT_FILTER_OPTIONS.map((kind) => ({
        value: kind,
        label: getLayoutFilterLabel(kind),
      })),
    },
  ]
  const selectionPills = selectedLayout
    ? [
        {
          id: 'slot-count',
          label: locale === 'zh-CN' ? `${selectedLayout.slots.length} 槽` : `${selectedLayout.slots.length} slots`,
        },
        ...selectedLayoutKinds.map((kind) => ({
          id: kind,
          label: getLayoutFilterLabel(kind),
          tone: 'muted' as const,
        })),
      ]
    : []
  const cards = filteredLayouts.map((layout) => {
    const isSelected = selectedLayout?.id === layout.id
    const primarySource = getPrimarySourceLabel(layout, locale)
    const kinds = getLayoutKinds(layout)

    return {
      id: layout.id,
      ariaLabel: getFormationLayoutLabel(layout, locale),
      title: getFormationLayoutLabel(layout, locale),
      countLabel: locale === 'zh-CN' ? `${layout.slots.length} 槽` : `${layout.slots.length} slots`,
      sourceLabel: primarySource ?? t({ zh: '当前没有来源场景标记', en: 'No source context label yet' }),
      metaPills: kinds.map((kind) => ({
        id: `${layout.id}-${kind}`,
        label: getLayoutFilterLabel(kind),
      })),
      isActive: isSelected,
      onSelect: () => handleSelectLayout(layout.id),
    }
  })
  const resultsDescription = filteredLayouts.length > 0
    ? t({
        zh: `按当前条件命中 ${filteredLayouts.length} 个布局，选中后下方画板会立即切换。`,
        en: `${filteredLayouts.length} layouts match the current filters, and the board below switches immediately once you pick one.`,
      })
    : t({
        zh: '当前没有匹配布局，可以先放宽关键词或场景类型。',
        en: 'No layouts match right now. Loosen the keyword or scenario type first.',
      })

  return (
    <FormationLayoutLibraryScaffold
      ariaLabel={t({ zh: '布局选择', en: 'Layout library' })}
      eyebrow={t({ zh: '布局选择', en: 'Layout library' })}
      title={t({ zh: '先定场景，再从布局库里选当前画板', en: 'Pick the scenario first, then choose the board from the layout library' })}
      description={t({
        zh: '参考外部资料站常见的“筛条件 + 当前选中 + 可滚动布局库”节奏，把海量布局收进一个可控面板里，避免整页被按钮淹没。',
        en: 'This follows the common “filters + current selection + scrollable library” rhythm from reference data sites so the full layout library stays manageable instead of flooding the page.',
      })}
      statsLabel={t({ zh: '布局选择概览', en: 'Layout picker overview' })}
      stats={stats}
      fields={fields}
      selection={{
        kicker: t({ zh: '当前编辑布局', en: 'Editing now' }),
        title: selectedLayoutLabel ?? t({ zh: '未选择布局', en: 'No layout selected' }),
        description: selectedLayoutSource
          ? t({
              zh: `默认来源：${selectedLayoutSource}`,
              en: `Primary source: ${selectedLayoutSource}`,
            })
          : t({
              zh: '当前布局还没有来源场景标记。',
              en: 'This layout does not expose a source context yet.',
            }),
        pills: selectionPills,
      }}
      resultsLabel={t({ zh: '布局库', en: 'Layout list' })}
      resultsDescription={resultsDescription}
      cardsAriaLabel={t({ zh: '可选布局列表', en: 'Available layouts' })}
      cards={cards}
    />
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
