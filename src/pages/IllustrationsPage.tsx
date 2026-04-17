import { StatusBanner } from '../components/StatusBanner'
import { SurfaceCard } from '../components/SurfaceCard'
import { IllustrationsMetrics } from './illustrations/IllustrationsMetrics'
import { IllustrationsResultsSection } from './illustrations/IllustrationsResultsSection'
import { IllustrationsSidebar } from './illustrations/IllustrationsSidebar'
import { useIllustrationsPageModel } from './illustrations/useIllustrationsPageModel'

export function IllustrationsPage() {
  const model = useIllustrationsPageModel()
  const { state, results, t } = model

  return (
    <div className="page-shell illustrations-page">
      <SurfaceCard
        eyebrow={t({ zh: '本地静态资源', en: 'Local static assets' })}
        title={t({ zh: '英雄立绘页', en: 'Champion illustrations' })}
        description={t({
          zh: '本页只消费站内版本化立绘资源，不依赖浏览器运行时跨域抓官方图片。现在会先按筛选结果展示一批卡片，再由你决定是否继续展开全部。',
          en: 'This page only consumes versioned local illustration assets, avoids runtime cross-origin image fetches, and now starts with a focused batch before you decide whether to reveal the full catalog.',
        })}
        footer={
          <div className="illustrations-page__summary">
            <span>{t({ zh: `共 ${results.illustrations.length} 张立绘`, en: `${results.illustrations.length} illustrations` })}</span>
            <span>{t({ zh: `${results.totalHeroCount} 张本体`, en: `${results.totalHeroCount} hero base` })}</span>
            <span>{t({ zh: `${results.totalSkinCount} 张皮肤`, en: `${results.totalSkinCount} skins` })}</span>
          </div>
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
            <IllustrationsMetrics model={model} />
            <IllustrationsSidebar model={model} />
            <IllustrationsResultsSection model={model} />
          </>
        ) : null}
      </SurfaceCard>
    </div>
  )
}
