import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { LocalDevSnapshotSection } from '../../pages/user-data/LocalDevSnapshotSection.prod'
import { createUserProfileSnapshot } from './fixtures'

describe('production local dev snapshot section', () => {
  it('生产构建不渲染任何开发快照入口', () => {
    const { container } = render(
      <LocalDevSnapshotSection
        canLoadLocalDevSnapshot={false}
        profileResolution={{
          selectedSource: 'browser-sync',
          resolvedSource: 'browser-sync',
          snapshot: createUserProfileSnapshot(),
          errorMessage: null,
          persisted: true,
        }}
        selectedProfileSource="browser-sync"
        localDevRefreshState={{ status: 'idle' }}
        onSelectBrowserSnapshot={vi.fn()}
        onSelectLocalDevSnapshot={vi.fn()}
        onRefreshLocalDevSnapshot={vi.fn()}
      />,
    )

    expect(container).toBeEmptyDOMElement()
    expect(screen.queryByText('本地开发快照')).not.toBeInTheDocument()
    expect(screen.queryByText('当前开发数据源')).not.toBeInTheDocument()
  })
})
