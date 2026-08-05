import { useEffect, useState } from 'react'

const STORAGE_PREFIX = 'idle-champions-helper.workbench.'

function getStorage(): Storage | null {
  if (typeof window === 'undefined') {
    return null
  }

  const storage = window.localStorage

  if (typeof storage.getItem !== 'function' || typeof storage.setItem !== 'function') {
    return null
  }

  return storage
}

function buildStorageKey(storageKey: string): string {
  return `${STORAGE_PREFIX}${storageKey}.collapsed`
}

function readCollapsed(storageKey: string): boolean {
  const storage = getStorage()

  if (storage === null) {
    return false
  }

  return storage.getItem(buildStorageKey(storageKey)) === 'true'
}

export function useWorkbenchSidebarCollapse(storageKey: string) {
  const [isCollapsed, setIsCollapsed] = useState(() => readCollapsed(storageKey))
  const [prevStorageKey, setPrevStorageKey] = useState(storageKey)

  // storageKey 变化时在渲染期重置（React 推荐的"prop 变更调整 state"模式），避免 effect 内同步 setState。
  if (prevStorageKey !== storageKey) {
    setPrevStorageKey(storageKey)
    setIsCollapsed(readCollapsed(storageKey))
  }

  useEffect(() => {
    const storage = getStorage()

    if (storage === null) {
      return
    }

    storage.setItem(buildStorageKey(storageKey), isCollapsed ? 'true' : 'false')
  }, [isCollapsed, storageKey])

  return {
    isCollapsed,
    setCollapsed: setIsCollapsed,
    toggleCollapsed: () => setIsCollapsed((current) => !current),
  }
}
