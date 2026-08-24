import os from 'node:os'
import path from 'node:path'
import { mkdtemp, writeFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'
import { readJson } from './data/io-utils.ts'
import { normalizeDefinitionsSnapshot } from './normalize-idle-champions-definitions.ts'
import { normalizeEffectReference } from './data/normalize-champions.ts'

describe('normalize-idle-champions-definitions', () => {
  it('输出官方原文和中文展示双字段', async () => {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), 'idle-champions-normalize-'))
    const outputDir = path.join(tempDir, 'data')
    const versionFile = path.join(tempDir, 'version.json')

    await normalizeDefinitionsSnapshot({
      input: path.resolve('scripts/fixtures/mock-definitions.json'),
      localizedInput: path.resolve('scripts/fixtures/mock-definitions-zh.json'),
      outputDir,
      versionFile,
    })

    const champions = (await readJson(path.join(outputDir, 'champions.json'))) as {
      items: Array<{
        name: { original: string; display: string }
        affiliations: Array<{ original: string; display: string }>
        patronEligibility: {
          eligiblePatronIds: string[]
          ruleQualifiedPatronIds: string[]
          forcedEligiblePatronIds: string[]
          unsupportedPatronIds: string[]
        }
      }>
    }
    const adventures = (await readJson(path.join(outputDir, 'adventures.json'))) as {
      items: unknown[]
    }
    const patrons = (await readJson(path.join(outputDir, 'patrons.json'))) as {
      items: Array<{
        id: string
        name: { original: string; display: string }
        description: { original: string; display: string }
        shortName: string
        restrictionsText: Array<{ original: string; display: string }>
        minObjectiveLevel: number
        defaultObjectiveBump: number
        weeklyFreePlayCap: number
        forceAllowedHeroIds: unknown[]
        eligibilityRules: Array<{
          type: string
          rawExpression: string
          requiredAnyTags: string[]
          supported: boolean
        }>
        evaluationStatus: string
      }>
    }
    const gameRules = (await readJson(path.join(outputDir, 'game-rules.json'))) as {
      items: Array<{
        id: string
        ruleName: string
        topLevelKeys: string[]
        rule: { tags: string[]; enabled: boolean }
      }>
    }
    const effectReference = (await readJson(path.join(outputDir, 'effect-reference.json'))) as {
      stats: Array<{
        id: string
        name: string
        multiKey: boolean
        clearOnReset: boolean
        serverOnly: boolean
        readOnly: boolean
        properties: unknown
      }>
      buffs: Array<{
        id: string
        name: { original: string; display: string }
        description: { original: string; display: string }
        pluralName: { original: string; display: string }
        effect: {
          effectString: string
          key: string
          args: string[]
          effectDefinitionId: string | null
        }
        rarity: number
        duration: number
        graphicId: string
        inventoryGraphicId: string
        odds: number
        inventoryOrder: number
        tags: string[]
        properties: unknown
      }>
      effectKeys: Array<{
        id: string
        key: string
        owner: unknown
        paramNames: Array<{ name: string; type: string | null }>
        descriptions: {
          desc: { original: string; display: string }
        }
        negative: boolean
        properties: { scope: string } | null
      }>
    }
    const patronPerks = (await readJson(path.join(outputDir, 'patron-perks.json'))) as {
      tiers: Array<{
        id: string
        patronId: string
        tierId: string
        requiredPurchasedPerkCount: number | null
        requirements: unknown[]
      }>
      perks: Array<{
        id: string
        patronId: string
        tierId: string
        name: { original: string; display: string }
        graphicId: string
        typeId: number
        levels: number
        cost: { baseCost: number; scaling: number }
        effects: Array<{
          effectString: string
          key: string
          args: string[]
          perLevel: number
          targetName: string
          effectDefinitionId: string
        }>
        effectDefinitionIds: string[]
        properties: unknown[]
      }>
    }
    const trials = (await readJson(path.join(outputDir, 'trials.json'))) as {
      roles: Array<{
        id: string
        name: { original: string; display: string }
        description: { original: string; display: string }
        graphicId: string
        adventureId: string
        scenarioKind: string
        ruleContextId: string
        adventure: {
          id: string
          name: { original: string; display: string }
          campaign: { id: string; original: string; display: string }
          objectiveArea: number
          locationId: string
          areaSetId: string
        }
        position: { x: number; y: number }
      }>
      difficulties: Array<{
        id: string
        name: { original: string; display: string }
        shortName: string
        description: { original: string; display: string } | null
        graphicId: string
        points: number
        tiamatHealth: number
        costs: Array<{ costType: string; difficultyTokenId: string; amount: number }>
        rewardData: Array<{ deprecated: string }>
      }>
    }
    const variants = (await readJson(path.join(outputDir, 'variants.json'))) as {
      items: Array<{
        name: { original: string; display: string }
        ruleContextId: string
        scenarioKind: string
        modeTags: string[]
        patronObjectiveTiers: unknown[]
        campaign: { id: string; original: string; display: string }
        adventure: { original: string; display: string }
        adventureId: string
        objectiveArea: number
        locationId: string
        areaSetId: string
        scene: { id: string; original: string; display: string }
        restrictions: Array<{ original: string; display: string }>
        enemyCount: number
        enemyTypes: string[]
        enemyTypeCounts: Record<string, number>
        attackMix: Record<string, number>
        specialEnemyCount: number
        escortCount: number
        areaMilestones: number[]
        areaHighlights: Array<{
          id: string
          kind: string
          start: number
          end: number | null
          loopAt: number | null
          repeatAt: number | null
        }>
        mechanics: string[]
      }>
    }
    const enums = (await readJson(path.join(outputDir, 'enums.json'))) as {
      items: Array<{
        id: string
        values: unknown
      }>
    }
    const bruenorDetail = (await readJson(path.join(outputDir, 'champion-details', '1.json'))) as {
      loot: Array<{
        id: string
        name: { original: string; display: string }
        description: { original: string; display: string }
        graphicId: string
        slotId: number
        rarity: string
        maxLevel: number[]
        effects: Array<{ effect_string: string }>
        allowGoldenEpic: boolean
        isGoldenEpic: boolean
      }>
      legendaryEffects: Array<{
        id: string
        slotId: number
        effects: Array<{ effect_string: string }>
      }>
      raw: { loot: unknown[]; legendaryEffects: unknown[] }
    }
    const version = (await readJson(versionFile)) as { notes: string[] }
    const legendaryCatalog = (await readJson(path.join(outputDir, 'legendary-effects-catalog.json'))) as {
      items: Array<{ id: string; heroIds: string[] }>
    }

    expect(champions.items[0]?.name).toEqual({
      original: 'Bruenor',
      display: '布鲁诺',
    })
    expect(champions.items[1]?.name).toEqual({
      original: 'Hew Maan',
      display: 'Hew Maan',
    })
    expect(champions.items[0]?.affiliations).toEqual([
      {
        original: 'Companions of the Hall',
        display: '秘银五侠',
      },
    ])
    expect(champions.items[0]?.patronEligibility).toEqual({
      eligiblePatronIds: ['1', '2', '5'],
      ruleQualifiedPatronIds: ['1', '2', '5'],
      forcedEligiblePatronIds: [],
      unsupportedPatronIds: [],
    })
    expect(champions.items[1]?.patronEligibility).toEqual({
      eligiblePatronIds: ['5'],
      ruleQualifiedPatronIds: [],
      forcedEligiblePatronIds: ['5'],
      unsupportedPatronIds: [],
    })
    expect(bruenorDetail.loot).toEqual([
      {
        id: '1001',
        name: {
          original: 'Simple Shield',
          display: '简单盾牌',
        },
        description: {
          original: 'A steady shield for testing.',
          display: '用于测试的稳固盾牌。',
        },
        graphicId: '2001',
        slotId: 1,
        rarity: '3',
        maxLevel: [500, 250, 125],
        effects: [
          {
            effect_string: 'hero_dps_multiplier_mult,100',
          },
        ],
        allowGoldenEpic: true,
        isGoldenEpic: false,
      },
      {
        id: '1002',
        name: {
          original: 'Golden Shield',
          display: '黄金盾牌',
        },
        description: {
          original: 'A golden shield for testing.',
          display: '用于测试的黄金盾牌。',
        },
        graphicId: '2002',
        slotId: 1,
        rarity: '4',
        maxLevel: [500, 250, 125],
        effects: [
          {
            effect_string: 'hero_dps_multiplier_mult,200',
          },
        ],
        allowGoldenEpic: true,
        isGoldenEpic: true,
      },
    ])
    expect(bruenorDetail.legendaryEffects).toEqual([
      {
        id: '501',
        slotId: 1,
        effects: [
          {
            effect_string: 'increase_global_dps_mult,100',
          },
        ],
      },
      {
        id: '502',
        slotId: 2,
        effects: [
          {
            effect_string: 'increase_health_mult,50',
          },
        ],
      },
    ])
    expect(bruenorDetail.raw.loot.length).toBe(2)
    expect(bruenorDetail.raw.legendaryEffects.length).toBe(2)

    expect(adventures.items[0]).toEqual({
      id: '100',
      ruleContextId: 'adventure:100',
      scenarioKind: 'adventure',
      name: {
        original: 'The Test Adventure',
        display: '测试冒险',
      },
      campaign: {
        id: '1',
        original: 'A Grand Tour of the Sword Coast',
        display: '剑湾之旅',
      },
      description: {
        original: 'Test the base adventure contract.',
        display: '测试基础冒险合同。',
      },
      objectiveArea: 50,
      locationId: '8',
      areaSetId: '55',
      scene: {
        id: '1:8',
        original: 'The Test Adventure',
        display: '测试冒险',
      },
      requirements: [
        {
          original: 'Complete tutorial',
          display: '完成教学',
        },
      ],
      restrictions: [],
      rewards: [
        {
          original: 'Unlock free play',
          display: '解锁自由刷图',
        },
      ],
      repeatable: true,
      patronObjectiveTiers: [
        {
          patronId: '1',
          tierId: '1',
          objectiveArea: 250,
          objectives: [
            {
              condition: 'complete_area',
              area: '250',
            },
          ],
        },
      ],
      modeTags: ['adventure', 'free_play', 'patron'],
      mechanics: [],
    })
    expect(
      patrons.items.map((item) => item.id),
    ).toEqual(['1', '2', '5'])
    expect(patrons.items.find((item) => item.id === '1')).toEqual({
      id: '1',
      name: {
        original: 'Mirt the Moneylender',
        display: '米尔特',
      },
      description: {
        original: 'Only Good or Evil Champions can be used.',
        display: '只能使用善良或邪恶阵营的勇士。',
      },
      shortName: 'Mirt',
      restrictionsText: [
        {
          original: 'Only Good or Evil Champions can be used',
          display: '只能使用善良或邪恶阵营的勇士',
        },
      ],
      minObjectiveLevel: 250,
      defaultObjectiveBump: 100,
      weeklyFreePlayCap: 5000,
      forceAllowedHeroIds: [],
      eligibilityRules: [
        {
          type: 'tags',
          rawExpression: '!(good|evil)',
          requiredAnyTags: ['good', 'evil'],
          supported: true,
        },
      ],
      evaluationStatus: 'complete',
    })
    expect(gameRules.items[0]).toEqual({
      id: '1',
      ruleName: 'role_tags_v2',
      topLevelKeys: ['enabled', 'tags'],
      rule: {
        tags: ['support', 'tank', 'speed'],
        enabled: true,
      },
    })
    expect(effectReference.stats[0]).toEqual({
      id: '7',
      name: 'hero_level',
      multiKey: false,
      clearOnReset: true,
      serverOnly: false,
      readOnly: true,
      properties: null,
    })
    expect(effectReference.buffs[0]).toEqual({
      id: '11',
      name: {
        original: "Small Potion of Giant's Strength",
        display: '小瓶巨人之力药剂',
      },
      description: {
        original: 'A testing potion.',
        display: '测试用药剂。',
      },
      pluralName: {
        original: "Small Potions of Giant's Strength",
        display: '小瓶巨人之力药剂',
      },
      effect: {
        effectString: 'global_dps_multiplier_mult,100',
        key: 'global_dps_multiplier_mult',
        args: ['100'],
        effectDefinitionId: null,
      },
      rarity: 1,
      duration: 300,
      graphicId: '730',
      inventoryGraphicId: '731',
      odds: 100,
      inventoryOrder: 10,
      tags: ['dps', 'duration', 'potion'],
      properties: null,
    })
    expect(effectReference.effectKeys[1]).toEqual({
      id: '199',
      key: 'hero_dps_multiplier_if_attack_cooldown',
      owner: null,
      paramNames: [
        {
          name: 'amount',
          type: null,
        },
        {
          name: 'comparison',
          type: 'str',
        },
        {
          name: 'check',
          type: null,
        },
      ],
      descriptions: {
        desc: {
          original: 'Increases the DPS of $target by $amount% if their Base Attack cooldown matches $check.',
          display: '如果 $target 的基础攻击冷却满足 $check，则其伤害提高 $amount%。',
        },
      },
      negative: true,
      properties: {
        scope: 'base_attack',
      },
    })
    expect(patronPerks.tiers).toEqual([
      {
        id: '1',
        patronId: '1',
        tierId: '1',
        requiredPurchasedPerkCount: null,
        requirements: [],
      },
      {
        id: '2',
        patronId: '1',
        tierId: '2',
        requiredPurchasedPerkCount: 15,
        requirements: [
          {
            condition: 'patron_perks_purchased',
            patron_id: 1,
            amount: 15,
          },
        ],
      },
    ])
    expect(patronPerks.perks[1]).toEqual({
      id: '4',
      patronId: '1',
      tierId: '2',
      name: {
        original: 'Perk Up!',
        display: '活跃起来！',
      },
      graphicId: '4421',
      typeId: 2,
      levels: 20,
      cost: {
        baseCost: 12500,
        scaling: 1.05,
      },
      effects: [
        {
          effectString: 'effect_def,453',
          key: 'effect_def',
          args: ['453'],
          perLevel: 2.5,
          targetName: 'all Champions',
          effectDefinitionId: '453',
        },
      ],
      effectDefinitionIds: ['453'],
      properties: [],
    })
    expect(trials.roles[0]).toEqual({
      id: '1',
      name: {
        original: 'Forest - Balance the Forest',
        display: '森林--森林重归平衡',
      },
      description: {
        original: 'Liberate the forest near the Sunset Mountains.',
        display: '解救落日山脉附近的森林。',
      },
      graphicId: '11042',
      adventureId: '100',
      scenarioKind: 'adventure',
      ruleContextId: 'adventure:100',
      adventure: {
        id: '100',
        name: {
          original: 'The Test Adventure',
          display: '测试冒险',
        },
        campaign: {
          id: '1',
          original: 'A Grand Tour of the Sword Coast',
          display: '剑湾之旅',
        },
        objectiveArea: 50,
        locationId: '8',
        areaSetId: '55',
      },
      position: {
        x: 356,
        y: 518,
      },
    })
    expect(trials.difficulties[1]).toEqual({
      id: '2',
      name: {
        original: 'Heroic',
        display: '英勇',
      },
      shortName: 'H',
      description: null,
      graphicId: '11015',
      points: 1867,
      tiamatHealth: 750000000,
      costs: [
        {
          costType: 'trials_difficulty_token',
          difficultyTokenId: 'normal',
          amount: 1,
        },
        {
          costType: 'trials_difficulty_token',
          difficultyTokenId: 'any',
          amount: 1,
        },
      ],
      rewardData: [
        {
          deprecated: 'do not use',
        },
      ],
    })

    expect(variants.items[0]?.name).toEqual({
      original: 'A Test Variant',
      display: '测试变体',
    })
    expect(variants.items[0]?.ruleContextId).toBe('variant:101')
    expect(variants.items[0]?.scenarioKind).toBe('variant')
    expect(variants.items[0]?.modeTags).toEqual(['variant', 'patron'])
    expect(variants.items[0]?.patronObjectiveTiers).toEqual([
      {
        patronId: '2',
        tierId: '1',
        objectiveArea: 275,
        objectives: [
          {
            condition: 'complete_area',
            area: '275',
          },
        ],
      },
    ])
    expect(variants.items[0]?.campaign).toEqual({
      id: '1',
      original: 'A Grand Tour of the Sword Coast',
      display: '剑湾之旅',
    })
    expect(variants.items[0]?.adventure).toEqual({
      original: 'The Test Adventure',
      display: '测试冒险',
    })
    expect(variants.items[0]?.adventureId).toBe('100')
    expect(variants.items[0]?.objectiveArea).toBe(75)
    expect(variants.items[0]?.locationId).toBe('8')
    expect(variants.items[0]?.areaSetId).toBe('55')
    expect(variants.items[0]?.scene).toEqual({
      id: '1:8',
      original: 'The Test Adventure',
      display: '测试冒险',
    })
    expect(variants.items[0]?.restrictions).toEqual([
      {
        original: 'Only champions with 14+ CON',
        display: '只能使用体质 14+ 的勇士',
      },
    ])
    expect(variants.items[0]?.enemyCount).toBe(3)
    // 'boss' 保留在 enemyTypes：vulnerability 效果以 boss 为目标，词表须对齐。
    expect(variants.items[0]?.enemyTypes).toEqual(['humanoid', 'bandit', 'boss', 'undead'])
    expect(variants.items[0]?.enemyTypeCounts).toEqual({
      humanoid: 2,
      bandit: 1,
      boss: 1,
      undead: 1,
    })
    expect(variants.items[0]?.attackMix).toEqual({
      melee: 2,
      ranged: 1,
      magic: 0,
      other: 0,
    })
    expect(variants.items[0]?.specialEnemyCount).toBe(3)
    expect(variants.items[0]?.escortCount).toBe(2)
    expect(variants.items[0]?.areaMilestones).toEqual([1, 51, 75])
    expect(variants.items[0]?.areaHighlights).toEqual([
      {
        id: 'slot_escort_by_area:1:open:loop:repeat',
        kind: 'slot_escort_by_area',
        start: 1,
        end: null,
        loopAt: null,
        repeatAt: null,
      },
      {
        id: 'slot_escort_by_area:51:open:loop:repeat',
        kind: 'slot_escort_by_area',
        start: 51,
        end: null,
        loopAt: null,
        repeatAt: null,
      },
    ])
    expect(variants.items[0]?.mechanics).toEqual(['random_monster', 'slot_escort_by_area'])

    expect(enums.items[1]).toEqual({
      id: 'affiliations',
      values: [
        {
          original: 'Rivals of Waterdeep',
          display: '深水城宿敌',
        },
        {
          original: 'Companions of the Hall',
          display: '秘银五侠',
        },
      ],
    })
    expect(enums.items[2]).toEqual({
      id: 'campaigns',
      values: [
        {
          id: '1',
          original: 'A Grand Tour of the Sword Coast',
          display: '剑湾之旅',
        },
        {
          id: '2',
          original: 'Tomb of Annihilation',
          display: '湮灭之墓',
        },
      ],
    })
    expect(enums.items[3]).toEqual({
      id: 'patrons',
      values: [
        {
          id: '1',
          original: 'Mirt the Moneylender',
          display: '米尔特',
        },
        {
          id: '2',
          original: 'Vajra Safahr',
          display: '瓦吉拉',
        },
        {
          id: '5',
          original: 'Elminster',
          display: '艾尔明斯特',
        },
      ],
    })
    expect(enums.items[4]).toEqual({
      id: 'modes',
      values: ['adventure', 'free_play', 'patron', 'variant'],
    })

    expect(version.notes.some((note) => /language_id=7/.test(note))).toBeTruthy()
    expect(legendaryCatalog.items.find((item) => item.id === '501')?.heroIds).toEqual(['1'])
    expect(version.notes.some((note) => /effect-reference\.json/.test(note))).toBeTruthy()
  })

  it('normalizeEffectReference 在归一化层提取 CNE effect 对象串的 effect_string', () => {
    // CNE 数据源格式特性（见 AGENTS.md 1.3）：upgrade_defines.effect 有时是 JSON 对象串，
    // 序列化不稳定（合法 JSON 与 effect_string 行末缺逗号的伪 JSON 混存）。
    // 归一化层统一提取内部 effect_string，让下游消费方永远拿到干净的标准 effect 串。
    // 合法 JSON 形态
    expect(
      normalizeEffectReference('{"effect_string":"buff_upgrade,100,4","description":"x"}'),
    ).toBe('buff_upgrade,100,4')
    // 伪 JSON（effect_string 行末缺逗号）
    expect(
      normalizeEffectReference('{\n"effect_string":"buff_upgrades,100,4,5"\n"description":"missing comma"}'),
    ).toBe('buff_upgrades,100,4,5')
    // 简单 effect 串原样返回
    expect(normalizeEffectReference('hero_dps_multiplier_mult,100')).toBe('hero_dps_multiplier_mult,100')
    expect(normalizeEffectReference('effect_def,1308')).toBe('effect_def,1308')
    // 空/非串
    expect(normalizeEffectReference(null)).toBe(null)
    expect(normalizeEffectReference('   ')).toBe(null)
  })

  it('在 manualOverrides 文件损坏时抛错而非静默丢失', async () => {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), 'idle-champions-normalize-'))
    const malformedOverrides = path.join(tempDir, 'bad-overrides.json')
    await writeFile(malformedOverrides, '{ not valid json', 'utf8')

    await expect(
      normalizeDefinitionsSnapshot({
        input: path.resolve('scripts/fixtures/mock-definitions.json'),
        localizedInput: path.resolve('scripts/fixtures/mock-definitions-zh.json'),
        outputDir: path.join(tempDir, 'out'),
        versionFile: path.join(tempDir, 'version.json'),
        manualOverrides: malformedOverrides,
      }),
    ).rejects.toThrow()
  })

  it('在 manualOverrides 缺失时回退空默认', async () => {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), 'idle-champions-normalize-'))

    // 文件不存在应回退空默认，不抛错
    await expect(
      normalizeDefinitionsSnapshot({
        input: path.resolve('scripts/fixtures/mock-definitions.json'),
        localizedInput: path.resolve('scripts/fixtures/mock-definitions-zh.json'),
        outputDir: path.join(tempDir, 'out'),
        versionFile: path.join(tempDir, 'version.json'),
        manualOverrides: path.join(tempDir, 'does-not-exist.json'),
      }),
    ).resolves.toBeDefined()
  })
})
