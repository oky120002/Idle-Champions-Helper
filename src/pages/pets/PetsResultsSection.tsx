import { WorkbenchResultsScaffold } from '../../components/workbench/WorkbenchResultsScaffold'
import { PetResultsGrid } from './PetResultsGrid'
import type { PetsPageModel } from './types'

interface PetsResultsSectionProps {
  model: PetsPageModel
}

export function PetsResultsSection({ model }: PetsResultsSectionProps) {
  const { t, results } = model
  const hasMatches = results.filteredPets.length > 0

  return (
    <WorkbenchResultsScaffold
      ariaLabel={t({ zh: '宠物筛选结果', en: 'Pet filter results' })}
      sectionClassName="results-panel"
      isEmpty={!hasMatches}
      emptyState={{
        title: t({ zh: '没有匹配宠物', en: 'No pets match' }),
        detail: t({
          zh: '当前筛选条件下没有匹配宠物。可以先清空搜索词，或把来源和图像状态放宽一点再继续看。',
          en: 'No pets match the current filters. Clear the query first, or broaden the source and asset-state filters before narrowing again.',
        }),
      }}
    >
      <PetResultsGrid pets={results.visiblePets} animationByPetId={results.animationByPetId} />
    </WorkbenchResultsScaffold>
  )
}
