import { StatusBanner } from '../../components/StatusBanner'
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
      <StatusBanner tone="info">
        {t({
          zh: '当前还没有可用布局，请先运行官方数据构建脚本。',
          en: 'No layouts are available yet. Run the official data build pipeline first.',
        })}
      </StatusBanner>
    )
  }

  return (
    <>
      <div className="metric-grid">
        <MetricCard label={t({ zh: '当前布局', en: 'Current layout' })} value={selectedLayoutLabel ?? '-'} />
        <MetricCard label={t({ zh: '槽位数', en: 'Slots' })} value={selectedLayout.slots.length} />
        <MetricCard label={t({ zh: '数据版本', en: 'Data version' })} value={state.status === 'ready' ? state.dataVersion : '-'} />
        <MetricCard label={t({ zh: '布局库', en: 'Layout library' })} value={state.status === 'ready' ? state.formations.length : 0} />
        <MetricCard label={t({ zh: '当前匹配布局', en: 'Matching layouts' })} value={filteredLayouts.length} />
        <MetricCard label={t({ zh: '已放置英雄', en: 'Placed champions' })} value={selectedChampions.length} />
        <MetricCard
          label={t({ zh: 'seat 冲突', en: 'Seat conflicts' })}
          value={conflictingSeats.length > 0 ? conflictingSeats.join(', ') : t({ zh: '无', en: 'None' })}
        />
      </div>

      {!isSelectedLayoutVisible ? (
        <StatusBanner
          tone="info"
          title={t({
            zh: '当前正在编辑的布局不在筛选结果中',
            en: 'The layout you are editing is outside the current filter results',
          })}
          detail={t({
            zh: '筛选只影响上方布局选择区；当前布局和已放置英雄会继续保留，放宽条件后可再次看到它。',
            en: 'Filters only affect the layout picker. Your current layout and placed champions stay intact and will appear again once you broaden the filters.',
          })}
        />
      ) : null}

      {filteredLayouts.length === 0 ? (
        <StatusBanner tone="info">
          {t({
            zh: '当前筛选条件下没有匹配布局，可以先放宽关键词或场景类型。',
            en: 'No layouts match these filters yet. Try broadening the keyword or scenario type.',
          })}
        </StatusBanner>
      ) : null}

      {selectedLayoutContextSummary ? (
        <StatusBanner tone="info">{selectedLayoutContextSummary}</StatusBanner>
      ) : selectedLayout.notes ? (
        <StatusBanner tone="info">{getLocalizedTextPair(selectedLayout.notes, locale)}</StatusBanner>
      ) : null}

      {conflictingSeats.length > 0 ? (
        <StatusBanner tone="error">
          {t({
            zh: `当前阵型里出现 seat 冲突：${conflictingSeats.join(', ')}。同一 seat 只能放一名英雄。`,
            en: `Seat conflicts found in this formation: ${conflictingSeats.join(', ')}. Only one champion may occupy each seat.`,
          })}
        </StatusBanner>
      ) : null}

      <FormationBoardGrid model={model} />
      <FormationMobileEditor model={model} />

      <div className="button-row">
        <button type="button" className="action-button action-button--ghost" onClick={handleClear}>
          {t({ zh: '清空当前阵型', en: 'Clear this formation' })}
        </button>
      </div>
    </>
  )
}

interface MetricCardProps {
  label: string
  value: string | number
}

function MetricCard({ label, value }: MetricCardProps) {
  return (
    <article className="metric-card">
      <span className="metric-card__label">{label}</span>
      <strong className="metric-card__value">{value}</strong>
    </article>
  )
}
