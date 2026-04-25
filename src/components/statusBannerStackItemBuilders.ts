import type { ReactNode } from 'react'
import type { StatusBannerStackItem } from './StatusBannerStack'

type AsyncStatus = 'loading' | 'ready' | 'error'

interface AsyncStatusContent {
  title?: ReactNode
  detail?: ReactNode
  children?: ReactNode
}

interface AsyncStatusBannerItemsOptions {
  status: AsyncStatus
  loading: AsyncStatusContent
  error: {
    title: ReactNode
    detail?: ReactNode
  }
}

export function createAsyncStatusBannerItems({
  status,
  loading,
  error,
}: AsyncStatusBannerItemsOptions): StatusBannerStackItem[] {
  return [
    {
      id: 'loading',
      tone: 'info',
      ...(loading.title !== undefined ? { title: loading.title } : {}),
      ...(loading.detail !== undefined ? { detail: loading.detail } : {}),
      ...(loading.children !== undefined ? { children: loading.children } : {}),
      hidden: status !== 'loading',
    },
    {
      id: 'error',
      tone: 'error',
      title: error.title,
      ...(error.detail !== undefined ? { detail: error.detail } : {}),
      hidden: status !== 'error',
    },
  ]
}
