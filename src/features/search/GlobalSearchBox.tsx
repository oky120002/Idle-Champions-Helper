import { type FocusEvent, type KeyboardEvent, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search } from 'lucide-react'
import { useI18n } from '../../app/i18n'
import { useSearchEngine } from './useSearchEngine'
import { SearchResultItem } from './SearchResultItem'
import type { SearchHit } from './searchTypes'

const DROPDOWN_LIMIT = 6
const DEBOUNCE_MS = 160

export function GlobalSearchBox() {
  const { locale, t } = useI18n()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [isFocused, setIsFocused] = useState(false)
  const [debouncedHits, setDebouncedHits] = useState<SearchHit[]>([])
  const [activeIndex, setActiveIndex] = useState(0)
  const { status, engine } = useSearchEngine(isFocused)
  const inputRef = useRef<HTMLInputElement>(null)

  const trimmed = query.trim()
  const results = !engine || !trimmed ? [] : debouncedHits
  const open = isFocused && trimmed.length > 0
  const loading = status === 'loading'

  useEffect(() => {
    if (!engine || !trimmed) {
      return
    }
    const handle = window.setTimeout(() => {
      setDebouncedHits(engine.search(trimmed, DROPDOWN_LIMIT))
      setActiveIndex(0)
    }, DEBOUNCE_MS)
    return () => window.clearTimeout(handle)
  }, [engine, trimmed])

  const close = () => {
    setIsFocused(false)
    setQuery('')
    setDebouncedHits([])
  }

  const goToHero = (hit: SearchHit) => {
    void navigate(`/champions/${hit.doc.championId}`)
    close()
  }

  const goToAll = () => {
    if (!trimmed) {
      return
    }
    void navigate(`/search?q=${encodeURIComponent(trimmed)}`)
    close()
  }

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (!open) {
      return
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActiveIndex((index) => Math.min(index + 1, results.length))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex((index) => Math.max(index - 1, 0))
    } else if (event.key === 'Enter') {
      event.preventDefault()
      if (activeIndex < results.length && results[activeIndex]) {
        goToHero(results[activeIndex])
      } else {
        goToAll()
      }
    } else if (event.key === 'Escape') {
      event.preventDefault()
      close()
      inputRef.current?.blur()
    }
  }

  const handleBlur = (event: FocusEvent<HTMLDivElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
      setIsFocused(false)
    }
  }

  const showLoadingHint = open && loading && results.length === 0
  const showEmpty = open && !loading && engine !== null && results.length === 0

  return (
    <div className="global-search" onBlur={handleBlur}>
      <span className="global-search__shell">
        <Search className="global-search__icon" aria-hidden="true" strokeWidth={1.8} />
        <input
          ref={inputRef}
          type="search"
          className="global-search__input"
          placeholder={t({ zh: '搜索英雄、技能、描述…', en: 'Search heroes, skills, text…' })}
          value={query}
          role="combobox"
          aria-expanded={open}
          aria-controls="global-search-listbox"
          aria-autocomplete="list"
          autoComplete="off"
          onFocus={() => setIsFocused(true)}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={onKeyDown}
        />
      </span>
      {open && (
        <div className="global-search__dropdown" id="global-search-listbox" role="listbox">
          {showLoadingHint && (
            <p className="global-search__hint">{t({ zh: '正在加载索引…', en: 'Loading index…' })}</p>
          )}
          {showEmpty && (
            <p className="global-search__hint">{t({ zh: '未找到匹配的英雄。', en: 'No matching heroes.' })}</p>
          )}
          {results.map((hit, index) => (
            <button
              key={hit.doc.championId}
              type="button"
              role="option"
              aria-selected={index === activeIndex}
              className={
                index === activeIndex
                  ? 'global-search__option global-search__option--active'
                  : 'global-search__option'
              }
              onMouseEnter={() => setActiveIndex(index)}
              onClick={() => goToHero(hit)}
            >
              <SearchResultItem hit={hit} locale={locale} variant="compact" />
            </button>
          ))}
          <button
            type="button"
            className={
              activeIndex === results.length
                ? 'global-search__all global-search__all--active'
                : 'global-search__all'
            }
            onMouseEnter={() => setActiveIndex(results.length)}
            onClick={goToAll}
          >
            {t({ zh: '查看全部结果', en: 'View all results' })}
          </button>
        </div>
      )}
    </div>
  )
}
