import type { ReactNode } from 'react'
import type { StatusTone } from './StatusBanner'
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

interface ExclusiveStatusBannerItemConfig<TStatus extends string> extends AsyncStatusContent {
  id: string
  when: TStatus
  tone: StatusTone
}

interface ExclusiveStatusBannerItemsOptions<TStatus extends string> {
  status: TStatus
  items: ExclusiveStatusBannerItemConfig<TStatus>[]
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

export function createExclusiveStatusBannerItems<TStatus extends string>({
  status,
  items,
}: ExclusiveStatusBannerItemsOptions<TStatus>): StatusBannerStackItem[] {
  return items.map((item) => ({
    id: item.id,
    tone: item.tone,
    ...(item.title !== undefined ? { title: item.title } : {}),
    ...(item.detail !== undefined ? { detail: item.detail } : {}),
    ...(item.children !== undefined ? { children: item.children } : {}),
    hidden: item.when !== status,
  }))
}
