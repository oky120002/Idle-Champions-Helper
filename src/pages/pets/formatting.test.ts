import { describe, expect, it } from 'vitest'

import type { Pet, PetAcquisition } from '../../domain/types'
import {
  buildAcquisitionDetail,
  buildAcquisitionLabel,
  buildAcquisitionNotes,
  buildIconAlt,
  buildIllustrationAlt,
  buildStatusLabel,
} from './formatting'

function buildAcquisition(overrides: Partial<PetAcquisition> & { kind: PetAcquisition['kind'] }): PetAcquisition {
  return {
    sourceType: null,
    gemCost: null,
    premiumPackName: null,
    premiumPackDescription: null,
    patronName: null,
    patronCurrency: null,
    patronCost: null,
    patronInfluence: null,
    ...overrides,
  }
}

function buildPet(acquisition: PetAcquisition, overrides: Partial<Pet> = {}): Pet {
  return {
    id: 'pet-1',
    name: { original: 'Test Pet', display: '测试宠物' },
    description: null,
    isAvailable: true,
    iconGraphicId: null,
    illustrationGraphicId: null,
    acquisition,
    icon: null,
    illustration: null,
    ...overrides,
  }
}

describe('buildIllustrationAlt', () => {
  it('zh-CN 用 display 名 + 立绘', () => {
    expect(buildIllustrationAlt(buildPet(buildAcquisition({ kind: 'gems' })), 'zh-CN')).toBe('测试宠物立绘')
  })
  it('en 用 original 名 + illustration', () => {
    expect(buildIllustrationAlt(buildPet(buildAcquisition({ kind: 'gems' })), 'en-US')).toBe('Test Pet illustration')
  })
})

describe('buildIconAlt', () => {
  it('zh-CN 用 display 名 + 图标', () => {
    expect(buildIconAlt(buildPet(buildAcquisition({ kind: 'gems' })), 'zh-CN')).toBe('测试宠物图标')
  })
  it('en 用 original 名 + icon', () => {
    expect(buildIconAlt(buildPet(buildAcquisition({ kind: 'gems' })), 'en-US')).toBe('Test Pet icon')
  })
})

describe('buildAcquisitionLabel', () => {
  it.each<[PetAcquisition['kind'], string, string]>([
    ['gems', '宝石商店', 'Gem shop'],
    ['patron', '赞助商商店', 'Patron shop'],
    ['not-yet-available', '暂未开放', 'Not yet available'],
    ['unknown', '来源待确认', 'Source unconfirmed'],
  ])('kind=%s 基础标签（zh/en）', (kind, zh, en) => {
    const a = buildAcquisition({ kind })
    expect(buildAcquisitionLabel(a, 'zh-CN')).toBe(zh)
    expect(buildAcquisitionLabel(a, 'en-US')).toBe(en)
  })

  it('premium sourceType=dlc 优先标 DLC（即使 packName 含 theme pack）', () => {
    const a = buildAcquisition({ kind: 'premium', sourceType: 'dlc', premiumPackName: { original: 'Theme Pack', display: '主题包' } })
    expect(buildAcquisitionLabel(a, 'zh-CN')).toBe('购买 · DLC')
    expect(buildAcquisitionLabel(a, 'en-US')).toBe('Purchase · DLC')
  })

  it('premium packName 含 theme pack 标主题包', () => {
    const a = buildAcquisition({ kind: 'premium', premiumPackName: { original: 'Theme Pack Heroes', display: '主题包英雄' } })
    expect(buildAcquisitionLabel(a, 'zh-CN')).toBe('购买 · 主题包')
    expect(buildAcquisitionLabel(a, 'en-US')).toBe('Purchase · Theme pack')
  })

  it('premium packName 含 familiar pack 标熟悉魔宠包', () => {
    const a = buildAcquisition({ kind: 'premium', premiumPackName: { original: 'Familiar Pack 1', display: '熟悉魔宠包' } })
    expect(buildAcquisitionLabel(a, 'zh-CN')).toBe('购买 · 熟悉魔宠包')
    expect(buildAcquisitionLabel(a, 'en-US')).toBe('Purchase · Familiar pack')
  })

  it('premium sourceType=flash_sale（packName 不含关键词）标限时闪促', () => {
    const a = buildAcquisition({ kind: 'premium', sourceType: 'flash_sale', premiumPackName: { original: 'Other', display: '其他' } })
    expect(buildAcquisitionLabel(a, 'zh-CN')).toBe('购买 · 限时闪促')
    expect(buildAcquisitionLabel(a, 'en-US')).toBe('Purchase · Flash sale')
  })

  it('premium 其他情况标付费包', () => {
    const a = buildAcquisition({ kind: 'premium', premiumPackName: { original: 'Other', display: '其他' } })
    expect(buildAcquisitionLabel(a, 'zh-CN')).toBe('购买 · 付费包')
    expect(buildAcquisitionLabel(a, 'en-US')).toBe('Purchase · Premium pack')
  })
})

