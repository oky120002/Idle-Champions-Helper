import { describe, expect, it } from 'vitest'
import {
  extractOfficialFormations,
  normalizeOfficialFormationSlots,
} from '../../../scripts/data/formation-layout-helpers.mjs'

describe('formation layout helpers', () => {
  it('按官方坐标归一化槽位，并把邻接关系改写成稳定 slot id', () => {
    const slots = normalizeOfficialFormationSlots([
      { x: 60, y: 40, col: 0, adj: [1, 2] },
      { x: 40, y: 20, col: 1, adj: [0, 2] },
      { x: 40, y: 60, col: 1, adj: [0, 1] },
    ])

    expect(slots).toEqual([
      {
        id: 's1',
        row: 2,
        column: 1,
        x: 60,
        y: 40,
        adjacentSlotIds: ['s2', 's3'],
      },
      {
        id: 's2',
        row: 1,
        column: 2,
        x: 40,
        y: 20,
        adjacentSlotIds: ['s1', 's3'],
      },
      {
        id: 's3',
        row: 3,
        column: 2,
        x: 40,
        y: 60,
        adjacentSlotIds: ['s1', 's2'],
      },
    ])
  })

  it('把 campaign / adventure / variant 的官方阵型去重后归并到同一个布局上', () => {
    const rawDefinitions = {
      campaign_defines: [
        {
          id: 1,
          name: 'Campaign One',
          game_changes: [
            {
              formation: [
                { x: 60, y: 40, col: 0, adj: [1, 2] },
                { x: 40, y: 20, col: 1, adj: [0, 2] },
                { x: 40, y: 60, col: 1, adj: [0, 1] },
              ],
            },
          ],
        },
      ],
      adventure_defines: [
        {
          id: 10,
          name: 'Adventure One',
          campaign_id: 1,
          game_changes: [
            {
              formation: [
                { x: 60, y: 40, col: 0, adj: [1, 2] },
                { x: 40, y: 20, col: 1, adj: [0, 2] },
                { x: 40, y: 60, col: 1, adj: [0, 1] },
              ],
            },
          ],
        },
        {
          id: 11,
          name: 'Variant One',
          campaign_id: 1,
          variant_adventure_id: 10,
          game_changes: [
            {
              formation: [
                { x: 80, y: 30, col: 0, row: 2, adj: [1, 2] },
                { x: 60, y: 20, col: 1, row: 1, adj: [0, 2] },
                { x: 60, y: 40, col: 1, row: 3, adj: [0, 1] },
              ],
            },
          ],
        },
      ],
    }

    const localizedDefinitions = {
      campaign_defines: [
        {
          id: 1,
          name: '战役一',
        },
      ],
      adventure_defines: [
        {
          id: 10,
          name: '冒险一',
        },
        {
          id: 11,
          name: '变体一',
        },
      ],
    }

    const layouts = extractOfficialFormations(rawDefinitions, localizedDefinitions)

    expect(layouts).toHaveLength(2)

    expect(layouts[0]).toMatchObject({
      name: '战役一 · 3 槽',
      applicableContexts: [
        { kind: 'campaign', id: '1' },
        { kind: 'adventure', id: '10' },
      ],
      sourceContexts: [
        {
          kind: 'campaign',
          id: '1',
          name: {
            original: 'Campaign One',
            display: '战役一',
          },
        },
        {
          kind: 'adventure',
          id: '10',
          name: {
            original: 'Adventure One',
            display: '冒险一',
          },
        },
      ],
    })

    expect(layouts[1]).toMatchObject({
      name: '变体一 · 3 槽',
      applicableContexts: [{ kind: 'variant', id: '11' }],
      sourceContexts: [
        {
          kind: 'variant',
          id: '11',
          name: {
            original: 'Variant One',
            display: '变体一',
          },
          campaignId: '1',
          variantAdventureId: '10',
        },
      ],
      slots: [
        {
          id: 's1',
          row: 2,
          column: 1,
        },
        {
          id: 's2',
          row: 1,
          column: 2,
        },
        {
          id: 's3',
          row: 3,
          column: 2,
        },
      ],
    })
  })
})
