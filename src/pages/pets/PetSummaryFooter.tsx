import { useI18n } from '../../app/i18n'

interface PetSummaryFooterProps {
  summary: {
    total: number
    gems: number
    premium: number
    patron: number
    unavailable: number
    completeArt: number
  }
}

export function PetSummaryFooter({ summary }: PetSummaryFooterProps) {
  const { t } = useI18n()

  return (
    <div className="pets-page__summary">
      <span>{t({ zh: `共 ${summary.total} 只宠物`, en: `${summary.total} pets` })}</span>
      <span>{t({ zh: `${summary.gems} 只宝石商店`, en: `${summary.gems} gem shop` })}</span>
      <span>{t({ zh: `${summary.premium} 只付费来源`, en: `${summary.premium} premium` })}</span>
      <span>{t({ zh: `${summary.patron} 只赞助商商店`, en: `${summary.patron} patron shop` })}</span>
      <span>{t({ zh: `${summary.unavailable} 只暂未开放`, en: `${summary.unavailable} unavailable` })}</span>
      <span>{t({ zh: `${summary.completeArt} 只有完整图像`, en: `${summary.completeArt} fully illustrated` })}</span>
    </div>
  )
}
