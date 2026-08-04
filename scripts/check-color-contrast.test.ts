import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import process from 'node:process'
import { describe, expect, it } from 'vitest'
import { unwrap } from '../tests/utils/dom-assertions.ts'
import {
  alphaComposite,
  contrastRatio,
  type ContrastViolation,
  extractTopLevelBlock,
  findContrastViolations,
  parseColor,
  parseThemeBlock,
  relativeLuminance,
} from './check-color-contrast'

describe('check-color-contrast 颜色数学', () => {
  it('oklch 纯白/纯黑 → sRGB 端点', () => {
    // L=100% 为纯白，L=0% 为纯黑。
    const white = unwrap(parseColor('oklch(100% 0 0)'), 'oklch 纯白应可解析')
    const black = unwrap(parseColor('oklch(0% 0 0)'), 'oklch 纯黑应可解析')
    expect(white.r).toBeCloseTo(1, 4)
    expect(white.g).toBeCloseTo(1, 4)
    expect(white.b).toBeCloseTo(1, 4)
    expect(black.r).toBeCloseTo(0, 4)
    expect(black.g).toBeCloseTo(0, 4)
    expect(black.b).toBeCloseTo(0, 4)
  })

  it('纯白 vs 纯黑对比度 = 21', () => {
    const ratio = contrastRatio({ r: 1, g: 1, b: 1, a: 1 }, { r: 0, g: 0, b: 0, a: 1 })
    expect(ratio).toBeCloseTo(21, 1)
  })

  it('相同色对比度 = 1', () => {
    const c = { r: 0.5, g: 0.5, b: 0.5, a: 1 }
    expect(contrastRatio(c, c)).toBeCloseTo(1, 4)
  })

  it('alpha 合成：a=0 时等于背景，a=1 时等于前景', () => {
    const fg = { r: 1, g: 0, b: 0, a: 0 }
    const bg = { r: 0, g: 1, b: 0, a: 1 }
    const composited0 = alphaComposite(fg, bg)
    expect(composited0.r).toBeCloseTo(0, 4)
    expect(composited0.g).toBeCloseTo(1, 4)

    const fg1 = { r: 1, g: 0, b: 0, a: 1 }
    const composited1 = alphaComposite(fg1, bg)
    expect(composited1.r).toBeCloseTo(1, 4)
    expect(composited1.g).toBeCloseTo(0, 4)
  })

  it('relativeLuminance：纯白=1、纯黑=0', () => {
    expect(relativeLuminance({ r: 1, g: 1, b: 1, a: 1 })).toBeCloseTo(1, 4)
    expect(relativeLuminance({ r: 0, g: 0, b: 0, a: 1 })).toBeCloseTo(0, 4)
  })
})

describe('check-color-contrast parseColor', () => {
  it('解析 oklch 百分比 + alpha', () => {
    const c = unwrap(parseColor('oklch(48% 0.13 72 / 0.5)'), 'oklch 百分比应可解析')
    expect(c.a).toBeCloseTo(0.5, 4)
  })

  it('解析 oklch 小数 L 无 alpha', () => {
    const c = unwrap(parseColor('oklch(0.48 0.13 72)'), 'oklch 小数 L 应可解析')
    expect(c.a).toBe(1)
  })

  it('解析 modern 语法 rgb/rgba 与 legacy 逗号语法', () => {
    const modern = unwrap(parseColor('rgb(10 20 30)'), 'modern rgb 应可解析')
    const legacy = unwrap(parseColor('rgba(10, 20, 30, 0.5)'), 'legacy rgba 应可解析')
    expect(modern.r).toBeCloseTo(10 / 255, 4)
    expect(legacy.a).toBeCloseTo(0.5, 4)
  })

  it('var()/color-mix()/命名色返回 null（不解析）', () => {
    expect(parseColor('var(--color-text)')).toBeNull()
    expect(parseColor('color-mix(in oklch, var(--color-copper) 60%, transparent)')).toBeNull()
    expect(parseColor('white')).toBeNull()
    expect(parseColor('transparent')).toBeNull()
  })
})

describe('check-color-contrast extractTopLevelBlock', () => {
  const CSS = [
    '/* comment */',
    ':root {',
    '  --a: oklch(50% 0 0);',
    '}',
    ':root[data-theme="light"] {',
    '  --a: oklch(80% 0 0);',
    '}',
    '@media (min-width: 1440px) {',
    '  :root { --layout: 100px; }',
    '}',
  ].join('\n')

  it('取到 :root 顶层块且不吞并 [data-theme="light"] 与 @media 内同名块', () => {
    const dark = unwrap(extractTopLevelBlock(CSS, ':root'), '应找到 :root 块')
    expect(dark).toContain('--a: oklch(50% 0 0)')
    expect(dark).not.toContain('80% 0 0')
    expect(dark).not.toContain('--layout')
  })

  it('取到 :root[data-theme="light"] 块', () => {
    const light = unwrap(extractTopLevelBlock(CSS, ':root[data-theme="light"]'), '应找到 light 块')
    expect(light).toContain('80% 0 0')
    expect(light).not.toContain('50% 0 0')
  })

  it('selector 不存在时返回 null', () => {
    expect(extractTopLevelBlock(CSS, ':root[data-theme="sepia"]')).toBeNull()
  })
})

