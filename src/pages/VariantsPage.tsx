import { FilterWorkbenchPage } from '../components/workbench/FilterWorkbenchPage'
import {
  createWorkbenchFilterToolbarItems,
} from '../components/workbench/WorkbenchToolbarItemBuilders'
import { createAsyncStatusBannerItems } from '../components/statusBannerStackItemBuilders'
import { MAX_VISIBLE_VARIANTS } from './variants/constants'
import { VariantsFilterBar } from './variants/VariantsFilterBar'
import { VariantsResultsSection } from './variants/VariantsResultsSection'
import { VariantsWorkbenchContentHeader } from './variants/VariantsWorkbenchContentHeader'
import { useVariantsPageModel } from './variants/useVariantsPageModel'

export function VariantsPage() {
  const model = useVariantsPageModel()
  const { state, t, activeFilters, clearAllFilters, showResultsQuickNavTop, scrollResultsToTop } = model
  const contentStatusItems = createAsyncStatusBannerItems({
    status: state.status,
    loading: {
      children: t({ zh: '正在读取官方变体数据…', en: 'Loading official variant data…' }),
    },
    error: {
      title: t({ zh: '变体数据读取失败', en: 'Variant data failed to load' }),
      ...(state.status === 'error'
        ? { detail: state.message || t({ zh: '未知错误', en: 'Unknown error' }) }
        : {}),
    },
  })
  const toolbarItems = createWorkbenchFilterToolbarItems({
    t,
    defaultVisibleCount: MAX_VISIBLE_VARIANTS,
    filteredCount: model.filteredVariants.length,
    showAllResults: model.filters.showAllResults,
    canToggle: model.canToggleResultVisibility,
    isReady: state.status === 'ready',
    onToggleVisibility: model.toggleResultVisibility,
    shareState: model.shareLinkState,
    onCopy: model.copyCurrentLink,
  })

  return (
    <FilterWorkbenchPage
      pageClassName="variants-page"
      storageKey="variants"
      ariaLabel={t({ zh: '变体筛选工作台', en: 'Variant workbench' })}
      shellClassName="workbench-page__shell variants-workbench"
      contentScrollRef={model.resultsPaneRef}
      floatingTopButton={showResultsQuickNavTop ? { onClick: scrollResultsToTop } : undefined}
      toolbarIntro={{
        label: 'VARIANTS',
        activeCount: activeFilters.length,
        accentTone: 'steel',
        title: t({ zh: '变体筛选', en: 'Variant filters' }),
        detail: t({ zh: '战役压力、敌人与阵型阅读台', en: 'Campaign pressure, enemy, and formation reading desk' }),
      }}
      toolbarItems={toolbarItems}
      sidebarHeader={{
        kicker: t({ zh: '筛选抽屉', en: 'Filter drawer' }),
        title: t({ zh: '左侧缩小压力范围', en: 'Narrow variant pressure on the left' }),
        description: t({
          zh: '先用战役、区域和场景缩小范围，再让敌人类型、攻击构成和特别敌人数辅助阵型判断。',
          en: 'Narrow by campaign, area, and scene first, then use enemy tags, attack mix, and special-enemy density to support formation decisions.',
        }),
        statusLabel: t({ zh: '变体筛选状态操作', en: 'Variant filter status actions' }),
        activeCount: activeFilters.length,
        clearLabel: t({ zh: '清空全部', en: 'Clear all' }),
        ...(activeFilters.length > 0 ? { onClear: clearAllFilters } : {}),
      }}
      isReady={state.status === 'ready'}
      sidebar={<VariantsFilterBar model={model} />}
      contentHeader={<VariantsWorkbenchContentHeader model={model} />}
      statusItems={contentStatusItems}
    >
      <VariantsResultsSection model={model} />
    </FilterWorkbenchPage>
  )
}
