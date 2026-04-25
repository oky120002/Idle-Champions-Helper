import { describe, expect, it } from 'vitest'
import {
  createAsyncStatusBannerItems,
  createExclusiveStatusBannerItems,
} from '../../src/components/statusBannerStackItemBuilders'

describe('statusBannerStackItemBuilders', () => {
  it('根据 loading 状态构造可见的 loading banner', () => {
    expect(
      createAsyncStatusBannerItems({
        status: 'loading',
        loading: {
          title: '正在加载',
          detail: '读取本地目录',
        },
        error: {
          title: '加载失败',
          detail: '未知错误',
        },
      }),
    ).toEqual([
      expect.objectContaining({
        id: 'loading',
        tone: 'info',
        title: '正在加载',
        detail: '读取本地目录',
        hidden: false,
      }),
      expect.objectContaining({
        id: 'error',
        tone: 'error',
        hidden: true,
      }),
    ])
  })

  it('根据 error 状态构造可见的 error banner', () => {
    expect(
      createAsyncStatusBannerItems({
        status: 'error',
        loading: {
          children: '正在读取英雄数据…',
        },
        error: {
          title: '数据读取失败',
          detail: '文件缺失',
        },
      }),
    ).toEqual([
      expect.objectContaining({
        id: 'loading',
        hidden: true,
      }),
      expect.objectContaining({
        id: 'error',
        tone: 'error',
        title: '数据读取失败',
        detail: '文件缺失',
        hidden: false,
      }),
    ])
  })

  it('根据互斥状态构造单个可见 banner', () => {
    expect(
      createExclusiveStatusBannerItems({
        status: 'error',
        items: [
          {
            id: 'success',
            when: 'success',
            tone: 'success',
            children: '解析成功',
          },
          {
            id: 'error',
            when: 'error',
            tone: 'error',
            children: '解析失败',
          },
        ],
      }),
    ).toEqual([
      expect.objectContaining({
        id: 'success',
        hidden: true,
      }),
      expect.objectContaining({
        id: 'error',
        tone: 'error',
        children: '解析失败',
        hidden: false,
      }),
    ])
  })
})
