import { StatusBanner } from '../../components/StatusBanner'
import { VariantResultCard } from './VariantResultCard'
import type { VariantsPageModel } from './types'

type VariantsResultsSectionProps = {
  model: VariantsPageModel
}

export function VariantsResultsSection({ model }: VariantsResultsSectionProps) {
  const { t, activeFilters, filteredVariants, visibleVariants } = model

  return (
    <>
      <p
        className={activeFilters.length > 0 ? 'supporting-text' : 'supporting-text supporting-text--placeholder'}
        aria-hidden={activeFilters.length === 0}
      >
        {activeFilters.length > 0
          ? `${t({ zh: '当前筛选：', en: 'Active filters: ' })}${activeFilters.join(' · ')}`
          : t({ zh: '当前筛选：', en: 'Active filters: ' })}
      </p>

      {filteredVariants.length === 0 ? (
        <StatusBanner tone="info">
          {t({
            zh: '当前筛选条件下没有匹配变体，可以先放宽战役或关键词条件。',
            en: 'No variants match these filters yet. Try broadening the campaign or keyword first.',
          })}
        </StatusBanner>
      ) : null}

      {filteredVariants.length > 0 ? (
        <>
          <p className="supporting-text">
            {t({
              zh: `当前展示 ${visibleVariants.length} / ${filteredVariants.length} 条变体记录。名称会双语展示，但长段限制文本只跟随当前界面语言显示。`,
              en: `Showing ${visibleVariants.length} / ${filteredVariants.length} variants. Names stay bilingual in key places, while long restriction copy follows the active UI language.`,
            })}
          </p>

          <div className="results-grid">
            {visibleVariants.map((variant) => (
              <VariantResultCard key={variant.id} model={model} variant={variant} />
            ))}
          </div>
        </>
      ) : null}
    </>
  )
}
