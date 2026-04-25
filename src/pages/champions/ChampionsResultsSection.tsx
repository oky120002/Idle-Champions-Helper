import { WorkbenchResultsScaffold } from '../../components/workbench/WorkbenchResultsScaffold'
import { ChampionResultCard } from './ChampionResultCard'
import type { ChampionsPageModel } from './types'

interface ChampionsResultsSectionProps {
  model: ChampionsPageModel
}

export function ChampionsResultsSection({ model }: ChampionsResultsSectionProps) {
  const { filteredChampions, visibleChampions, t } = model
  const hasMatches = filteredChampions.length > 0

  return (
    <WorkbenchResultsScaffold
      ariaLabel={t({ zh: '英雄筛选结果', en: 'Champion filter results' })}
      sectionClassName="champions-results"
      shellClassName="results-panel-shell"
      panelClassName="results-panel"
      isEmpty={!hasMatches}
      emptyState={{
        children: t({
          zh: '暂时没有可展示的英雄结果。先放宽一个过滤维度，再继续缩小范围会更顺手。',
          en: 'There are no champions to show right now. Loosen one filter group first, then narrow it back down.',
        }),
      }}
    >
      <div className="results-grid results-grid--stable champions-results__grid">
        {visibleChampions.map((champion) => (
          <ChampionResultCard key={champion.id} champion={champion} model={model} />
        ))}
      </div>
    </WorkbenchResultsScaffold>
  )
}
