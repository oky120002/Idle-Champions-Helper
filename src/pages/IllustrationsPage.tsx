import { FilterSidebarLayout } from '../components/filter-sidebar/FilterSidebarLayout'
import { PageTabHeader } from '../components/PageTabHeader'
import { StatusBanner } from '../components/StatusBanner'
import { SurfaceCard } from '../components/SurfaceCard'
import { IllustrationsMetrics } from './illustrations/IllustrationsMetrics'
import { IllustrationsResultsSection } from './illustrations/IllustrationsResultsSection'
import { IllustrationsSidebar } from './illustrations/IllustrationsSidebar'
import { useIllustrationsPageModel } from './illustrations/useIllustrationsPageModel'

export function IllustrationsPage() {
  const model = useIllustrationsPageModel()
  const { state, t } = model

  return (
    <div className="page-shell illustrations-page">
      <SurfaceCard
        headerContent={
          <PageTabHeader
            eyebrow={t({ zh: '立绘图鉴', en: 'Illustration catalog' })}
            accentLabel="ART CODEX"
            title={t({ zh: '按本体、皮肤、座位与标签浏览英雄立绘', en: 'Browse champion art by base form, skin, seat, and tags' })}
            aside={state.status === 'ready' ? <IllustrationsMetrics model={model} /> : null}
          />
        }
      >
        {state.status === 'loading' ? (
          <StatusBanner
            tone="info"
            title={t({ zh: '正在加载立绘目录', en: 'Loading illustration catalog' })}
            detail={t({
              zh: '正在读取本地版本化立绘清单与英雄筛选元数据。',
              en: 'Reading the local illustration manifest and champion filter metadata.',
            })}
          />
        ) : null}

        {state.status === 'error' ? (
          <StatusBanner
            tone="error"
            title={t({ zh: '立绘目录加载失败', en: 'Failed to load illustration catalog' })}
            detail={
              state.message
                ? t({
                    zh: `无法读取立绘目录数据：${state.message}`,
                    en: `Unable to read illustration catalog data: ${state.message}`,
                  })
                : t({
                    zh: '无法读取立绘目录数据。',
                    en: 'Unable to read illustration catalog data.',
                  })
            }
          />
        ) : null}

        {state.status === 'ready' ? (
          <>
            <FilterSidebarLayout sidebar={<IllustrationsSidebar model={model} />}>
              <IllustrationsResultsSection model={model} />
            </FilterSidebarLayout>
          </>
        ) : null}
      </SurfaceCard>
    </div>
  )
}
