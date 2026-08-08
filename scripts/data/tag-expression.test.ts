import { describe, expect, it } from 'vitest'
import { parseTagExpression } from './normalize-adventures.ts'

describe('parseTagExpression — flat tags', () => {
  it('simple positive tag', () => {
    expect(parseTagExpression('dwarf')).toEqual([
      { required: ['dwarf'], forbidden: [] },
    ])
  })

  it('lowercases tags', () => {
    expect(parseTagExpression('Dwarf')).toEqual([
      { required: ['dwarf'], forbidden: [] },
    ])
  })

  it('single negated tag', () => {
    expect(parseTagExpression('!good')).toEqual([
      { required: [], forbidden: ['good'] },
    ])
  })

  it('AND of positive tags (^)', () => {
    expect(parseTagExpression('lawful^good')).toEqual([
      { required: ['lawful', 'good'], forbidden: [] },
    ])
  })

  it('AND of negated tags', () => {
    expect(parseTagExpression('!small^!dwarf^!gnome')).toEqual([
      { required: [], forbidden: ['small', 'dwarf', 'gnome'] },
    ])
  })

  it('mixed AND', () => {
    expect(parseTagExpression('dragonborn^lawful')).toEqual([
      { required: ['dragonborn', 'lawful'], forbidden: [] },
    ])
  })
})

describe('parseTagExpression — OR', () => {
  it('simple OR (| split)', () => {
    expect(parseTagExpression('dwarf|gnome|halfling')).toEqual([
      { required: ['dwarf'], forbidden: [] },
      { required: ['gnome'], forbidden: [] },
      { required: ['halfling'], forbidden: [] },
    ])
  })

  it('OR of AND clauses (each parenthesized)', () => {
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
})

describe('parseTagExpression — nested parentheses (distribution)', () => {
  it('v970: ((geneutral|evil)^dps)|(good^support) → 3 DNF clauses', () => {
    // restriction 原文："only Neutral on good/evil axis and Evil Champions that have the DPS role,
    // and you can only use Good Champions that have the Support role"
    // = (geneutral AND dps) OR (evil AND dps) OR (good AND support)
    expect(parseTagExpression('((geneutral|evil)^dps)|(good^support)')).toEqual([
      { required: ['geneutral', 'dps'], forbidden: [] },
      { required: ['evil', 'dps'], forbidden: [] },
      { required: ['good', 'support'], forbidden: [] },
    ])
  })

  it('parenthesized OR distributed over outer AND', () => {
    expect(parseTagExpression('(a|b)^c')).toEqual([
      { required: ['a', 'c'], forbidden: [] },
      { required: ['b', 'c'], forbidden: [] },
    ])
  })
})

describe('parseTagExpression — edge cases', () => {
  it('empty string produces empty expression', () => {
    expect(parseTagExpression('')).toEqual([])
  })

  it('whitespace-only produces empty expression', () => {
    expect(parseTagExpression('   ')).toEqual([])
  })

  it('unbalanced parens → skip malformed part', () => {
    expect(parseTagExpression('((geneutral')).toEqual([])
    expect(parseTagExpression('evil)^dps)')).toEqual([])
  })

  it('unbalanced parens in one clause keeps valid clauses', () => {
    expect(parseTagExpression('good|((evil')).toEqual([
      { required: ['good'], forbidden: [] },
    ])
  })
})

describe('parseTagExpression — compound alignment tags', () => {
  it('lawful_good expands to lawful^good', () => {
    expect(parseTagExpression('lawful_good')).toEqual([
      { required: ['lawful', 'good'], forbidden: [] },
    ])
  })

  it('v1740 four corner alignments expand correctly', () => {
    expect(parseTagExpression('lawful_good|chaotic_good|lawful_evil|chaotic_evil')).toEqual([
      { required: ['lawful', 'good'], forbidden: [] },
      { required: ['chaotic', 'good'], forbidden: [] },
      { required: ['lawful', 'evil'], forbidden: [] },
      { required: ['chaotic', 'evil'], forbidden: [] },
    ])
  })

  it('neutral_good expands to lcneutral^good', () => {
    expect(parseTagExpression('neutral_good')).toEqual([
      { required: ['lcneutral', 'good'], forbidden: [] },
    ])
  })

  it('neutral_neutral (true neutral) expands to lcneutral^geneutral', () => {
    expect(parseTagExpression('neutral_neutral')).toEqual([
      { required: ['lcneutral', 'geneutral'], forbidden: [] },
    ])
  })

  it('compound alignment in AND context distributes correctly', () => {
    expect(parseTagExpression('lawful_good^dps')).toEqual([
      { required: ['lawful', 'good', 'dps'], forbidden: [] },
    ])
  })
})
