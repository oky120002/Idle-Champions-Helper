import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useSearchEngine, type SearchEngineStatus } from '../features/search/useSearchEngine'
import type { SearchHit } from '../features/search/searchTypes'

const DEBOUNCE_MS = 160
const RESULT_LIMIT = 100

export interface UseSearchPageStateResult {
  query: string
  setQuery: (value: string) => void
  status: SearchEngineStatus
  results: SearchHit[]
  engineReady: boolean
}

// 查询 ↔ URL（?q=）双向同步：输入即时 replace 进 URL（可刷新/分享），浏览器前进后退回读。
// setState 只在异步回调（setTimeout / microtask）里调用，避免 effect 体内同步 setState。
export function useSearchPageState(): UseSearchPageStateResult {
  const [searchParams, setSearchParams] = useSearchParams()
  const [query, setQuery] = useState(() => searchParams.get('q') ?? '')
  const { status, engine } = useSearchEngine(true)
  const [results, setResults] = useState<SearchHit[]>([])

  const trimmed = query.trim()

  // 查询 -> 结果（防抖）
  useEffect(() => {
    if (!engine || !trimmed) {
      return undefined
    }
    const handle = window.setTimeout(() => { setResults(engine.search(trimmed, RESULT_LIMIT)); }, DEBOUNCE_MS)
    return () => { window.clearTimeout(handle); }
  }, [engine, trimmed])

  // 查询 -> URL（replace，避免堆历史）
  useEffect(() => {
    const next = new URLSearchParams(searchParams)
    if (trimmed) {
      next.set('q', trimmed)
    } else {
      next.delete('q')
    }
    if (next.toString() !== searchParams.toString()) {
      setSearchParams(next, { replace: true })
    }
  }, [trimmed, searchParams, setSearchParams])

  // URL -> 查询（浏览器前进/后退）；microtask 推迟 setState
  const urlQuery = searchParams.get('q') ?? ''
  useEffect(() => {
    queueMicrotask(() => { setQuery((current) => (current === urlQuery ? current : urlQuery)); })
  }, [urlQuery])

  const visibleResults = !engine || !trimmed ? [] : results

  return { query, setQuery, status, results: visibleResults, engineReady: engine !== null }
}
