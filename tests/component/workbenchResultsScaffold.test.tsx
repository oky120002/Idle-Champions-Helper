import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { WorkbenchResultsScaffold } from '../../src/components/workbench/WorkbenchResultsScaffold'

describe('WorkbenchResultsScaffold', () => {
  it('在有结果时保留外层包壳并渲染内容', () => {
    render(
      <WorkbenchResultsScaffold
        ariaLabel="变体筛选结果"
        sectionClassName="variants-results"
        panelClassName="results-panel"
        isEmpty={false}
        emptyState={{ detail: 'unused' }}
      >
        <div>结果内容</div>
      </WorkbenchResultsScaffold>,
    )

    expect(screen.getByLabelText('变体筛选结果')).toHaveClass('variants-results')
    expect(screen.getByText('结果内容')).toBeInTheDocument()
    expect(document.querySelector('.results-panel')).not.toBeNull()
  })

  it('在空结果时渲染统一空态', () => {
    render(
      <WorkbenchResultsScaffold
        ariaLabel="宠物筛选结果"
        sectionClassName="results-panel"
        shellClassName="results-panel-shell"
        isEmpty
        emptyState={{
          title: '没有匹配宠物',
          detail: '当前筛选条件下没有匹配宠物。',
        }}
      >
        <div>不会显示</div>
      </WorkbenchResultsScaffold>,
    )

    expect(screen.getByText('没有匹配宠物')).toBeInTheDocument()
    expect(screen.getByText('当前筛选条件下没有匹配宠物。')).toBeInTheDocument()
    expect(screen.queryByText('不会显示')).not.toBeInTheDocument()
    expect(document.querySelector('.results-panel-shell')).not.toBeNull()
  })
})
