import { useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search } from 'lucide-react'
import { useI18n } from '../app/i18n'
import { ConfiguredWorkbenchPage } from '../components/workbench/ConfiguredWorkbenchPage'
import { useWorkbenchScrollNavigation } from '../components/workbench/useWorkbenchScrollNavigation'
import { createWorkbenchBadgeItem } from '../components/workbench/WorkbenchToolbarItemBuilders'
import type { WorkbenchToolbarItemConfig } from '../components/workbench/WorkbenchToolbarItems'
import { SearchResultItem } from '../features/search/SearchResultItem'
import { useSearchPageState } from './useSearchPageState'

export function SearchPage() {
  const { locale, t } = useI18n()
  const navigate = useNavigate()
  const { query, setQuery, status, results, engineReady } = useSearchPageState()
  const contentScrollRef = useRef<HTMLDivElement | null>(null)
  const { showScrollTop, scrollToTop } = useWorkbenchScrollNavigation({ scrollRef: contentScrollRef })
  const trimmed = query.trim()
  const loading = status === 'loading'
  const searchReady = !loading && engineReady
  const showStartHint = !loading && trimmed === ''
  const showNoMatchesHint = searchReady && trimmed !== '' && results.length === 0

  const toolbarItems: WorkbenchToolbarItemConfig[] =
    trimmed !== '' && results.length > 0
      ? [
          createWorkbenchBadgeItem({
            id: 'result-count',
            label: t("{p0} 个结果", { p0: String(results.length) }),
          }),
        ]
      : []

  return (
    <ConfiguredWorkbenchPage
      pageClassName="search-page"
      storageKey="search"
      ariaLabel={t("全文搜索工作台")}
      shellClassName="workbench-page__shell"
      contentScrollRef={contentScrollRef}
      floatingTopButton={
        showScrollTop
          ? {
              onClick: scrollToTop,
              detailLabel: t("搜索结果"),
            }
          : undefined
      }
      contentHeader={
        <div className="search-page__input">
          <span className="text-input-shell text-input-shell--search">
            <Search className="text-input-shell__icon" aria-hidden="true" strokeWidth={1.8} />
            <input
              className="text-input text-input--with-leading-icon"
              type="search"
              value={query}
              placeholder={t("搜索英雄、技能、描述…")}
              onChange={(event) => setQuery(event.target.value)}
            />
          </span>
        </div>
      }
      toolbar={{
        sections: [
          { region: 'lead', section: { kind: 'mark', label: 'SEARCH' } },
          {
            region: 'primary',
            section: {
              kind: 'copy',
              kicker: t("全文检索"),
              title: t("搜索英雄"),
              detail: t("输入英雄名、技能、背景、专长、装备等任意文本，命中后点击跳转到英雄详情。"),
            },
          },
          ...(toolbarItems.length > 0
            ? [{ region: 'actions' as const, section: { kind: 'items' as const, items: toolbarItems } }]
            : []),
        ],
      }}
    >
      <div className="search-page__results">
        {loading && (
          <p className="search-page__hint">{t("正在加载索引…")}</p>
        )}
        {showStartHint && (
          <p className="search-page__hint">{t("输入关键词开始搜索。")}</p>
        )}
        {showNoMatchesHint && (
          <p className="search-page__hint">{t("未找到匹配的英雄。")}</p>
        )}
        {results.map((hit) => (
          <button
            key={hit.doc.championId}
            type="button"
            className="search-page__result"
            onClick={() => navigate(`/champions/${hit.doc.championId}`)}
          >
            <SearchResultItem hit={hit} locale={locale} variant="full" />
          </button>
        ))}
      </div>
    </ConfiguredWorkbenchPage>
  )
}
