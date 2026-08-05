import { it, expect } from 'vitest'
import {
  toText,
  compareLocalizedText,
  normalizeLocalizedText,
  uniqueLocalizedTexts,
  toLocalizedOverrideList,
  uniqueStrings,
  uniqueNumbers,
  normalizeNumberList,
  toStringList,
  toTextList,
  normalizeJsonValue,
  normalizeNumber,
} from './normalize-text-utils.ts'

it('toText 字符串去空白，空串返回 null', () => {
  expect(toText('  x  ')).toBe('x')
  expect(toText('   ')).toBe(null)
  expect(toText('')).toBe(null)
})

it('toText 有限数转字符串，NaN/Infinity 返回 null（修复 normalize 缺 Number.isFinite 的缺陷）', () => {
  expect(toText(0)).toBe('0')
  expect(toText(42)).toBe('42')
  expect(toText(NaN)).toBe(null)
  expect(toText(Infinity)).toBe(null)
  expect(toText(-Infinity)).toBe(null)
  expect(toText(null)).toBe(null)
  expect(toText(undefined)).toBe(null)
  expect(toText({ x: 1 })).toBe(null)
})

it('compareLocalizedText 显式 en locale 确定性排序', () => {
  const items = [
    { original: 'b', display: '香蕉' },
    { original: 'a', display: '苹果' },
  ]
  const sorted = [...items].sort(compareLocalizedText)
  // display '苹果' 的码点 < '香蕉'（en collation 退化为码点序），应排前
  expect(sorted[0]?.display).toBe('苹果')
  // 相同输入两次排序结果一致（可复现）
  expect([...items].sort(compareLocalizedText)).toEqual(sorted)
})

it('normalizeLocalizedText 缺失返回 null，否则 {original, display}', () => {
  expect(normalizeLocalizedText(null, null)).toBe(null)
  expect(normalizeLocalizedText('Bruenor', '布鲁诺')).toEqual({ original: 'Bruenor', display: '布鲁诺' })
  expect(normalizeLocalizedText(null, '布鲁诺', 'fb')).toEqual({ original: '布鲁诺', display: '布鲁诺' })
})

it('uniqueLocalizedTexts 用 NUL 分隔防碰撞（空格会误判 ("a b","c") 与 ("a","b c") 重复）', () => {
  const result = uniqueLocalizedTexts([
    { original: 'a b', display: 'c' },
    { original: 'a', display: 'b c' },
  ])
  expect(result.length).toBe(2)
  // 真重复只去重一份
  expect(
    uniqueLocalizedTexts([
      { original: 'x', display: 'y' },
      { original: 'x', display: 'y' },
    ]).length,
  ).toBe(1)
})

it('uniqueLocalizedTexts 跳过缺失字段', () => {
  expect(uniqueLocalizedTexts([{ original: '', display: 'x' }, null]).length).toBe(0)
})

it('toLocalizedOverrideList 递归展平字符串/对象', () => {
  expect(toLocalizedOverrideList('a')).toEqual([{ original: 'a', display: 'a' }])
  expect(toLocalizedOverrideList([{ original: 'a', display: 'b' }])).toEqual([{ original: 'a', display: 'b' }])
  expect(toLocalizedOverrideList([['x'], 'y'])).toEqual([
    { original: 'x', display: 'x' },
    { original: 'y', display: 'y' },
  ])
})

it('uniqueStrings 过滤非字符串与空白', () => expect(uniqueStrings(['a', '', 'b', null, 'a'])).toEqual(['a', 'b']))

it('uniqueNumbers 过滤负数、NaN、非数并排序', () => {
  expect(uniqueNumbers([3, 1, 2, -1, NaN, 'x', 2])).toEqual([1, 2, 3])
  expect(uniqueNumbers([0, 0])).toEqual([0])
})

it('normalizeNumberList 仅保留非负有限数', () => {
  expect(normalizeNumberList([1, -2, '3', 'NaN'])).toEqual([1, 3])
  expect(normalizeNumberList('notarray')).toEqual([])
})

it('toStringList 支持逗号/竖线分隔与数组展开', () => {
  expect(toStringList('a, b ,c')).toEqual(['a', 'b', 'c'])
  expect(toStringList('a|b')).toEqual(['a', 'b'])
  expect(toStringList(['x', 'y'])).toEqual(['x', 'y'])
  expect(toStringList(5)).toEqual(['5'])
  expect(toStringList('  ')).toEqual([])
})

it('toTextList 不做分隔拆分，只按元素', () => {
  expect(toTextList('a,b')).toEqual(['a,b'])
  expect(toTextList(['x', '  '])).toEqual(['x'])
  expect(toTextList(5)).toEqual(['5'])
})

it('normalizeJsonValue 递归归一化，undefined→null', () => {
  expect(normalizeJsonValue(undefined)).toBe(null)
  expect(normalizeJsonValue(null)).toBe(null)
  expect(normalizeJsonValue({ a: undefined, b: [1, undefined] })).toEqual({ a: null, b: [1, null] })
  expect(normalizeJsonValue([1, 'x', true])).toEqual([1, 'x', true])
})

it('normalizeNumber 字符串解析、非数返回 null', () => {
  expect(normalizeNumber(42)).toBe(42)
  expect(normalizeNumber('3.5')).toBe(3.5)
  expect(normalizeNumber(NaN)).toBe(null)
  expect(normalizeNumber('abc')).toBe(null)
  expect(normalizeNumber(null)).toBe(null)
})
