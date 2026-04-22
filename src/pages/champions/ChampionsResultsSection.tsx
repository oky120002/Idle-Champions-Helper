import { ChampionVisualWorkbench } from '../../components/ChampionVisualWorkbench'
import { StatusBanner } from '../../components/StatusBanner'
import { ChampionResultCard } from './ChampionResultCard'
import type { ChampionsPageModel } from './types'

interface ChampionsResultsSectionProps {
  model: ChampionsPageModel
}

export function ChampionsResultsSection({ model }: ChampionsResultsSectionProps) {
  const {
    filteredChampions,
    visibleChampions,
    selectedChampion,
    selectedChampionVisual,
    clearSelectedChampion,
    t,
  } = model

  return (
    <section className="champions-results" aria-label={t({ zh: '英雄筛选结果', en: 'Champion filter results' })}>
      <section
        className="results-panel-shell"
      >
        <div className="results-panel">
          {filteredChampions.length > 0 ? (
            <>
              {selectedChampion ? (
                <ChampionVisualWorkbench
                  key={selectedChampion.id}
                  champion={selectedChampion}
                  visual={selectedChampionVisual}
                  locale={model.locale}
                  onClose={clearSelectedChampion}
                />
              ) : null}

              <div className="results-grid results-grid--stable champions-results__grid">
                {visibleChampions.map((champion) => (
                  <ChampionResultCard key={champion.id} champion={champion} model={model} />
                ))}
              </div>
            </>
          ) : (
            <div className="results-panel__empty">
              <StatusBanner tone="info">
                {t({
                  zh: '暂时没有可展示的英雄结果。先放宽一个过滤维度，再继续缩小范围会更顺手。',
                  en: 'There are no champions to show right now. Loosen one filter group first, then narrow it back down.',
                })}
              </StatusBanner>
            </div>
          )}
        </div>
      </section>
    </section>
  )
}