describe('buildAcquisitionDetail', () => {
  it('gems 有 gemCost 返回宝石数量', () => {
    const a = buildAcquisition({ kind: 'gems', gemCost: 500 })
    expect(buildAcquisitionDetail(a, 'zh-CN')).toBe('500 宝石')
    expect(buildAcquisitionDetail(a, 'en-US')).toBe('500 gems')
  })

  it('gems 大额按 locale 千分位格式化', () => {
    const a = buildAcquisition({ kind: 'gems', gemCost: 1000000 })
    expect(buildAcquisitionDetail(a, 'zh-CN')).toBe('1,000,000 宝石')
    expect(buildAcquisitionDetail(a, 'en-US')).toBe('1,000,000 gems')
  })

  it('patron 有 name + cost 无 currency 时用默认货币名', () => {
    const a = buildAcquisition({ kind: 'patron', patronName: { original: 'Jim', display: '吉姆' }, patronCost: 100 })
    expect(buildAcquisitionDetail(a, 'zh-CN')).toBe('吉姆 · 100 赞助商货币')
    expect(buildAcquisitionDetail(a, 'en-US')).toBe('Jim · 100 patron currency')
  })

  it('patron 有 currency 时用 currency 名', () => {
    const a = buildAcquisition({
      kind: 'patron',
      patronName: { original: 'Jim', display: '吉姆' },
      patronCurrency: { original: 'Coins', display: '硬币' },
      patronCost: 100,
    })
    expect(buildAcquisitionDetail(a, 'zh-CN')).toBe('吉姆 · 100 硬币')
    expect(buildAcquisitionDetail(a, 'en-US')).toBe('Jim · 100 Coins')
  })

  it('premium 有 premiumPackName 返回包名（primary）', () => {
    const a = buildAcquisition({ kind: 'premium', premiumPackName: { original: 'Pack', display: '包' } })
    expect(buildAcquisitionDetail(a, 'zh-CN')).toBe('包')
    expect(buildAcquisitionDetail(a, 'en-US')).toBe('Pack')
  })

  it('not-yet-available 返回未开放说明', () => {
    const a = buildAcquisition({ kind: 'not-yet-available' })
    expect(buildAcquisitionDetail(a, 'zh-CN')).toContain('未开放')
    expect(buildAcquisitionDetail(a, 'en-US')).toContain('not yet available')
  })

  it('unknown 有 sourceType 返回 source 标记', () => {
    const a = buildAcquisition({ kind: 'unknown', sourceType: 'mystery' })
    expect(buildAcquisitionDetail(a, 'zh-CN')).toBe('source=mystery')
  })

  it('无匹配条件返回 null', () => {
    const a = buildAcquisition({ kind: 'unknown', sourceType: null })
    expect(buildAcquisitionDetail(a, 'zh-CN')).toBeNull()
  })
})

