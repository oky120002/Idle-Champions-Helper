import { WorkbenchResultsScaffold } from '../../components/workbench/WorkbenchResultsScaffold'
import { IllustrationResultCard } from './IllustrationResultCard'
import type { IllustrationsPageModel } from './types'

type IllustrationsResultsSectionProps = {
  readonly model: IllustrationsPageModel
}

export function IllustrationsResultsSection({ model }: IllustrationsResultsSectionProps) {
  const { locale, t, results, actions, animationByIllustrationId } = model
  const hasMatches = results.filteredIllustrationEntries.length > 0

  return (
    <WorkbenchResultsScaffold
      ariaLabel={t("立绘筛选结果")}
      sectionClassName="results-panel"
      isEmpty={!hasMatches}
      emptyState={{
        title: t("没有匹配结果"),
        detail: t("当前筛选条件下没有可展示的立绘，试试清空一两个条件或先切回更宽的范围。"),
      }}
    >
      <div className="illustrations-grid" aria-label={t("立绘结果")}>
        {results.visibleIllustrationEntries.map((entry) => (
          <IllustrationResultCard
            key={entry.illustration.id}
            entry={entry}
            animation={animationByIllustrationId.get(entry.illustration.id) ?? null}
            locale={locale}
            t={t}
            onOpenChampion={actions.saveListScroll}
          />
        ))}
      </div>
    </WorkbenchResultsScaffold>
  )
}
