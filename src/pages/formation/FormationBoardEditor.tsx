import { Eraser } from 'lucide-react'
import { ActionButtons } from '../../components/ActionButtons'
import { LabeledValueCardGrid } from '../../components/LabeledValueCardGrid'
import { StatusBannerStack, type StatusBannerStackItem } from '../../components/StatusBannerStack'
import { getLocalizedTextPair } from '../../domain/localizedText'
import { FormationBoardGrid } from './FormationBoardGrid'
import { FormationMobileEditor } from './FormationMobileEditor'
import type { FormationPageModel } from './types'

interface FormationBoardEditorProps {
  model: FormationPageModel
}

export function FormationBoardEditor({ model }: FormationBoardEditorProps) {
  const {
    state,
    selectedLayout,
    selectedLayoutLabel,
    selectedLayoutContextSummary,
    filteredLayouts,
    isSelectedLayoutVisible,
    selectedChampions,
    conflictingSeats,
    locale,
    t,
    handleClear,
  } = model

  if (!selectedLayout) {
    return (
      <StatusBannerStack
        items={[
          {
            id: 'missing-layouts',
            tone: 'info',
            children: t({
              zh: '当前还没有可用布局，请先运行官方数据构建脚本。',
              en: 'No layouts are available yet. Run the official data build pipeline first.',
            }),
          },
        ]}
      />
    )
  }

  const layoutContextDetail = selectedLayoutContextSummary ?? (
    selectedLayout.notes ? getLocalizedTextPair(selectedLayout.notes, locale) : undefined
  )
  const metricItems = [
    { id: 'selected-layout', label: t({ zh: '当前布局', en: 'Current layout' }), value: selectedLayoutLabel ?? '-' },
    { id: 'slot-count', label: t({ zh: '槽位数', en: 'Slots' }), value: selectedLayout.slots.length },
    { id: 'data-version', label: t({ zh: '数据版本', en: 'Data version' }), value: state.status === 'ready' ? state.dataVersion : '-' },
    { id: 'layout-library', label: t({ zh: '布局库', en: 'Layout library' }), value: state.status === 'ready' ? state.formations.length : 0 },
    { id: 'matching-layouts', label: t({ zh: '当前匹配布局', en: 'Matching layouts' }), value: filteredLayouts.length },
    { id: 'placed-champions', label: t({ zh: '已放置英雄', en: 'Placed champions' }), value: selectedChampions.length },
    {
      id: 'seat-conflicts',
      label: t({ zh: 'seat 冲突', en: 'Seat conflicts' }),
      value: conflictingSeats.length > 0 ? conflictingSeats.join(', ') : t({ zh: '无', en: 'None' }),
    },
  ]
  const statusItems: StatusBannerStackItem[] = [
    {
      id: 'filtered-layout-hidden',
      tone: 'info',
      title: t({
        zh: '当前正在编辑的布局不在筛选结果中',
        en: 'The layout you are editing is outside the current filter results',
      }),
      detail: t({
        zh: '筛选只影响上方布局选择区；当前布局和已放置英雄会继续保留，放宽条件后可再次看到它。',
        en: 'Filters only affect the layout picker. Your current layout and placed champions stay intact and will appear again once you broaden the filters.',
      }),
      hidden: isSelectedLayoutVisible,
    },
    {
      id: 'no-matching-layouts',
      tone: 'info',
      children: t({
        zh: '当前筛选条件下没有匹配布局，可以先放宽关键词或场景类型。',
        en: 'No layouts match these filters yet. Try broadening the keyword or scenario type.',
      }),
      hidden: filteredLayouts.length > 0,
    },
    {
      id: 'layout-context',
      tone: 'info',
      ...(layoutContextDetail !== undefined ? { children: layoutContextDetail } : {}),
      hidden: layoutContextDetail === undefined,
    },
    {
      id: 'seat-conflicts',
      tone: 'error',
      children: t({
        zh: `当前阵型里出现 seat 冲突：${conflictingSeats.join(', ')}。同一 seat 只能放一名英雄。`,
        en: `Seat conflicts found in this formation: ${conflictingSeats.join(', ')}. Only one champion may occupy each seat.`,
      }),
      hidden: conflictingSeats.length === 0,
    },
  ]

  return (
    <>
      <LabeledValueCardGrid
        items={metricItems}
        gridClassName="metric-grid"
        cardClassName="metric-card"
        labelClassName="metric-card__label"
        valueClassName="metric-card__value"
      />

      <StatusBannerStack items={statusItems} />

      <FormationBoardGrid model={model} />
      <FormationMobileEditor model={model} />

      <ActionButtons
        items={[
          {
            id: 'clear-formation',
            label: t({ zh: '清空当前阵型', en: 'Clear this formation' }),
            icon: <Eraser aria-hidden="true" strokeWidth={1.9} />,
            tone: 'ghost',
            onClick: handleClear,
          },
        ]}
      />
    </>
  )
}
