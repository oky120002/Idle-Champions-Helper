import { useCallback, useEffect, useState } from 'react'

const SHARE_RESET_DELAY_MS = 2200

export type WorkbenchShareLinkState = 'idle' | 'success' | 'error'

export function buildWorkbenchShareUrl(pathname: string, search: string, hash: string): string | null {
  if (typeof window === 'undefined') {
    return null
  }

  const url = new URL(window.location.href)
  url.hash = `#${pathname}${search}${hash}`

  return url.toString()
}

export function useWorkbenchShareLink(pathname: string, search: string, hash: string) {
  const [shareLinkState, setShareLinkState] = useState<WorkbenchShareLinkState>('idle')

  useEffect(() => {
    if (shareLinkState === 'idle') {
      return undefined
    }

    const timeoutId = window.setTimeout(() => {
      setShareLinkState('idle')
    }, SHARE_RESET_DELAY_MS)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [shareLinkState])

  const copyCurrentLink = useCallback(async () => {
    const shareUrl = buildWorkbenchShareUrl(pathname, search, hash)

    if (!shareUrl || typeof navigator === 'undefined' || !navigator.clipboard?.writeText) {
      setShareLinkState('error')
      return
    }

    try {
      await navigator.clipboard.writeText(shareUrl)
      setShareLinkState('success')
    } catch {
      setShareLinkState('error')
    }
  }, [hash, pathname, search])

  return {
    shareLinkState,
    copyCurrentLink,
  }
}
