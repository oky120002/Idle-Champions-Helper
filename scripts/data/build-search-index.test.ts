import os from 'node:os'
import path from 'node:path'
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises'
import { it, expect } from 'vitest'
import { readJson } from './io-utils.ts'

import { buildSearchIndex, cleanText } from './build-search-index.ts'

it('cleanText 剥离全部占位符形态 + 数据 bug + 换行 markup，保留正文与 $# 字面量', () => {
  const cases: Array<[string, string]> = [
    ['Increase the damage of $target by $amount% for each adjacent Champion', 'Increase the damage of by % for each adjacent Champion'],
    ['$target每与一名勇士同列，即提升 $amount% 伤害', '每与一名勇士同列，即提升 % 伤害'],
    ['Dwarf Champions by $(amount)%', 'Dwarf Champions by %'],
    ['$(upgrade_name 2037) gains a buff', 'gains a buff'],
    ['$(if feat_assigned 2237)是$(else)否$(fi)', '是 否'],
    ['获得 $（奖金） 加成', '获得 加成'],
    ['达到 $阈值% 时', '达到 % 时'],
    ['增益 $% 与 $10%', '增益 与'], // 数据 bug：$10% 的 % 紧跟数字，被 [$%0-9]+ 一并剥除
    ['第一行^^第二行', '第一行 第二行'],
    ['%$#& yes!', '%$#& yes!'],
  ]
  for (const [input, expected] of cases) {
    expect(cleanText(input)).toBe(expected)
  }
})

interface SearchDocumentOutput {
  championId: string
  name: { display: string }
  seat: unknown
  portrait: { path: string }
  title: { en: string; zh: string }
  body: { en: string; zh: string }
  meta: { en: string; zh: string }
}

interface SearchIndexOutput {
  updatedAt: string
  items: SearchDocumentOutput[]
}

