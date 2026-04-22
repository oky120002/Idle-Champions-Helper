import { StatusBanner } from '../../components/StatusBanner'
import { PetResultsGrid } from './PetResultsGrid'
import type { PetsPageModel } from './types'

interface PetsResultsSectionProps {
  model: PetsPageModel
}

export function PetsResultsSection({ model }: PetsResultsSectionProps) {
  const { t, results } = model
  const hasMatches = results.filteredPets.length > 0

  return (
    <section className="results-panel" aria-label={t({ zh: '宠物筛选结果', en: 'Pet filter results' })}>
      {hasMatches ? (
        <PetResultsGrid pets={results.visiblePets} animationByPetId={results.animationByPetId} />
      ) : (
        <div className="results-panel__empty">
          <StatusBanner
            tone="info"
            title={t({ zh: '没有匹配宠物', en: 'No pets match' })}
            detail={t({
              zh: '当前筛选条件下没有匹配宠物。可以先清空搜索词，或把来源和图像状态放宽一点再继续看。',
              en: 'No pets match the current filters. Clear the query first, or broaden the source and asset-state filters before narrowing again.',
            })}
          />
        </div>
      )}
    </section>
  )
}