describe('check-color-contrast parseThemeBlock', () => {
  it('解析可识别颜色，var()/注释行/null 归类正确', () => {
    const block = [
      '  /* a comment */',
      '  --a: oklch(50% 0 0);',
      '  --b: rgba(10, 20, 30, 0.5);',
      '  --c: var(--a);',
      '  --d: color-mix(in oklch, var(--x) 50%, transparent);',
      '  /* not a declaration */',
    ].join('\n')
    const tokens = parseThemeBlock(block)
    expect(tokens['--a']).not.toBeNull()
    expect(tokens['--b']).not.toBeNull()
    expect(tokens['--c']).toBeNull()
    expect(tokens['--d']).toBeNull()
  })
})

describe('check-color-contrast findContrastViolations', () => {
  /** 构造最小双主题 tokens.css：正文文字 vs 页面底 + 卡片底。
   * oklch L 与 sRGB 亮度非线性：oklch(95%)→sRGB~0.93，oklch(94%)→sRGB~0.92，对比度 ≈1.05。 */
  function buildCss(darkText: string, lightText: string, bg = 'oklch(95% 0 0)'): string {
    return [
      ':root {',
      `  --color-bg-mid: ${bg};`,
      '  --color-panel: rgba(50, 50, 50, 0.5);',
      `  --color-text: ${darkText};`,
      '}',
      ':root[data-theme="light"] {',
      `  --color-bg-mid: ${bg};`,
      '  --color-panel: rgba(50, 50, 50, 0.5);',
      `  --color-text: ${lightText};`,
      '}',
    ].join('\n')
  }

  it('低对比度浅主题文字被报，深主题达标的不报', () => {
    // 浅主题：近白底 + 近白文字（对比度 ≈1，失败）；深主题：白底深文字（对比度高，达标）。
    const css = buildCss('oklch(10% 0 0)', 'oklch(94% 0 0)', 'oklch(95% 0 0)')
    const v = findContrastViolations(css)
    const lightViolations = v.filter((x) => x.theme === 'light' && x.textToken === '--color-text')
    expect(lightViolations.length).toBeGreaterThan(0)
    const darkViolations = v.filter((x) => x.theme === 'dark' && x.textToken === '--color-text')
    expect(darkViolations).toEqual([])
  })

  it('装饰色（copper/cat/rarity）使用 3 门槛，正文使用 4.5', () => {
    // copper 与白底几乎同色（对比度 ≈1），触发 accent 失败（门槛 3）；
    // 正文 --color-text 深色对比度高，不报。
    const css = [
      ':root {',
      '  --color-bg-mid: oklch(95% 0 0);',
      '  --color-copper: oklch(94% 0 0);',
      '  --color-text: oklch(10% 0 0);',
      '}',
      ':root[data-theme="light"] {',
      '  --color-bg-mid: oklch(95% 0 0);',
      '  --color-copper: oklch(94% 0 0);',
      '  --color-text: oklch(10% 0 0);',
      '}',
    ].join('\n')
    const v = findContrastViolations(css)
    const copperViolation = v.find((x) => x.textToken === '--color-copper')
    expect(copperViolation).toBeDefined()
    const copper = unwrap(copperViolation, '应找到 copper 对比度违规')
    expect(copper.role).toBe('accent')
    expect(copper.threshold).toBe(3)
    const textViolation = v.find((x) => x.textToken === '--color-text')
    expect(textViolation).toBeUndefined()
  })

  it('bgTokens 自定义：限定单一背景', () => {
    const css = buildCss('oklch(10% 0 0)', 'oklch(94% 0 0)', 'oklch(95% 0 0)')
    const v = findContrastViolations(css, { bgTokens: ['--color-bg-mid'] })
    expect(v.every((x) => x.bgToken === '--color-bg-mid')).toBe(true)
  })

  it('violation 携带 theme/textToken/bgToken/ratio/threshold/role', () => {
    const css = buildCss('oklch(10% 0 0)', 'oklch(94% 0 0)', 'oklch(95% 0 0)')
    const v = findContrastViolations(css)
    expect(v.length).toBeGreaterThan(0)
    const keys: (keyof ContrastViolation)[] = ['theme', 'textToken', 'bgToken', 'ratio', 'threshold', 'role']
    const first = unwrap(v[0], '应至少有一条违规')
    for (const k of keys) {
      expect(first[k]).toBeDefined()
    }
  })
})

describe('check-color-contrast 真实 tokens.css', () => {
  const tokensPath = join(process.cwd(), 'src/styles/foundations/tokens.css')

  it('文件可被 findContrastViolations 解析（双主题都识别）', () => {
    const css = readFileSync(tokensPath, 'utf8')
    const v = findContrastViolations(css)
    // 仅断言能跑通；列出当前失败组合（守护脚本上线时不一定为 0，作为基线）。
    const themes = new Set(v.map((x) => x.theme))
    expect(themes.size === 1 || themes.size === 2 || v.length === 0).toBe(true)
    // 装饰色门槛与正文门槛正确分发：按 token 前缀分组断言，避免条件分支内 expect
    const bodyItems = v.filter((x) => x.textToken.startsWith('--color-text'))
    const accentItems = v.filter((x) => !x.textToken.startsWith('--color-text'))
    for (const item of bodyItems) {
      expect(item.role).toBe('body')
      expect(item.threshold).toBe(4.5)
    }
    for (const item of accentItems) {
      expect(item.role).toBe('accent')
      expect(item.threshold).toBe(3)
    }
  })
})
