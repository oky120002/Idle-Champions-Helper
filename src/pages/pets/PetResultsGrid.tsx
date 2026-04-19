import { useI18n } from '../../app/i18n'
import { StatusBanner } from '../../components/StatusBanner'
import type { Pet, PetAnimation } from '../../domain/types'
import { PetResultCard } from './PetResultCard'

interface PetResultsGridProps {
  pets: Pet[]
  animationByPetId: ReadonlyMap<string, PetAnimation>
}

export function PetResultsGrid({ pets, animationByPetId }: PetResultsGridProps) {
  const { t } = useI18n()

  if (pets.length === 0) {
    return (
      <StatusBanner
        tone="info"
        title={t({ zh: '没有匹配结果', en: 'No pets match' })}
        detail={t({
          zh: '当前筛选条件下没有宠物，试试清空搜索词或放宽图像状态。',
          en: 'No pets match the current filters. Try clearing the query or broadening the asset filter.',
        })}
      />
    )
  }

  return (
    <div className="pets-grid" aria-label={t({ zh: '宠物结果', en: 'Pet results' })}>
      {pets.map((pet) => (
        <PetResultCard key={pet.id} pet={pet} animation={animationByPetId.get(pet.id) ?? null} />
      ))}
    </div>
  )
}
