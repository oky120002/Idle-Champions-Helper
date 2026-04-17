import { useI18n } from '../../app/i18n'
import type { Pet } from '../../domain/types'
import { PetResultsGrid } from './PetResultsGrid'

interface PetsResultsSectionProps {
  pets: Pet[]
  totalPets: number
}

export function PetsResultsSection({ pets, totalPets }: PetsResultsSectionProps) {
  const { t } = useI18n()

  return (
    <section className="results-panel" aria-label={t({ zh: '宠物筛选结果', en: 'Pet filter results' })}>
      <div className="results-panel__meta">
        <p className="supporting-text">
          {pets.length > 0
            ? t({
                zh: `当前展示 ${pets.length} / ${totalPets} 只宠物。若结果仍偏多，优先用左侧搜索、来源或图像状态继续缩小范围。`,
                en: `Showing ${pets.length} / ${totalPets} pets. Narrow the list further with the left-side search, source, or asset-state filters if it still feels broad.`,
              })
            : t({
                zh: '当前筛选条件下没有匹配宠物。可以先清空搜索词，或把来源和图像状态放宽一点再继续看。',
                en: 'No pets match the current filters. Clear the query first, or broaden the source and asset-state filters before narrowing again.',
              })}
        </p>
      </div>

      <PetResultsGrid pets={pets} />
    </section>
  )
}
