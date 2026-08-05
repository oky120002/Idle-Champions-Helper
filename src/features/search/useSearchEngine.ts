import { useEffect, useState } from 'react'
import { getSearchEngine, type SearchEngine } from './searchEngine'

export type SearchEngineStatus = 'idle' | 'loading' | 'ready' | 'error'

export interface UseSearchEngineResult {
  status: SearchEngineStatus
  engine: SearchEngine | null
}

// enabled 控制是否加载：顶栏框仅在聚焦时置 true，/search 页（懒加载路由）置 true。
// 真正的网络与建索引由 getSearchEngine 单例惰性触发，App 启动不付代价。
// status 由 engine/failed 派生，setState 只在异步回调里调用，避免 effect 体内同步 setState。
export function useSearchEngine(enabled: boolean): UseSearchEngineResult {
  const [engine, setEngine] = useState<SearchEngine | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (!enabled || engine || failed) {
      return
    }
    let active = true
    void getSearchEngine().then((next) => {
      if (!active) {
        return
      }
      if (next) {
        setEngine(next)
      } else {
        setFailed(true)
      }
    })
    return () => {
      active = false
    }
  }, [enabled, engine, failed])

  let status: SearchEngineStatus
  if (engine !== null) {
    status = 'ready'
  } else if (failed) {
    status = 'error'
  } else if (enabled) {
    status = 'loading'
  } else {
    status = 'idle'
  }
  return { status, engine }
}
