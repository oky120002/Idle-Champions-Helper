import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { findHardcodedColors } from './check-colors'

describe('check-colors', () => {
  it('src/styles 业务 CSS 无硬编码颜色（tokens.css 基色定义除外）', () => {
    const violations = findHardcodedColors('src/styles', 'src/styles/foundations/tokens.css')
    expect(violations).toEqual([])
  })

  describe('findHardcodedColors 检测覆盖', () => {
    let dir: string

    beforeEach(() => {
      dir = mkdtempSync(join(tmpdir(), 'check-colors-'))
    })

    afterEach(() => {
      rmSync(dir, { recursive: true, force: true })
    })

    function writeFixtures(files: Record<string, string>): string {
      for (const [name, content] of Object.entries(files)) {
        const full = join(dir, name)
        mkdirSync(join(full, '..'), { recursive: true })
        writeFileSync(full, content)
      }
      return join(dir, 'tokens.css')
    }

    it('捕获 oklch/oklab/lab/lch/hsl 字面量', () => {
      const tokens = writeFixtures({
        'a.css': '.a { color: oklch(50% 0.1 200); }',
        'b.css': '.b { color: oklab(0.5 0.05 -0.05); }',
        'c.css': '.c { color: lab(50% 40 30); }',
        'd.css': '.d { color: lch(50% 40 270); }',
        'e.css': '.e { color: hsl(200 50% 50%); }',
        'f.css': '.f { color: hsla(200 50% 50% / 0.5); }',
      })
      const violations = findHardcodedColors(dir, tokens)
      expect(violations).toHaveLength(6)
      expect(violations.every((v) => v.file.endsWith('.css'))).toBe(true)
    })

    it('捕获 4 位与 8 位（含 alpha）hex', () => {
      const tokens = writeFixtures({
        'short-alpha.css': '.x { color: #abcd; }',
        'long-alpha.css': '.y { border: 1px solid #11223344; }',
      })
      const violations = findHardcodedColors(dir, tokens)
      expect(violations).toHaveLength(2)
    })

    it('不误报 color-mix 的 in oklch 关键字、var()、transparent、命名色锚点', () => {
      const tokens = writeFixtures({
        'ok.css': [
          '.a { background: color-mix(in oklch, var(--color-copper) 60%, transparent); }',
          '.b { color: var(--color-text); }',
          '.c { box-shadow: 0 0 0 1px color-mix(in srgb, black 20%, transparent); }',
          '.d { outline: 2px solid color-mix(in oklch, var(--color-copper) 88%, white 12%); }',
          '.e { white-space: nowrap; }',
        ].join('\n'),
      })
      expect(findHardcodedColors(dir, tokens)).toEqual([])
    })

    it('跳过注释行，不误报注释里的颜色示例', () => {
      const tokens = writeFixtures({
        'comment.css': [
          '/* 用 color: #fff 做示例时不要写到业务里 */',
          ' * 同理 oklch(50% 0 0) 也不行',
          '.a { color: var(--color-text); }',
        ].join('\n'),
      })
      expect(findHardcodedColors(dir, tokens)).toEqual([])
    })
  })
})
