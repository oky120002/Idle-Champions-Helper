import { describe, expect, it } from 'vitest'
import type { JsonValue } from '../../../src/domain/types'
import { buildAttackLabelById, buildEffectContext, buildUpgradeLabelById } from '../../../src/pages/champion-detail/detail-derived-context'
import { buildEffectDefinitionPresentation, buildUpgradePresentation } from '../../../src/pages/champion-detail/effect-model'
import { championDetailBaseFixture } from '../../component/champion-detail/championDetailBaseFixture'
import { championDetailCatalogFixture } from '../../component/champion-detail/championDetailCatalogFixture'
import type { ChampionDetail, ChampionRawEntry, ChampionUpgradeDetail } from '../../../src/domain/types'

function createDetail(overrides?: Partial<ChampionDetail>): ChampionDetail {
  return {
    ...championDetailBaseFixture,
    ...championDetailCatalogFixture,
    ...overrides,
  }
}

function createEffectDefinitionEntry(id: string, displayDesc: string, originalDesc = displayDesc, effectKeys: JsonValue[] = []): ChampionRawEntry {
  return {
    id,
    snapshots: {
      original: {
        id: Number(id),
        description: { desc: originalDesc },
        effect_keys: effectKeys,
      },
      display: {
        id: Number(id),
        description: { desc: displayDesc },
        effect_keys: effectKeys,
      },
    },
  }
}

function createUpgrade(
  id: string,
  effectDefinition: ChampionRawEntry,
  overrides?: Partial<ChampionUpgradeDetail>,
): ChampionUpgradeDetail {
  return {
    id,
    requiredLevel: 10,
    requiredUpgradeId: null,
    name: {
      original: `Upgrade ${id}`,
      display: `升级 ${id}`,
    },
    upgradeType: 'unlock_ability',
    effectReference: `effect_def,${effectDefinition.id}`,
    effectDefinition,
    staticDpsMult: null,
    defaultEnabled: true,
    specializationName: null,
    specializationDescription: null,
    specializationGraphicId: null,
    tipText: null,
    ...overrides,
  }
}

