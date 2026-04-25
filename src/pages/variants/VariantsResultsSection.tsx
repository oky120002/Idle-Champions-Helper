import { WorkbenchResultsScaffold } from '../../components/workbench/WorkbenchResultsScaffold'
import { VariantCampaignSection } from './VariantCampaignSection'
import type { VariantsPageModel } from './types'

type VariantsResultsSectionProps = {
  model: VariantsPageModel
}

export function VariantsResultsSection({ model }: VariantsResultsSectionProps) {
  const { t, filteredVariants, visibleCampaignGroups } = model
  const hasMatches = filteredVariants.length > 0

  return (
    <WorkbenchResultsScaffold
      ariaLabel={t({ zh: '变体筛选结果', en: 'Variant filter results' })}
      sectionClassName="variants-results"
      panelClassName="results-panel"
      isEmpty={!hasMatches}
      emptyState={{
        title: t({ zh: '没有匹配变体', en: 'No variants match' }),
        detail: t({
          zh: '可以先清掉敌人类型 / 场景 / 特别敌人这些次级条件，再回到关键词或战役重新缩小范围。',
          en: 'Try clearing secondary filters like enemy type, scene, or special enemies first, then narrow things down again with keyword or campaign.',
        }),
      }}
    >
      <div className="variant-campaign-stack">
        {visibleCampaignGroups.map((group) => (
          <VariantCampaignSection key={group.id} model={model} group={group} />
        ))}
      </div>
    </WorkbenchResultsScaffold>
  )
}
