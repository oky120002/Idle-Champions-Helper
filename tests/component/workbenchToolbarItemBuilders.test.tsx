import { describe, expect, it, vi } from 'vitest'
import {
  createWorkbenchFilterToolbarItems,
  createWorkbenchResultVisibilityItem,
  createWorkbenchShuffleItem,
} from '../../src/components/workbench/WorkbenchToolbarItemBuilders'

const t = ({ zh }: { zh: string; en: string }) => zh

describe('WorkbenchToolbarItemBuilders', () => {
  it('生成结果展开按钮配置', () => {
    expect(
      createWorkbenchResultVisibilityItem({
        t,
        defaultVisibleCount: 50,
        filteredCount: 62,
        showAllResults: false,
        canToggle: true,
        isReady: true,
        onClick: vi.fn(),
      }),
    ).toMatchObject({
      id: 'toggle-visibility',
      label: '显示全部 62（默认 50）',
      hidden: false,
      isActive: false,
      ariaPressed: false,
      variant: 'prominent',
    })
  })

  it('生成重新随机按钮配置', () => {
    expect(
      createWorkbenchShuffleItem({
        t,
        resultCount: 10,
        hasRandomOrder: true,
        isReady: true,
        onClick: vi.fn(),
      }),
    ).toMatchObject({
      id: 'shuffle-results',
      label: '重新随机',
      hidden: false,
      isActive: true,
    })
  })

  it('按配置组合筛选页 toolbar items', () => {
    expect(
      createWorkbenchFilterToolbarItems({
        t,
        defaultVisibleCount: 50,
        filteredCount: 62,
        showAllResults: false,
        canToggle: true,
        isReady: true,
        onToggleVisibility: vi.fn(),
        shareState: 'idle',
        onCopy: vi.fn(async () => {}),
        shuffle: {
          hasRandomOrder: false,
          onShuffle: vi.fn(),
        },
      }),
    ).toMatchObject([
      {
        id: 'toggle-visibility',
        label: '显示全部 62（默认 50）',
      },
      {
        id: 'shuffle-results',
        label: '随机排序',
      },
      {
        id: 'share-link',
        kind: 'share',
        state: 'idle',
      },
    ])
  })
})
