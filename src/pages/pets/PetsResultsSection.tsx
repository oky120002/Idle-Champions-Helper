import { WorkbenchResultsScaffold } from '../../components/workbench/WorkbenchResultsScaffold'
import { PetResultsGrid } from './PetResultsGrid'
import type { PetsPageModel } from './types'

interface PetsResultsSectionProps {
  readonly model: PetsPageModel
}

export function PetsResultsSection({ model }: PetsResultsSectionProps) {
  const { t, results } = model
  const hasMatches = results.filteredPets.length > 0

  return (
    <WorkbenchResultsScaffold
      ariaLabel={t("宠物筛选结果")}
      sectionClassName="results-panel"
      isEmpty={!hasMatches}
      emptyState={{
        title: t("没有匹配宠物"),
        detail: t("当前筛选条件下没有匹配宠物。可以先清空搜索词，或把来源和图像状态放宽一点再继续看。"),
      }}
    >
      <PetResultsGrid pets={results.visiblePets} animationByPetId={results.animationByPetId} />
    </WorkbenchResultsScaffold>
  )
}
