import { Eraser } from 'lucide-react'
import { ActionButtons } from '../../components/ActionButtons'
import { LabeledValueCardGrid } from '../../components/LabeledValueCardGrid'
import { StatusBannerStack, type StatusBannerStackItem } from '../../components/StatusBannerStack'
import { getLocalizedTextPair } from '../../domain/localizedText'
import { FormationBoardGrid } from './FormationBoardGrid'
import { HeroPicker } from './HeroPicker'
import { FormationMobileEditor } from './FormationMobileEditor'
import type { FormationPageModel } from './types'

interface FormationBoardEditorProps {
  readonly model: FormationPageModel
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
            children: t("当前还没有可用布局，请先运行官方数据构建脚本。"),
          },
        ]}
      />
    )
  }

  const layoutContextDetail = selectedLayoutContextSummary ?? (
    selectedLayout.notes ? getLocalizedTextPair(selectedLayout.notes, locale) : undefined
  )
  const metricItems = [
    { id: 'selected-layout', label: t("当前布局"), value: selectedLayoutLabel ?? '-' },
    { id: 'slot-count', label: t("槽位数"), value: selectedLayout.slots.length },
    { id: 'data-version', label: t("数据版本"), value: state.status === 'ready' ? state.dataVersion : '-' },
    { id: 'layout-library', label: t("布局库"), value: state.status === 'ready' ? state.formations.length : 0 },
    { id: 'matching-layouts', label: t("当前匹配布局"), value: filteredLayouts.length },
    { id: 'placed-champions', label: t("已放置英雄"), value: selectedChampions.length },
    {
      id: 'seat-conflicts',
      label: t("seat 冲突"),
      value: conflictingSeats.length > 0 ? conflictingSeats.join(', ') : t("无"),
    },
  ]
  const statusItems: StatusBannerStackItem[] = [
    {
      id: 'filtered-layout-hidden',
      tone: 'info',
      title: t("当前正在编辑的布局不在筛选结果中"),
      detail: t("筛选只影响上方布局选择区；当前布局和已放置英雄会继续保留，放宽条件后可再次看到它。"),
      hidden: isSelectedLayoutVisible,
    },
    {
      id: 'no-matching-layouts',
      tone: 'info',
      children: t("当前筛选条件下没有匹配布局，可以先放宽关键词或场景类型。"),
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
      children: t('当前阵型里出现 seat 冲突：{p0}。同一 seat 只能放一名英雄。', {
        p0: conflictingSeats.join(', '),
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

      <HeroPicker
        champions={model.championOptions}
        className="hero-picker--source"
      />

      <div
        className="formation-remove-zone"
        data-testid="formation-remove-zone"
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault()
          const heroId = event.dataTransfer.getData('text/plain')
          if (heroId === '') return
          // 仅已放置英雄可移除；HeroPicker 未放置英雄拖入此处为 no-op。
          const placement = model.selectedChampions.find((item) => item.champion.id === heroId)
          if (placement) {
            model.handleAssignChampion(placement.slotId, '')
          }
        }}
      >
        {t("拖到此处移除")}
      </div>

      <FormationBoardGrid model={model} />
      <FormationMobileEditor model={model} />

      <ActionButtons
        items={[
          {
            id: 'clear-formation',
            label: t("清空当前阵型"),
            icon: <Eraser aria-hidden="true" strokeWidth={1.9} />,
            tone: 'ghost',
            onClick: handleClear,
          },
        ]}
      />
    </>
  )
}