describe('champion detail effect model', () => {
  it('替换呆宝们职业颜色占位符', () => {
    const detail = createDetail()
    const attackLabelById = buildAttackLabelById(detail, 'zh-CN')
    const upgradeLabelById = buildUpgradeLabelById(detail, 'zh-CN', attackLabelById)
    const effectContext = buildEffectContext(detail, 'zh-CN', attackLabelById, upgradeLabelById)

    expect(effectContext).not.toBeNull()

    const entry = createEffectDefinitionEntry(
      '901',
      '激活“{Fighter}#ed8730”时，每当呆宝们攻击，会让他们后方的勇士伤害提高 $(amount)%。',
      'When the {Fighter}#ed8730 is active, the champions behind the NERDS deal $(amount)% more damage.',
      [{ effect_string: 'global_dps_multiplier_mult,100' }],
    )

    const presentation = buildEffectDefinitionPresentation(entry, effectContext!)
    expect(presentation.summary).toBe('激活“战士”时，每当呆宝们攻击，会让他们后方的勇士伤害提高 100%。')
  })

  it('支持妮茜这类跨 effect key 的 amount___N 和 upgrade_name id___N', () => {
    const detail = createDetail({
      summary: {
        ...championDetailBaseFixture.summary,
        id: '123',
        name: {
          original: 'Nixie',
          display: '妮茜',
        },
      },
    })
    const effectDefinition = createEffectDefinitionEntry(
      '1474',
      '^^盆栽能量 - $(source_hero)变成盆栽 5 秒，期间无法攻击。在此状态下，$(upgrade_name id___5)的伤害加成提高 $(amount___5)%，之后额外持续 15 秒^放大 - $(source_hero)的伤害也提高 $(amount___11)%，持续 20 秒。',
      '^^Potted Punch - $(source_hero) becomes a potted plant. $(upgrade_name id___5) increases by $(amount___5)%^Enlarge - $(source_hero) damage increases by $(amount___11)%',
      [
        { effect_string: 'nixie_wild_magic_surge' },
        { effect_string: 'nixie_engulfing_flames,1' },
        { effect_string: 'nixie_potted_punch' },
        { effect_string: 'change_base_attack,622', apply_manually: true },
        { effect_string: 'buff_upgrade,100,10887', apply_manually: true },
        { effect_string: 'nixie_coin_cascade,10' },
        { effect_string: 'nixie_shockwave,5' },
        { effect_string: 'nixie_feeling_blue' },
        { effect_string: 'nixie_eldritch_entourage' },
        { effect_string: 'increase_hero_scale,25', apply_manually: true },
        { effect_string: 'hero_dps_multiplier_mult,100', apply_manually: true },
      ],
    )
    const linkedUpgrade = createUpgrade('10887', createEffectDefinitionEntry('10887', '闪耀魅力'), {
      name: {
        original: 'Flashy Charm',
        display: '闪耀魅力',
      },
      effectDefinition: null,
      effectReference: null,
    })
    const upgradedDetail = createDetail({
      summary: detail.summary,
      upgrades: [linkedUpgrade],
    })
    const upgradedAttackLabels = buildAttackLabelById(upgradedDetail, 'zh-CN')
    const upgradeLabelById = buildUpgradeLabelById(upgradedDetail, 'zh-CN', upgradedAttackLabels)
    const effectContext = buildEffectContext(upgradedDetail, 'zh-CN', upgradedAttackLabels, upgradeLabelById)

    expect(effectContext).not.toBeNull()

    const presentation = buildEffectDefinitionPresentation(effectDefinition, effectContext!)

    expect(presentation.summary).toContain('盆栽能量 - 妮茜变成盆栽 5 秒')
    expect(presentation.summary).toContain('闪耀魅力的伤害加成提高 100%')
    expect(presentation.summary).toContain('放大 - 妮茜的伤害也提高 100%')
  })

  it('支持用备用攻击 id 替换 [#378J] 这类占位符', () => {
    const detail = createDetail({
      raw: {
        ...championDetailCatalogFixture.raw,
        attacks: [
          {
            id: '13',
            snapshots: {
              original: { id: 13, name: 'Cleave' },
              display: { id: 13, name: '顺势斩' },
            },
          },
          {
            id: '378',
            snapshots: {
              original: { id: 378, name: 'Burning Hands' },
              display: { id: 378, name: '燃烧之手' },
            },
          },
        ],
      },
    })
    const attackLabelById = buildAttackLabelById(detail, 'zh-CN')
    const upgradeLabelById = buildUpgradeLabelById(detail, 'zh-CN', attackLabelById)
    const effectContext = buildEffectContext(detail, 'zh-CN', attackLabelById, upgradeLabelById)

    expect(effectContext).not.toBeNull()

    const entry = createEffectDefinitionEntry(
      '809',
      '将普攻替换为 [#378J]',
      'Replace the base attack with [#378J]',
      [{ effect_string: 'change_base_attack,378' }],
    )

    const presentation = buildEffectDefinitionPresentation(entry, effectContext!)
    expect(presentation.summary).toBe('将普攻替换为 燃烧之手')
  })

  it('对 amount_expr 支持当前 effect key 索引取值，避免梅亨类 0% 错值', () => {
    const effectDefinition = createEffectDefinitionEntry(
      '2188',
      '阵型中每有一位龙裔勇士，梅亨会使“暴躁”的效果提高 $amount%，以乘算方式堆叠，并且会应用于堆叠后的数值。当此项专精被选中时，法莉德和哈维拉都会算作龙裔。',
      'Mehen increases Grumpy by $amount% for each Dragonborn champion.',
      [
        { effect_string: 'pre_stack,300', off_when_benched: true },
        {
          effect_string: 'buff_upgrade,0,16146,1',
          amount_expr: 'upgrade_amount(16152,0)',
          amount_func: 'mult',
        },
        { effect_string: 'add_hero_tags,0,dragonborn' },
      ],
    )
    const grumpyUpgrade = createUpgrade('16146', createEffectDefinitionEntry('16146', '暴躁'), {
      name: {
        original: 'Grumpy',
        display: '暴躁',
      },
      effectDefinition: null,
      effectReference: null,
    })
    const upgradedDetail = createDetail({ upgrades: [grumpyUpgrade] })
    const attackLabelById = buildAttackLabelById(upgradedDetail, 'zh-CN')
    const upgradeLabelById = buildUpgradeLabelById(upgradedDetail, 'zh-CN', attackLabelById)
    const effectContext = buildEffectContext(upgradedDetail, 'zh-CN', attackLabelById, upgradeLabelById)

    expect(effectContext).not.toBeNull()

    const presentation = buildEffectDefinitionPresentation(effectDefinition, effectContext!)
    expect(presentation.summary).toContain('提高 300%')
    expect(presentation.summary).not.toContain('提高 0%')
  })

  it('收集 raw attacks 中的额外攻击标签', () => {
    const detail = createDetail({
      raw: {
        ...championDetailCatalogFixture.raw,
        attacks: [
          {
            id: '13',
            snapshots: {
              original: { id: 13, name: 'Cleave' },
              display: { id: 13, name: '顺势斩' },
            },
          },
          {
            id: '378',
            snapshots: {
              original: { id: 378, name: 'Burning Hands' },
              display: { id: 378, name: '燃烧之手' },
            },
          },
        ],
      },
    })

    expect(buildAttackLabelById(detail, 'zh-CN').get('378')).toBe('燃烧之手')
  })

  it('升级展示对 amount_expr 取值时不再显示 0%', () => {
    const definition = createEffectDefinitionEntry(
      '2186',
      '阵型中每有一位伤害输出型勇士，梅亨会使“暴躁”的效果提高 $amount%，以乘算方式堆叠，并且会应用于堆叠后的数值。',
      'Mehen increases the effect of Grumpy by $amount% for each DPS Champion.',
      [
        { effect_string: 'pre_stack,100' },
        {
          effect_string: 'buff_upgrade,0,16146,1',
          amount_expr: 'upgrade_amount(16150,0)',
          amount_func: 'mult',
        },
      ],
    )
    const trackedUpgrade = createUpgrade('16146', createEffectDefinitionEntry('16146', '暴躁'), {
      name: {
        original: 'Grumpy',
        display: '暴躁',
      },
      effectDefinition: null,
      effectReference: null,
    })
    const subjectUpgrade = createUpgrade('16150', definition, {
      name: {
        original: 'Fighting Force',
        display: '战斗队伍',
      },
    })
    const detail = createDetail({
      summary: {
        ...championDetailBaseFixture.summary,
        id: '80',
        name: {
          original: 'Mehen',
          display: '梅亨',
        },
      },
      upgrades: [trackedUpgrade, subjectUpgrade],
    })
    const attackLabelById = buildAttackLabelById(detail, 'zh-CN')
    const upgradeLabelById = buildUpgradeLabelById(detail, 'zh-CN', attackLabelById)
    const effectContext = buildEffectContext(detail, 'zh-CN', attackLabelById, upgradeLabelById)

    expect(effectContext).not.toBeNull()

    const presentation = buildUpgradePresentation(subjectUpgrade, effectContext!)
    expect(presentation.summary).toContain('提高 100%')
    expect(presentation.summary).not.toContain('提高 0%')
  })
})
