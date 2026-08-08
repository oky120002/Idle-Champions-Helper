import { describe, expect, it } from 'vitest'
import { parseTagClause, parseTagExpression } from './normalize-adventures.ts'

describe('parseTagClause', () => {
  it('simple positive tag', () => {
    expect(parseTagClause('dwarf')).toEqual({ required: ['dwarf'], forbidden: [] })
  })

  it('negated tag', () => {
    expect(parseTagClause('!dps')).toEqual({ required: [], forbidden: ['dps'] })
  })

  it('AND of positive tags (^)', () => {
    expect(parseTagClause('lawful^good')).toEqual({ required: ['lawful', 'good'], forbidden: [] })
  })

  it('AND of negated tags', () => {
    expect(parseTagClause('!small^!dwarf^!gnome')).toEqual({
      required: [],
      forbidden: ['small', 'dwarf', 'gnome'],
    })
  })

  it('mixed AND', () => {
    expect(parseTagClause('dragonborn^lawful')).toEqual({
      required: ['dragonborn', 'lawful'],
      forbidden: [],
    })
  })

  it('strips outer parentheses', () => {
    expect(parseTagClause('(chaotic^good)')).toEqual({
      required: ['chaotic', 'good'],
      forbidden: [],
    })
  })

  it('lowercases tags', () => {
    expect(parseTagClause('Dwarf')).toEqual({ required: ['dwarf'], forbidden: [] })
  })

  it('returns null for malformed unbalanced parens', () => {
    expect(parseTagClause('((geneutral')).toBeNull()
    expect(parseTagClause('evil)^dps)')).toBeNull()
  })

  it('returns null for empty', () => {
    expect(parseTagClause('')).toBeNull()
    expect(parseTagClause('  ')).toBeNull()
  })
})

describe('parseTagExpression', () => {
  it('simple OR (| split)', () => {
    expect(parseTagExpression('dwarf|gnome|halfling')).toEqual([
      { required: ['dwarf'], forbidden: [] },
      { required: ['gnome'], forbidden: [] },
      { required: ['halfling'], forbidden: [] },
    ])
  })

  it('single AND clause', () => {
    expect(parseTagExpression('lawful^good')).toEqual([
      { required: ['lawful', 'good'], forbidden: [] },
    ])
  })

  it('OR of AND clauses', () => {
    expect(parseTagExpression('(chaotic^good)|(chaotic^neutral)|(neutral^good)')).toEqual([
      { required: ['chaotic', 'good'], forbidden: [] },
      { required: ['chaotic', 'neutral'], forbidden: [] },
      { required: ['neutral', 'good'], forbidden: [] },
    ])
  })

  it('OR of forbidden clause and positive tag', () => {
    expect(parseTagExpression('(!good^!evil^!chaotic^!lawful)|dragonborn')).toEqual([
      { required: [], forbidden: ['good', 'evil', 'chaotic', 'lawful'] },
      { required: ['dragonborn'], forbidden: [] },
    ])
  })

  it('all negated AND', () => {
    expect(parseTagExpression('!small^!dwarf^!gnome^!halfling^!kobold^!goblin')).toEqual([
      { required: [], forbidden: ['small', 'dwarf', 'gnome', 'halfling', 'kobold', 'goblin'] },
    ])
  })

  it('single negated tag', () => {
    expect(parseTagExpression('!good')).toEqual([
      { required: [], forbidden: ['good'] },
    ])
  })

  it('skips malformed clauses (v970 data quality issue)', () => {
    // v970 raw was `((geneutral|evil)^dps)|(good^support)` — | split inside parens produced:
    const result = parseTagExpression('((geneutral|evil)^dps)|(good^support)')
    // Only the valid clause survives; malformed `((geneutral` and `evil)^dps)` are dropped
    expect(result).toContainEqual({ required: ['good', 'support'], forbidden: [] })
  })

  it('empty string produces empty expression', () => {
    expect(parseTagExpression('')).toEqual([])
  })
})