it('buildSearchIndex 抽取全部文本桶并正确清洗/去重/排噪', async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'idle-champions-search-index-'))
  const versionDir = path.join(tempDir, 'data')
  const detailDir = path.join(versionDir, 'champion-details')

  await mkdir(detailDir, { recursive: true })

  await writeFile(
    path.join(versionDir, 'champions.json'),
    JSON.stringify({
      updatedAt: '2026-06-09',
      items: [
        {
          id: '1',
          name: { original: 'Bruenor', display: '布鲁诺' },
          seat: 1,
          roles: ['support'],
          affiliations: [{ original: 'Companions of the Hall', display: '秘银五侠' }],
          tags: ['dwarf', 'fighter'],
          patronEligibility: { eligiblePatronIds: ['1', '2'] },
          portrait: { path: 'v1/champion-portraits/1.png', sourceGraphic: 'Portraits/Portrait_Bruenor', sourceVersion: 7 },
        },
      ],
    }),
  )

  await writeFile(
    path.join(detailDir, '1.json'),
    JSON.stringify({
      // summary 镜像 champions.json，应整体跳过
      summary: {
        id: '1',
        name: { original: 'Bruenor', display: '布鲁诺' },
        seat: 1,
        roles: ['support'],
        affiliations: [{ original: 'Companions of the Hall', display: '秘银五侠' }],
        tags: ['dwarf', 'fighter'],
        patronEligibility: { eligiblePatronIds: ['1'] },
        portrait: { path: 'v1/champion-portraits/1.png' },
      },
      englishName: 'Bruenor', // langCtx 为 null 的纯字符串，不索引
      eventName: { original: 'Some Event', display: null }, // display 缺省，仍应索引 original
      characterSheet: {
        fullName: { original: 'Bruenor Battlehammer', display: '布鲁诺·战锤' },
        class: { original: 'Fighter', display: '战士' },
        race: { original: 'Dwarf', display: '矮人' },
        alignment: { original: 'Neutral Good', display: '中立善良' },
        backstory: {
          original: 'Bruenor leads Clan Battlehammer.',
          display: '布鲁诺领导战锤氏族。',
        },
      },
      attacks: {
        base: {
          name: { original: 'Slice', display: '劈砍' },
          description: { original: 'Slashes the closest enemy.', display: '劈砍最近的敌人。' },
          longDescription: null,
          damageTypes: ['melee'], // 关键字数组但 langCtx=null，不索引
        },
        ultimate: {
          name: { original: 'Bash', display: '猛击' },
          description: { original: 'Devastating blow.', display: '毁灭一击。' },
          longDescription: { original: 'Uses shield and axe.', display: '用盾牌和斧头。' },
        },
      },
      upgrades: [
        {
          name: { original: 'Inspired', display: '鼓舞' },
          tipText: { original: 'Place him adjacent.', display: '放置在相邻位置。' },
          specializationName: { original: 'Pick A', display: '选项甲' },
          specializationDescription: { original: 'Readies shield.', display: '准备盾牌。' },
          effectDefinition: {
            snapshots: {
              original: {
                flavour_text: '',
                description: {
                  desc: 'Increase damage of $target by $amount% for each adjacent Champion',
                  pre: 'Before applying',
                  post: { conditions: [{ desc: 'Only when $source is alive' }] },
                },
                effect_keys: [
                  {
                    effect_string: 'hero_dps_mult_per_target_crusader,100,adj',
                    override_key_desc: 'Adjacent buff',
                    stack_title: 'Total Adjacent Stacks',
                  },
                ],
              },
              display: {
                flavour_text: '',
                description: {
                  desc: '$target每与一名勇士同列，即提升 $amount% 伤害',
                  pre: '应用前',
                  post: { conditions: [{ desc: '仅当 $source 存活时' }] },
                },
                effect_keys: [
                  {
                    effect_string: 'hero_dps_mult_per_target_crusader,100,adj',
                    override_key_desc: '相邻增益',
                    stack_title: '相邻总计',
                  },
                ],
              },
            },
          },
        },
      ],
      feats: [
        { name: { original: 'Feat One', display: '专长一' }, description: { original: 'Grants bonus.', display: '提供加成。' } },
      ],
      loot: [
        { name: { original: 'Axe', display: '斧头' }, description: { original: 'A trusty axe.', display: '一把可靠的斧头。' } },
      ],
      skins: [{ name: { original: 'Skin A', display: '皮肤甲' } }],
      legendaryEffects: [
        { effects: [{ effect_string: 'tag_dps,40', description: 'Increases damage of Dwarf Champions by $(amount)%' }] },
      ],
      raw: {
        hero: {
          original: { character_sheet_details: { backstory: { original: 'RAW DUPLICATE', display: 'RAW 不应出现' } } },
        },
      },
    }),
  )

  const result = await buildSearchIndex({ versionDir })
  const output = (await readJson(path.join(versionDir, 'search', 'search-documents.json'))) as SearchIndexOutput

  // 基本字段
  expect(result.heroCount).toBe(1)
  expect(output.updatedAt).toBe('2026-06-09')
  const doc = output.items[0]
  if (!doc) throw new Error('expected doc')
  expect(doc.championId).toBe('1')
  expect(doc.name.display).toBe('布鲁诺')
  expect(doc.seat).toBe(1)
  expect(doc.portrait.path).toBe('v1/champion-portraits/1.png')

  // title：英雄名（来自 champions.json）+ 全名
  expect(doc.title.en).toMatch(/Bruenor/)
  expect(doc.title.en).toMatch(/Bruenor Battlehammer/)
  expect(doc.title.zh).toMatch(/布鲁诺/)
  expect(doc.title.zh).toMatch(/布鲁诺·战锤/)

  // body：背景故事 + 技能 desc（已清洗占位符）+ 条件 desc + 传奇效果
  expect(doc.body.en).toMatch(/Bruenor leads Clan Battlehammer/)
  expect(doc.body.en).toMatch(/Increase damage of by % for each adjacent Champion/)
  expect(doc.body.en).toMatch(/Only when is alive/) // $source 已剥
  expect(doc.body.en).toMatch(/Increases damage of Dwarf Champions by %/) // legendaryEffects，$(amount) 已剥
  expect(doc.body.zh).toMatch(/布鲁诺领导战锤氏族/)
  expect(doc.body.zh).toMatch(/每与一名勇士同列，即提升 % 伤害/)
  expect(doc.body.zh).toMatch(/仅当 存活时/)

  // meta：职业/种族/阵营/事件名/各名称 + tags/roles/affiliations（来自 champions.json）
  expect(doc.meta.en).toMatch(/Fighter/)
  expect(doc.meta.en).toMatch(/Dwarf/)
  expect(doc.meta.en).toMatch(/Neutral Good/)
  expect(doc.meta.en).toMatch(/Some Event/) // display:null 仍索引 original
  expect(doc.meta.en).toMatch(/Slice/)
  expect(doc.meta.en).toMatch(/dwarf/)
  expect(doc.meta.en).toMatch(/support/)
  expect(doc.meta.en).toMatch(/Companions of the Hall/)
  expect(doc.meta.zh).toMatch(/战士/)
  expect(doc.meta.zh).toMatch(/矮人/)
  expect(doc.meta.zh).toMatch(/秘银五侠/)

  // 占位符清洗：全文档无残留 $-占位符
  const blob = JSON.stringify(doc)
  expect(blob.includes('$target')).toBe(false)
  expect(blob.includes('$amount')).toBe(false)
  expect(blob.includes('$(')).toBe(false)
  expect(blob.includes('$source')).toBe(false)

  // raw 镜像已跳过
  expect(blob.includes('RAW DUPLICATE')).toBe(false)
  expect(blob.includes('RAW 不应出现')).toBe(false)

  // 代码型字符串已排除
  expect(blob.includes('hero_dps_mult_per_target_crusader')).toBe(false)
  expect(blob.includes('tag_dps,40')).toBe(false)

  // override_key_desc（body）与 stack_title（meta）这类信封容器内纯字符串已抓取
  expect(doc.body.en).toMatch(/Adjacent buff/)
  expect(doc.body.zh).toMatch(/相邻增益/)
  expect(doc.meta.en).toMatch(/Total Adjacent Stacks/)
  expect(doc.meta.zh).toMatch(/相邻总计/)
})
