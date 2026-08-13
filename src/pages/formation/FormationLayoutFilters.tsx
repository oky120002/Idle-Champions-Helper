import { getFormationLayoutLabel } from '../../domain/formationLayout'
import { getLocalizedTextPair } from '../../domain/localizedText'
import type { FormationLayout } from '../../domain/types'
import type { FormFieldSchema } from '../../components/FormFieldSchemaRenderer'
import { LAYOUT_FILTER_OPTIONS, type FormationPageModel, type LayoutFilterKind } from './types'
import { FormationLayoutLibraryScaffold } from './FormationLayoutLibraryScaffold'

interface FormationLayoutFiltersProps {
  readonly model: FormationPageModel
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
      label: t("当前匹配"),
      value: filteredLayouts.length,
    },
    {
      id: 'selected-layout',
      label: t("当前布局"),
      value: selectedLayoutLabel ?? t("未选择"),
      compact: true,
    },
  ]
  const fields: FormFieldSchema[] = [
    {
      kind: 'input',
      id: 'keyword',
      inputId: 'formation-layout-search',
      label: t("关键词"),
      value: layoutSearch,
      onChange: setLayoutSearch,
      hint: t("支持搜索布局名、布局备注和来源场景名称，保留中英混搜。"),
      placeholder: t("搜布局名、来源战役、冒险或变体"),
      className: 'form-field',
    },
    {
      kind: 'chip-single',
      id: 'scenario-type',
      label: t("场景类型"),
      value: selectedContextKind,
      onChange: (value: string) => setSelectedContextKind(value as LayoutFilterKind),
      hint: t("筛选只影响布局库，不会自动清空正在编辑的布局。"),
      groupLabel: t("场景类型"),
      options: LAYOUT_FILTER_OPTIONS.map((kind) => ({
        value: kind,
        label: getLayoutFilterLabel(kind),
      })),
      className: 'form-field',
    },
  ]
  const selectionPills = selectedLayout
    ? [
        {
          id: 'slot-count',
          label: locale === 'zh-CN' ? `${String(selectedLayout.slots.length)} 槽` : `${String(selectedLayout.slots.length)} slots`,
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
      countLabel: locale === 'zh-CN' ? `${String(layout.slots.length)} 槽` : `${String(layout.slots.length)} slots`,
      sourceLabel: primarySource ?? t("当前没有来源场景标记"),
      metaPills: kinds.map((kind) => ({
        id: `${layout.id}-${kind}`,
        label: getLayoutFilterLabel(kind),
      })),
      isActive: isSelected,
      onSelect: () => handleSelectLayout(layout.id),
    }
  })
  const resultsDescription = filteredLayouts.length > 0
    ? t("按当前条件命中 {p0} 个布局，选中后下方画板会立即切换。", { p0: String(filteredLayouts.length) })
    : t("当前没有匹配布局，可以先放宽关键词或场景类型。")

  return (
    <FormationLayoutLibraryScaffold
      ariaLabel={t("布局选择")}
      eyebrow={t("布局选择")}
      title={t("先定场景，再从布局库里选当前画板")}
      description={t("参考外部资料站常见的“筛条件 + 当前选中 + 可滚动布局库”节奏，把海量布局收进一个可控面板里，避免整页被按钮淹没。")}
      statsLabel={t("布局选择概览")}
      stats={stats}
      fields={fields}
      selection={{
        kicker: t("当前编辑布局"),
        title: selectedLayoutLabel ?? t("未选择布局"),
        description: (selectedLayoutSource != null && selectedLayoutSource !== '')
          ? t("默认来源：{p0}", { p0: selectedLayoutSource })
          : t("当前布局还没有来源场景标记。"),
        pills: selectionPills,
      }}
      resultsLabel={t("布局库")}
      resultsDescription={resultsDescription}
      cardsAriaLabel={t("可选布局列表")}
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
