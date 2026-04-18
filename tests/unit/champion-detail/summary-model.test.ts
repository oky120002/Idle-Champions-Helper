import { describe, expect, it } from 'vitest'
import { collectStructuredSummaryTags } from '../../../src/pages/champion-detail/summary-model'
import type { EffectContext } from '../../../src/pages/champion-detail/types'

const effectContext: EffectContext = {
  locale: 'en-US',
  championName: 'Test Champion',
  attackLabelById: new Map(),
  upgradeLabelById: new Map(),
}

describe('collectStructuredSummaryTags', () => {
  it('过滤掉已移除的可用性字段', () => {
    const tags = collectStructuredSummaryTags(
      {
        available_in_store: 'blocked store field',
        allow_time_gate: 'blocked gate field',
        time_gate_blackout: {
          start: 'blocked time gate blackout start',
          end: 'blocked time gate blackout end',
        },
        store_blackout: {
          start: 'blocked store blackout start',
          end: 'blocked store blackout end',
        },
        weekly_buff: 'keep-me',
      },
      'en-US',
      effectContext,
    )

    expect(tags).toEqual(['Weekly buff: keep-me'])
  })
})
