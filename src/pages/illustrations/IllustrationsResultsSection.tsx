import { StatusBanner } from '../../components/StatusBanner'
import { IllustrationResultCard } from './IllustrationResultCard'
import type { IllustrationsPageModel } from './types'

type IllustrationsResultsSectionProps = {
  model: IllustrationsPageModel
}

export function IllustrationsResultsSection({ model }: IllustrationsResultsSectionProps) {
  const { locale, t, results, actions, animationByIllustrationId } = model
  const hasMatches = results.filteredIllustrationEntries.length > 0

  return (
    <section className="results-panel" aria-label={t({ zh: '立绘筛选结果', en: 'Illustration filter results' })}>
      {hasMatches ? (
        <div className="illustrations-grid" aria-label={t({ zh: '立绘结果', en: 'Illustration results' })}>
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
      ) : (
        <div className="results-panel__empty">
          <StatusBanner
            tone="info"
            title={t({ zh: '没有匹配结果', en: 'No illustrations match' })}
            detail={t({
              zh: '当前筛选条件下没有可展示的立绘，试试清空一两个条件或先切回更宽的范围。',
              en: 'No illustrations match the current filters. Try clearing one or two filters, or broaden the scope first.',
            })}
          />
        </div>
      )}
    </section>
  )
}
