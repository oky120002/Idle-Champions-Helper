import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { buildSpecializationEntries } from './specialization-catalog'

const minscDetail = () =>
  JSON.parse(
    readFileSync(new URL('../../public/data/v1/champion-details/7.json', import.meta.url), 'utf8'),
  )

describe('buildSpecializationEntries', () => {
  it('专精 upgrade effect_keys（monster_with_tag_more_damage）→ enemyVulnerability + damage 维度 + monsterTags', () => {
    const detail = {
      upgrades: [
        {
          id: '109',
          requiredLevel: 50,
          specializationName: { original: 'Favored Enemy: Beasts', display: '偏好敌人：兽类' },
          effectDefinition: {
            snapshots: { original: { effect_keys: [{ effect_string: 'monster_with_tag_more_damage,300,beast' }] } },
          },
        },
      ],
    }
    const entries = buildSpecializationEntries(detail)
    expect(entries).toHaveLength(1)
    expect(entries[0]?.upgradeId).toBe('109')
    expect(entries[0]?.specializationName?.display).toBe('偏好敌人：兽类')
    expect(entries[0]?.signals).toHaveLength(1)
    expect(entries[0]?.signals[0]?.dimension).toBe('vulnerability')
    expect(entries[0]?.signals[0]?.signal).toMatchObject({
      kind: 'enemyVulnerability',
      value: 300,
      monsterTags: ['beast'],
    })
  })

  it('effectReference 专精（hero_dps）→ damage 维度', () => {
    const detail = {
      upgrades: [
        {
          id: '200',
          requiredLevel: 60,
          specializationName: { original: 'X', display: 'X' },
          effectReference: 'hero_dps_multiplier_mult,40',
        },
      ],
    }
    const entries = buildSpecializationEntries(detail)
    expect(entries[0]?.signals[0]?.dimension).toBe('damage')
    expect(entries[0]?.signals[0]?.signal.kind).toBe('heroDpsMultiplier')
  })

  it('非专精 upgrade（specializationName=null）不进 catalog', () => {
    const detail = {
      upgrades: [
        { id: '300', requiredLevel: 1, specializationName: null, effectReference: 'hero_dps_multiplier_mult,40' },
      ],
    }
    expect(buildSpecializationEntries(detail)).toHaveLength(0)
  })

  it('非 scoring 维度的专精 effect → 跳过；无 scoring signal → 整条不进 catalog', () => {
    const detail = {
      upgrades: [
        {
          id: '400',
          requiredLevel: 50,
          specializationName: { original: 'Y', display: 'Y' },
          effectReference: 'increase_ability_score,cha,2',
        },
      ],
    }
    expect(buildSpecializationEntries(detail)).toHaveLength(0)
  })

  it('多专精 upgrade → 多 entry（按 upgradeId）', () => {
    const detail = {
      upgrades: [
        {
          id: '108',
          requiredLevel: 50,
          specializationName: { original: 'A', display: 'A' },
          effectDefinition: {
            snapshots: { original: { effect_keys: [{ effect_string: 'monster_with_tag_more_damage,300,humanoid' }] } },
          },
        },
        {
          id: '109',
          requiredLevel: 50,
          specializationName: { original: 'B', display: 'B' },
          effectDefinition: {
            snapshots: { original: { effect_keys: [{ effect_string: 'monster_with_tag_more_damage,300,beast' }] } },
          },
        },
      ],
    }
    const entries = buildSpecializationEntries(detail)
    expect(entries).toHaveLength(2)
    expect(entries.map((e) => e.upgradeId).sort()).toEqual(['108', '109'])
  })

  it('真实 Minsc(7) champion-details → 5 偏好敌人专精（108-112），各 enemyVulnerability 300 + 对应 monsterTag', () => {
    const entries = buildSpecializationEntries(minscDetail())
    const byId = new Map(entries.map((e) => [e.upgradeId, e]))
    expect(['108', '109', '110', '111', '112'].every((id) => byId.has(id))).toBe(true)
    const beast = byId.get('109')
    expect(beast?.specializationName?.display).toContain('兽类')
    expect(beast?.signals[0]?.signal).toMatchObject({
      kind: 'enemyVulnerability',
      value: 300,
      monsterTags: ['beast'],
    })
    // 等价性：catalog signal 与原 base 同 kind/value/tag（非全 active 烘进，而是按选择注入）
    expect(byId.get('108')?.signals[0]?.signal.monsterTags).toEqual(['humanoid'])
    expect(byId.get('112')?.signals[0]?.signal.monsterTags).toEqual(['monstrosity'])
  })
})
