import { useEffect, useState } from 'react'
import { getSearchEngine, type SearchEngine } from './searchEngine'

export type SearchEngineStatus = 'idle' | 'loading' | 'ready' | 'error'

export interface UseSearchEngineResult {
  status: SearchEngineStatus
  engine: SearchEngine | null
}

const IDLE: UseSearchEngineResult = { status: 'idle', engine: null }

// enabled 控制是否加载：顶栏框仅在聚焦/有输入时置 true，/search 页（懒加载路由）置 true。
// 真正的网络与建索引由 getSearchEngine 单例惰性触发，App 启动不付代价。
export function useSearchEngine(enabled: boolean): UseSearchEngineResult {
  const [state, setState] = useState<UseSearchEngineResult>(IDLE)

  useEffect(() => {
    if (!enabled) {
      return
    }

    let active = true
    setState((previous) =>
      previous.status === 'ready' || previous.status === 'error' ? previous : { status: 'loading', engine: null },
    )
    getSearchEngine().then((engine) => {
      if (active) {
        setState(engine ? { status: 'ready', engine } : { status: 'error', engine: null })
      }
    })

    return () => {
      active = false
    }
  }, [enabled])

  return state
}
