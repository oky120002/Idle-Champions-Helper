import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  toText,
  compareLocalizedText,
  normalizeLocalizedText,
  normalizeLocalizedTextList,
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

test('toText 字符串去空白，空串返回 null', () => {
  assert.equal(toText('  x  '), 'x')
  assert.equal(toText('   '), null)
  assert.equal(toText(''), null)
})

test('toText 有限数转字符串，NaN/Infinity 返回 null（修复 normalize 缺 Number.isFinite 的缺陷）', () => {
  assert.equal(toText(0), '0')
  assert.equal(toText(42), '42')
  assert.equal(toText(NaN), null)
  assert.equal(toText(Infinity), null)
  assert.equal(toText(-Infinity), null)
  assert.equal(toText(null), null)
  assert.equal(toText(undefined), null)
  assert.equal(toText({ x: 1 }), null)
})

test('compareLocalizedText 显式 en locale 确定性排序', () => {
  const items = [
    { original: 'b', display: '香蕉' },
    { original: 'a', display: '苹果' },
  ]
  const sorted = [...items].sort(compareLocalizedText)
  // display '苹果' 的码点 < '香蕉'（en collation 退化为码点序），应排前
  assert.equal(sorted[0].display, '苹果')
  // 相同输入两次排序结果一致（可复现）
  assert.deepEqual([...items].sort(compareLocalizedText), sorted)
})

test('normalizeLocalizedText 缺失返回 null，否则 {original, display}', () => {
  assert.equal(normalizeLocalizedText(null, null), null)
  assert.deepEqual(normalizeLocalizedText('Bruenor', '布鲁诺'), { original: 'Bruenor', display: '布鲁诺' })
  assert.deepEqual(normalizeLocalizedText(null, '布鲁诺', 'fb'), { original: '布鲁诺', display: '布鲁诺' })
})

test('uniqueLocalizedTexts 用 NUL 分隔防碰撞（空格会误判 ("a b","c") 与 ("a","b c") 重复）', () => {
  const result = uniqueLocalizedTexts([
    { original: 'a b', display: 'c' },
    { original: 'a', display: 'b c' },
  ])
  assert.equal(result.length, 2)
  // 真重复只去重一份
  assert.equal(uniqueLocalizedTexts([
    { original: 'x', display: 'y' },
    { original: 'x', display: 'y' },
  ]).length, 1)
})

test('uniqueLocalizedTexts 跳过缺失字段', () => {
  assert.equal(uniqueLocalizedTexts([{ original: '', display: 'x' }, null]).length, 0)
})

test('toLocalizedOverrideList 递归展平字符串/对象', () => {
  assert.deepEqual(toLocalizedOverrideList('a'), [{ original: 'a', display: 'a' }])
  assert.deepEqual(toLocalizedOverrideList([{ original: 'a', display: 'b' }]), [{ original: 'a', display: 'b' }])
  assert.deepEqual(toLocalizedOverrideList([['x'], 'y']), [{ original: 'x', display: 'x' }, { original: 'y', display: 'y' }])
})

test('uniqueStrings 过滤非字符串与空白', () => {
  assert.deepEqual(uniqueStrings(['a', '', 'b', null, 'a']), ['a', 'b'])
})

test('uniqueNumbers 过滤负数、NaN、非数并排序', () => {
  assert.deepEqual(uniqueNumbers([3, 1, 2, -1, NaN, 'x', 2]), [1, 2, 3])
  assert.deepEqual(uniqueNumbers([0, 0]), [0])
})

test('normalizeNumberList 仅保留非负有限数', () => {
  assert.deepEqual(normalizeNumberList([1, -2, '3', 'NaN']), [1, 3])
  assert.deepEqual(normalizeNumberList('notarray'), [])
})

test('toStringList 支持逗号/竖线分隔与数组展开', () => {
  assert.deepEqual(toStringList('a, b ,c'), ['a', 'b', 'c'])
  assert.deepEqual(toStringList('a|b'), ['a', 'b'])
  assert.deepEqual(toStringList(['x', 'y']), ['x', 'y'])
  assert.deepEqual(toStringList(5), ['5'])
  assert.deepEqual(toStringList('  '), [])
})

test('toTextList 不做分隔拆分，只按元素', () => {
  assert.deepEqual(toTextList('a,b'), ['a,b'])
  assert.deepEqual(toTextList(['x', '  ']), ['x'])
  assert.deepEqual(toTextList(5), ['5'])
})

test('normalizeJsonValue 递归归一化，undefined→null', () => {
  assert.equal(normalizeJsonValue(undefined), null)
  assert.equal(normalizeJsonValue(null), null)
  assert.deepEqual(normalizeJsonValue({ a: undefined, b: [1, undefined] }), { a: null, b: [1, null] })
  assert.deepEqual(normalizeJsonValue([1, 'x', true]), [1, 'x', true])
})

test('normalizeNumber 字符串解析、非数返回 null', () => {
  assert.equal(normalizeNumber(42), 42)
  assert.equal(normalizeNumber('3.5'), 3.5)
  assert.equal(normalizeNumber(NaN), null)
  assert.equal(normalizeNumber('abc'), null)
  assert.equal(normalizeNumber(null), null)
})
