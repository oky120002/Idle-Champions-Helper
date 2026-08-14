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

describe('central i18n dictionary', () => {
  it('translates dictionary entries and interpolates parameters', () => {
    expect(t('en-US', '槽位 {p0}', { p0: 's1' })).toBe('Slot s1')
    expect(t('zh-CN', '槽位 {p0}', { p0: 's1' })).toBe('槽位 s1')
    expect(translateRef('en-US', { literal: 'raw warning' })).toBe('raw warning')
  })

  it('contains every literal translation key used by production source', () => {
    const sourceDirectory = fileURLToPath(new URL('../', import.meta.url))
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
})
