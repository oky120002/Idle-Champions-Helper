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
    expect(entries[0]?.requiredLevel).toBe(50)
    expect(entries[0]?.signals).toHaveLength(1)
    expect(entries[0]?.signals[0]?.dimension).toBe('vulnerability')
    expect(entries[0]?.signals[0]?.signal).toMatchObject({
      kind: 'enemyVulnerability',
      value: 300,
      monsterTags: ['beast'],
    })
  })

  it('requiredLevel 透传到 entry（UI 按 requiredLevel 分层：同层互斥，层间各选一个）', () => {
    const detail = {
      upgrades: [
        { id: '109', requiredLevel: 50, specializationName: { original: 'A', display: 'A' }, effectReference: 'hero_dps_multiplier_mult,40' },
        { id: '110', requiredLevel: 50, specializationName: { original: 'B', display: 'B' }, effectReference: 'hero_dps_multiplier_mult,40' },
        { id: '200', requiredLevel: 120, specializationName: { original: 'C', display: 'C' }, effectReference: 'hero_dps_multiplier_mult,40' },
      ],
    }
    const entries = buildSpecializationEntries(detail)
    expect(entries.find((e) => e.upgradeId === '109')?.requiredLevel).toBe(50)
    expect(entries.find((e) => e.upgradeId === '110')?.requiredLevel).toBe(50)
    expect(entries.find((e) => e.upgradeId === '200')?.requiredLevel).toBe(120)
  })

  it('requiredLevel 缺失 → null（向后兼容无等级门控的专精）', () => {
    const detail = {
      upgrades: [
        { id: '109', specializationName: { original: 'A', display: 'A' }, effectReference: 'hero_dps_multiplier_mult,40' },
      ],
    }
    expect(buildSpecializationEntries(detail)[0]?.requiredLevel).toBeNull()
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

  it('【bucket 路由】hero_dps 无目标 → carrySignals；global_dps / monster_with_tag → supportSignals', () => {
    // bucket 复现 base 分类（同一 normalizeEffectSignal）：自增益仅自走 carry 时计入，防泄漏给其他 carry。
    const detail = {
      upgrades: [
        { id: '201', requiredLevel: 50, specializationName: { original: 'Self', display: 'Self' }, effectReference: 'hero_dps_multiplier_mult,40' },
        { id: '202', requiredLevel: 50, specializationName: { original: 'Global', display: 'Global' }, effectReference: 'global_dps_multiplier_mult,40' },
        {
          id: '203',
          requiredLevel: 50,
          specializationName: { original: 'Vuln', display: 'Vuln' },
          effectDefinition: { snapshots: { original: { effect_keys: [{ effect_string: 'monster_with_tag_more_damage,300,beast' }] } } },
        },
      ],
    }
    const byId = new Map(buildSpecializationEntries(detail).map((e) => [e.upgradeId, e]))
    expect(byId.get('201')?.signals[0]?.bucket).toBe('carrySignals')
    expect(byId.get('202')?.signals[0]?.bucket).toBe('supportSignals')
    expect(byId.get('203')?.signals[0]?.bucket).toBe('supportSignals')
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

  it('buff_upgrade wrapper 增益专精 → 派生信号附到 catalog（修复 ADR 0017 偏差，不丢增益）', () => {
    const detail = {
      upgrades: [
        {
          id: '109',
          requiredLevel: 50,
          specializationName: { original: 'Beasts', display: '兽类' },
          effectDefinition: {
            snapshots: { original: { effect_keys: [{ effect_string: 'monster_with_tag_more_damage,300,beast' }] } },
          },
        },
      ],
      // 能力源 wrapper：+25% 增益 spec 109（非 upgrade-tree 源，不被 progression-exclusion 排除）
      ability: { effects: ['buff_upgrades,25,109'] },
    }
    const entries = buildSpecializationEntries(detail)
    const beast = entries.find((e) => e.upgradeId === '109')
    // 自身 +300 + 派生 +25，都 beast tag（runtime 随玩家选 109 注入 → +325）
    expect(beast?.signals).toHaveLength(2)
    const values = beast!.signals.map((s) => s.signal.value).sort((a, b) => a - b)
    expect(values).toEqual([25, 300])
    expect(beast!.signals.map((s) => s.signal.monsterTags)).toEqual([['beast'], ['beast']])
  })

  it('真实 Minsc(7) champion-details → 5 偏好敌人专精（108-112），各含自身 +300 与 wrapper 派生 +25', () => {
    const entries = buildSpecializationEntries(minscDetail())
    const byId = new Map(entries.map((e) => [e.upgradeId, e]))
    expect(['108', '109', '110', '111', '112'].every((id) => byId.has(id))).toBe(true)
    const beast = byId.get('109')
    expect(beast?.specializationName?.display).toContain('兽类')
    // 自身 enemyVulnerability 300 + wrapper 派生 25（buff_upgrades,25,108-112 增益），都 beast tag
    expect(beast?.signals).toHaveLength(2)
    expect(beast!.signals.map((s) => s.signal.value).sort((a, b) => a - b)).toEqual([25, 300])
    expect(beast!.signals.every((s) => s.signal.monsterTags?.includes('beast'))).toBe(true)
    // 其余专精同理（humanoid/monstrosity 各含自身 + 派生）
    expect(byId.get('108')?.signals.length).toBeGreaterThanOrEqual(2)
    expect(byId.get('112')?.signals.some((s) => s.signal.monsterTags?.includes('monstrosity'))).toBe(true)
  })
})
