import { readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import { MESSAGES, translateRef, t } from './i18n-messages'

function productionSourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = resolve(directory, entry.name)
    if (entry.isDirectory()) return productionSourceFiles(path)
    if (!entry.isFile() || !/\.tsx?$/.test(entry.name) || /\.test\.tsx?$/.test(entry.name)) return []
    return [path]
  })
}

function placeholders(value: string): string[] {
  return [...value.matchAll(/\{(\w+)\}/g)]
    .map((match) => match[1] ?? '')
    .sort((left, right) => left.localeCompare(right))
}

describe('central i18n dictionary', () => {
  it('translates dictionary entries and interpolates parameters', () => {
    expect(t('en-US', '槽位 {p0}', { p0: 's1' })).toBe('Slot s1')
    expect(t('zh-CN', '槽位 {p0}', { p0: 's1' })).toBe('槽位 s1')
    expect(translateRef('en-US', { key: '当前场景含计时或点击限制，攻速与持续输出价值提升。' }))
      .toBe('This scenario has a timer or click-damage limit; attack speed and sustained damage are more valuable.')
    expect(translateRef('en-US', { literal: 'raw warning' })).toBe('raw warning')
    expect(
      translateRef('en-US', {
        key: '保存版本 {p0} 已不可读，当前按 {p1} 兼容恢复。{p2}',
        params: {
          p0: 'v0',
          p1: 'v1',
          p2: { key: '{p0} 个槽位引用已失效', params: { p0: 1 } },
        },
      }),
    ).toBe('Saved version v0 is unavailable; restored compatibly with v1. 1 slot references are invalid')
  })

  it('contains every literal translation key used by production source', () => {
    const sourceDirectory = resolve(fileURLToPath(new URL('../', import.meta.url)))
    const files = productionSourceFiles(sourceDirectory)
    const missing: string[] = []
    const callPattern = /\bt\(\s*(['"])(.*?)\1/g

    for (const file of files) {
      const source = readFileSync(file, 'utf8')
      for (const match of source.matchAll(callPattern)) {
        const key = match[2] ?? ''
        if (!(key in MESSAGES)) missing.push(`${file.slice(sourceDirectory.length + 1)}: ${key}`)
      }
    }

    expect(missing).toEqual([])
  })

  it('contains every static MessageRef key used by production source', () => {
    const sourceDirectory = resolve(fileURLToPath(new URL('../', import.meta.url)))
    const missing: string[] = []
    const keyPattern = /\bkey:\s*(?:"([^"]*)"|'([^']*)')/g

      for (const file of productionSourceFiles(sourceDirectory)) {
      if (file.endsWith('i18n-messages.ts')) continue
      const source = readFileSync(file, 'utf8')
      for (const match of source.matchAll(keyPattern)) {
        const key = match[1] ?? match[2] ?? ''
        if (!/[\u3400-\u9fff]/u.test(key) && key !== 'missing forced champion: {p0}') continue
        if (!(key in MESSAGES)) missing.push(`${file.slice(sourceDirectory.length + 1)}: ${key}`)
      }
    }

    expect(missing).toEqual([])
  })

  it('rejects legacy i18n types, helpers, and inline bilingual objects', () => {
    const sourceDirectory = resolve(fileURLToPath(new URL('../', import.meta.url)), '..')
    const legacyPattern = /t\(\s*\{\s*(?:zh|en)|pickLocaleText\s*\(|\b(?:LocaleText|LocalizedUiText)\b/g
    const violations: string[] = []

    for (const file of productionSourceFiles(sourceDirectory)) {
      const source = readFileSync(file, 'utf8')
      if (file.endsWith('i18n-messages.ts')) continue
      if (legacyPattern.test(source)) violations.push(file.slice(sourceDirectory.length + 1))
      legacyPattern.lastIndex = 0
    }

    expect(violations).toEqual([])
  })

  it('keeps dictionary keys unique and all message values non-empty', () => {
    const dictionarySource = readFileSync(resolve(fileURLToPath(new URL('.', import.meta.url)), 'i18n-messages.ts'), 'utf8')
    const sourceKeys = dictionarySource.split('\n').flatMap((line) => {
      const trimmed = line.trim()
      const separator = trimmed.indexOf(': {')
      if (separator < 2) return []

      const key = trimmed.slice(0, separator)
      const quote = key[0]
      if ((quote !== '"' && quote !== "'") || key.at(-1) !== quote) return []
      return [key.slice(1, -1)]
    })
    const duplicateKeys = sourceKeys.filter((key, index) => sourceKeys.indexOf(key) !== index)

    expect(duplicateKeys).toEqual([])
    expect(Object.keys(MESSAGES)).not.toHaveLength(0)
    const emptyTranslations: string[] = []
    for (const [key, message] of Object.entries(MESSAGES)) {
      expect(key.trim(), `empty dictionary key`).not.toBe('')
      expect(message.en.trim(), `empty English value for ${key}`).not.toBe('')
      if (message.zh?.trim() === '') emptyTranslations.push(key)
    }
    expect(emptyTranslations).toEqual([])
  })

  it('keeps placeholders identical across keys and translations', () => {
    const mismatches: string[] = []

    for (const [key, message] of Object.entries(MESSAGES)) {
      const expected = placeholders(key).join(',')
      for (const [locale, value] of [['en', message.en], ['zh', message.zh]] as const) {
        if (value !== undefined && placeholders(value).join(',') !== expected) {
          mismatches.push(`${locale}: ${key}`)
        }
      }
    }

    expect(mismatches).toEqual([])
  })
})
