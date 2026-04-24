import { describe, expect, it, vi } from 'vitest'
import {
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
})
