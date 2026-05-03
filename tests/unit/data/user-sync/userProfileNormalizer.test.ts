import { describe, expect, it } from 'vitest'
import {
  buildUserProfileSnapshot,
  normalizeCampaignDetails,
  normalizeFormationSaves,
  normalizeUserDetails,
} from '../../../../src/data/user-sync/userProfileNormalizer'

describe('user payload normalizer', () => {
  describe('normalizeUserDetails', () => {
    it('从 mock getuserdetails 提取已拥有英雄、装备、feats、传奇信息和 warning', () => {
      const payload = {
        user_id: '12345678',
        heroes: [
          {
            hero_id: '1',
            level: 500,
            equipment: { 0: 3, 1: 2, 2: 1 },
            feats: [{ id: 'feat-1', name: 'Shield' }],
            legendary_effects: [{ id: 'leg-1', slot: 0 }],
          },
          {
            hero_id: '5',
            level: 300,
            equipment: {},
            feats: [],
            legendary_effects: [],
          },
        ],
        some_unknown_field: 'should not crash',
      }

      const result = normalizeUserDetails(payload)

      expect(result.ownedHeroes).toHaveLength(2)
      expect(result.ownedHeroes[0]?.heroId).toBe('1')
      expect(result.ownedHeroes[0]?.level).toBe(500)
      expect(result.ownedHeroes[0]?.equipment['0']).toBe(3)
      expect(result.ownedHeroes[0]?.feats).toEqual(['feat-1'])
      expect(result.ownedHeroes[0]?.legendaryEffects).toEqual(['leg-1'])
    })

    it('字段缺失时产生 warning 而不是崩溃', () => {
      const payload = {}

      const result = normalizeUserDetails(payload)

      expect(result.ownedHeroes).toEqual([])
      expect(result.warnings.length).toBeGreaterThan(0)
    })

    it('兼容官方 getuserdetails 的 details.heroes 形态', () => {
      const result = normalizeUserDetails({
        details: {
          instance_id: '7',
          heroes: [
            {
              hero_id: 12,
              level: '900',
              equipment: { 1: '4' },
              feats: [{ id: 101 }],
              legendary_effects: [{ id: 'leg-12' }],
            },
          ],
        },
      })

      expect(result.ownedHeroes).toEqual([
        {
          heroId: '12',
          level: 900,
          equipment: { 1: 4 },
          feats: ['101'],
          legendaryEffects: ['leg-12'],
        },
      ])
    })
  })

  describe('normalizeCampaignDetails', () => {
    it('提取 campaign/favor 数据（存在时）', () => {
      const payload = {
        campaigns: [
          {
            campaign_id: '1',
            favor: '1.50e92',
            blessings: { 1: 5, 2: 3 },
          },
        ],
      }

      const result = normalizeCampaignDetails(payload)

      expect(result.campaigns).toHaveLength(1)
      expect(result.campaigns[0]?.campaignId).toBe('1')
      expect(result.campaigns[0]?.favor).toBe('1.50e92')
    })

    it('campaign 数据缺失时返回空数组', () => {
      const result = normalizeCampaignDetails({})

      expect(result.campaigns).toEqual([])
    })
  })

  describe('normalizeFormationSaves', () => {
    it('提取导入阵型保存', () => {
      const payload = {
        formations: [
          {
            formation_id: 'fm-1',
            layout_id: 'layout-grand-hero',
            scenario: { kind: 'adventure' as const, id: '10' },
            placements: { s1: '1', s2: '5' },
            specializations: { '1': 'spec-a' },
            feats: { '1': ['feat-1'] },
            familiars: { s1: 'fam-1' },
            is_favorite: true,
          },
        ],
      }

      const result = normalizeFormationSaves(payload)

      expect(result.formations).toHaveLength(1)
      const save = result.formations[0]!
      expect(save.formationId).toBe('fm-1')
      expect(save.layoutId).toBe('layout-grand-hero')
      expect(save.scenarioRef).toEqual({ kind: 'adventure', id: '10' })
      expect(save.specializations['1']).toBe('spec-a')
      expect(save.feats['1']).toEqual(['feat-1'])
      expect(save.familiars.s1).toBe('fam-1')
      expect(save.isFavorite).toBe(true)
    })

    it('阵型保存数据缺失时返回空数组', () => {
      const result = normalizeFormationSaves({})

      expect(result.formations).toEqual([])
    })

    it('兼容官方 all_saves 阵型保存对象', () => {
      const result = normalizeFormationSaves({
        all_saves: {
          save_a: {
            formation_id: 99,
            layout_id: 3,
            campaign_id: 1,
            adventure_id: 10,
            formation: { slot_1: 12 },
            specializations: { 12: 55 },
            feats: { 12: [101, 102] },
            familiars: { slot_1: 'fam-1' },
            is_favorite: 1,
          },
        },
      })

      expect(result.formations).toHaveLength(1)
      expect(result.formations[0]).toMatchObject({
        formationId: '99',
        layoutId: '3',
        scenarioRef: { kind: 'adventure', id: '10' },
        placements: { slot_1: '12' },
        specializations: { 12: '55' },
        feats: { 12: ['101', '102'] },
        familiars: { slot_1: 'fam-1' },
        isFavorite: true,
      })
    })
  })

  describe('buildUserProfileSnapshot', () => {
    it('把用户详情、campaign 和阵型 payload 合并为本地快照', () => {
      const snapshot = buildUserProfileSnapshot({
        userDetails: {
          details: {
            heroes: [{ hero_id: '1', level: 500 }],
          },
        },
        campaignDetails: {
          campaigns: [{ campaign_id: '1', favor: '1.50e92' }],
        },
        formationSaves: {
          formations: [{ formation_id: 'fm-1', layout_id: 'layout-1' }],
        },
        updatedAt: '2026-05-03T00:00:00.000Z',
      })

      expect(snapshot.schemaVersion).toBe(1)
      expect(snapshot.updatedAt).toBe('2026-05-03T00:00:00.000Z')
      expect(snapshot.ownedHeroes).toHaveLength(1)
      expect(snapshot.importedFormationSaves).toHaveLength(1)
      expect(snapshot.warnings).toEqual(expect.arrayContaining([
        'campaign details imported: 1',
      ]))
    })
  })
})