describe('buildAcquisitionNotes', () => {
  it('patron 有 patronInfluence 加影响力解锁说明', () => {
    const a = buildAcquisition({ kind: 'patron', patronInfluence: 50000 })
    expect(buildAcquisitionNotes(a, 'zh-CN').some((n) => n.includes('影响力解锁'))).toBe(true)
    expect(buildAcquisitionNotes(a, 'en-US').some((n) => n.includes('influence to unlock'))).toBe(true)
  })

  it('premium 有 premiumPackDescription 加描述（primary）', () => {
    const a = buildAcquisition({ kind: 'premium', premiumPackDescription: { original: 'Desc', display: '描述' } })
    expect(buildAcquisitionNotes(a, 'zh-CN').some((n) => n.includes('描述'))).toBe(true)
    expect(buildAcquisitionNotes(a, 'en-US').some((n) => n.includes('Desc'))).toBe(true)
  })

  it('gems sourceType=shop 加常驻宝石商店说明', () => {
    const a = buildAcquisition({ kind: 'gems', sourceType: 'shop' })
    expect(buildAcquisitionNotes(a, 'zh-CN').some((n) => n.includes('常驻宝石商店'))).toBe(true)
    expect(buildAcquisitionNotes(a, 'en-US').some((n) => n.includes('permanent gem-shop'))).toBe(true)
  })

  it('premium sourceType=dlc 加 DLC 映射说明', () => {
    const a = buildAcquisition({ kind: 'premium', sourceType: 'dlc', premiumPackName: { original: 'X', display: 'X' } })
    expect(buildAcquisitionNotes(a, 'zh-CN').some((n) => n.includes('DLC'))).toBe(true)
    expect(buildAcquisitionNotes(a, 'en-US').some((n) => n.includes('DLC or premium pack'))).toBe(true)
  })

  it('premium flash_sale 无 packName 加闪促未映射说明', () => {
    const a = buildAcquisition({ kind: 'premium', sourceType: 'flash_sale', premiumPackName: null })
    expect(buildAcquisitionNotes(a, 'zh-CN').some((n) => n.includes('flash_sale'))).toBe(true)
    expect(buildAcquisitionNotes(a, 'en-US').some((n) => n.includes('flash_sale'))).toBe(true)
  })

  it('unknown 无 sourceType 加无稳定来源说明', () => {
    const a = buildAcquisition({ kind: 'unknown', sourceType: null })
    expect(buildAcquisitionNotes(a, 'zh-CN').some((n) => n.includes('没有稳定来源标注'))).toBe(true)
    expect(buildAcquisitionNotes(a, 'en-US').some((n) => n.includes('stable source marker'))).toBe(true)
  })

  it('patron 有 sourceType 加来源标记（非 gems/premium 触发）', () => {
    const a = buildAcquisition({ kind: 'patron', sourceType: 'special' })
    expect(buildAcquisitionNotes(a, 'zh-CN').some((n) => n.includes('来源标记：special'))).toBe(true)
    expect(buildAcquisitionNotes(a, 'en-US').some((n) => n.includes('Source marker: special'))).toBe(true)
  })

  it('gems 无 sourceType 无任何附加说明（空数组）', () => {
    const a = buildAcquisition({ kind: 'gems', sourceType: null })
    expect(buildAcquisitionNotes(a, 'zh-CN')).toEqual([])
  })
})

describe('buildStatusLabel', () => {
  it('isAvailable=true 标已启用', () => {
    const pet = buildPet(buildAcquisition({ kind: 'gems' }), { isAvailable: true })
    expect(buildStatusLabel(pet, 'zh-CN')).toBe('definitions 已启用')
    expect(buildStatusLabel(pet, 'en-US')).toBe('Definitions enabled')
  })

  it('isAvailable=false 标未启用', () => {
    const pet = buildPet(buildAcquisition({ kind: 'gems' }), { isAvailable: false })
    expect(buildStatusLabel(pet, 'zh-CN')).toBe('definitions 未启用')
    expect(buildStatusLabel(pet, 'en-US')).toBe('Definitions disabled')
  })
})
