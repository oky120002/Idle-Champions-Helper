import test from 'node:test'
import assert from 'node:assert/strict'
import os from 'node:os'
import path from 'node:path'
import { mkdtemp, mkdir, readFile, writeFile } from 'node:fs/promises'

import { buildSearchIndex, cleanText } from './build-search-index.ts'

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, 'utf8'))
}

test('cleanText 剥离全部占位符形态 + 数据 bug + 换行 markup，保留正文与 $# 字面量', () => {
  const cases = [
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
    assert.equal(cleanText(input), expected, `cleanText(${JSON.stringify(input)})`)
  }
})

test('buildSearchIndex 抽取全部文本桶并正确清洗/去重/排噪', async () => {
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
  const output = await readJson(path.join(versionDir, 'search', 'search-documents.json'))

  // 基本字段
  assert.equal(result.heroCount, 1)
  assert.equal(output.updatedAt, '2026-06-09')
  const doc = output.items[0]
  assert.equal(doc.championId, '1')
  assert.equal(doc.name.display, '布鲁诺')
  assert.equal(doc.seat, 1)
  assert.equal(doc.portrait.path, 'v1/champion-portraits/1.png')

  // title：英雄名（来自 champions.json）+ 全名
  assert.match(doc.title.en, /Bruenor/)
  assert.match(doc.title.en, /Bruenor Battlehammer/)
  assert.match(doc.title.zh, /布鲁诺/)
  assert.match(doc.title.zh, /布鲁诺·战锤/)

  // body：背景故事 + 技能 desc（已清洗占位符）+ 条件 desc + 传奇效果
  assert.match(doc.body.en, /Bruenor leads Clan Battlehammer/)
  assert.match(doc.body.en, /Increase damage of by % for each adjacent Champion/)
  assert.match(doc.body.en, /Only when is alive/) // $source 已剥
  assert.match(doc.body.en, /Increases damage of Dwarf Champions by %/) // legendaryEffects，$(amount) 已剥
  assert.match(doc.body.zh, /布鲁诺领导战锤氏族/)
  assert.match(doc.body.zh, /每与一名勇士同列，即提升 % 伤害/)
  assert.match(doc.body.zh, /仅当 存活时/)

  // meta：职业/种族/阵营/事件名/各名称 + tags/roles/affiliations（来自 champions.json）
  assert.match(doc.meta.en, /Fighter/)
  assert.match(doc.meta.en, /Dwarf/)
  assert.match(doc.meta.en, /Neutral Good/)
  assert.match(doc.meta.en, /Some Event/) // display:null 仍索引 original
  assert.match(doc.meta.en, /Slice/)
  assert.match(doc.meta.en, /dwarf/)
  assert.match(doc.meta.en, /support/)
  assert.match(doc.meta.en, /Companions of the Hall/)
  assert.match(doc.meta.zh, /战士/)
  assert.match(doc.meta.zh, /矮人/)
  assert.match(doc.meta.zh, /秘银五侠/)

  // 占位符清洗：全文档无残留 $-占位符
  const blob = JSON.stringify(doc)
  assert.equal(blob.includes('$target'), false)
  assert.equal(blob.includes('$amount'), false)
  assert.equal(blob.includes('$('), false)
  assert.equal(blob.includes('$source'), false)

  // raw 镜像已跳过
  assert.equal(blob.includes('RAW DUPLICATE'), false)
  assert.equal(blob.includes('RAW 不应出现'), false)

  // 代码型字符串已排除
  assert.equal(blob.includes('hero_dps_mult_per_target_crusader'), false)
  assert.equal(blob.includes('tag_dps,40'), false)

  // override_key_desc（body）与 stack_title（meta）这类信封容器内纯字符串已抓取
  assert.match(doc.body.en, /Adjacent buff/)
  assert.match(doc.body.zh, /相邻增益/)
  assert.match(doc.meta.en, /Total Adjacent Stacks/)
  assert.match(doc.meta.zh, /相邻总计/)
})
