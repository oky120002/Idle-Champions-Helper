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

  const toolbarItems: WorkbenchToolbarItemConfig[] =
    trimmed && results.length > 0
      ? [
          createWorkbenchBadgeItem({
            id: 'result-count',
            label: t({ zh: `${results.length} 个结果`, en: `${results.length} results` }),
          }),
        ]
      : []

  return (
    <ConfiguredWorkbenchPage
      pageClassName="search-page"
      storageKey="search"
      ariaLabel={t({ zh: '全文搜索工作台', en: 'Search workbench' })}
      shellClassName="workbench-page__shell"
      contentScrollRef={contentScrollRef}
      floatingTopButton={
        showScrollTop
          ? {
              onClick: scrollToTop,
              detailLabel: t({ zh: '搜索结果', en: 'Search results' }),
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
              placeholder={t({ zh: '搜索英雄、技能、描述…', en: 'Search heroes, skills, text…' })}
              autoFocus
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
              kicker: t({ zh: '全文检索', en: 'Full-text Search' }),
              title: t({ zh: '搜索英雄', en: 'Search Heroes' }),
              detail: t({
                zh: '输入英雄名、技能、背景、专长、装备等任意文本，命中后点击跳转到英雄详情。',
                en: 'Type any text — hero name, skill, backstory, feat, gear — and jump to the hero.',
              }),
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
          <p className="search-page__hint">{t({ zh: '正在加载索引…', en: 'Loading index…' })}</p>
        )}
        {!loading && !trimmed && (
          <p className="search-page__hint">{t({ zh: '输入关键词开始搜索。', en: 'Type to start searching.' })}</p>
        )}
        {!loading && engineReady && trimmed && results.length === 0 && (
          <p className="search-page__hint">{t({ zh: '未找到匹配的英雄。', en: 'No matching heroes.' })}</p>
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
