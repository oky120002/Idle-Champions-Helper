import { WorkbenchResultsScaffold } from '../../components/workbench/WorkbenchResultsScaffold'
import { VariantAdventureDetail } from './VariantAdventureDetail'
import type { VariantsPageModel } from './types'

type VariantsResultsSectionProps = {
  readonly model: VariantsPageModel
}

export function VariantsResultsSection({ model }: VariantsResultsSectionProps) {
  const { t, selectedAdventureGroup } = model
  const hasMatches = selectedAdventureGroup !== null

  return (
    <WorkbenchResultsScaffold
      ariaLabel={t("变体筛选结果")}
      sectionClassName="variants-results"
      panelClassName="results-panel"
      isEmpty={!hasMatches}
      emptyState={{
        title: t("没有匹配变体"),
        detail: t("可以先清掉敌人类型 / 场景 / 特别敌人这些次级条件，再回到关键词或战役重新缩小范围。"),
      }}
    >
      <VariantAdventureDetail model={model} />
    </WorkbenchResultsScaffold>
  )
}
