import { getAreaHighlightLabels } from './variant-detail-model'
import type { VariantDetailTabId, VariantsPageModel } from './types'
import { VariantResultCard } from './VariantResultCard'

type VariantAdventureTabsProps = {
  readonly model: VariantsPageModel
}

const TAB_IDS: VariantDetailTabId[] = ['variants', 'areas', 'story']

function getTabLabel(tabId: VariantDetailTabId, locale: 'zh-CN' | 'en-US'): string {
  if (tabId === 'variants') {
    return locale === 'zh-CN' ? '变体' : 'Variants'
  }

  if (tabId === 'areas') {
    return locale === 'zh-CN' ? '区域' : 'Areas'
  }

  return locale === 'zh-CN' ? '剧情' : 'Story'
}

export function VariantAdventureTabs({ model }: VariantAdventureTabsProps) {
  const { locale, t, filters, selectedAdventureGroup, selectDetailTab } = model

  if (!selectedAdventureGroup) {
    return null
  }

  const areaHighlightLabels = getAreaHighlightLabels(selectedAdventureGroup, locale)

  return (
    <>
      <div className="variant-detail-tabs" role="tablist" aria-label={t("变体详情分页")}>
        {TAB_IDS.map((tabId) => (
          <button
            key={tabId}
            type="button"
            role="tab"
            aria-selected={filters.detailTab === tabId}
            className={
              filters.detailTab === tabId
                ? 'variant-detail-tabs__button variant-detail-tabs__button--active'
                : 'variant-detail-tabs__button'
            }
            onClick={() => selectDetailTab(tabId)}
          >
            {getTabLabel(tabId, locale)}
          </button>
        ))}
      </div>

      {filters.detailTab === 'variants' ? (
        <div className="variant-entry-stack">
          {selectedAdventureGroup.variants.map((variant) => (
            <VariantResultCard key={variant.id} model={model} variant={variant} />
          ))}
        </div>
      ) : null}

      {filters.detailTab === 'areas' ? (
        <div className="variant-detail__areas">
          <section className="variant-detail__panel">
            <span className="variant-detail__intel-label">{t("区域节点")}</span>
            <div className="variant-chip-row">
              {selectedAdventureGroup.areaMilestones.map((area) => (
                <span key={area} className="variant-chip">
                  {locale === 'zh-CN' ? `${String(area)} 区` : `Area ${String(area)}`}
                </span>
              ))}
            </div>
          </section>
          <section className="variant-detail__panel">
            <span className="variant-detail__intel-label">{t("场景变化")}</span>
            {areaHighlightLabels.length > 0 ? (
              <div className="variant-chip-row">
                {areaHighlightLabels.map((label) => (
                  <span key={label} className="variant-chip variant-chip--soft">{label}</span>
                ))}
              </div>
            ) : (
              <p className="supporting-text">{t("当前数据没有解析到额外区域事件。")}</p>
            )}
          </section>
        </div>
      ) : null}

      {filters.detailTab === 'story' ? (
        <div className="variant-detail__panel">
          <p className="supporting-text">
            {t("当前公共数据没有官方剧情文本字段，因此这里先保留分页入口，不展示 kleho 私有内容。")}
          </p>
        </div>
      ) : null}
    </>
  )
}
