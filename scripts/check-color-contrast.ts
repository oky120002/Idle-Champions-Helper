import { readFileSync } from 'node:fs'
import { join } from 'node:path'

// ponytail: 静态分析 tokens.css 的 oklch/rgba 文字色 vs 背景色 WCAG 对比度。
// 不跑 Playwright DOM 扫描的原因：站点是数据驱动 SPA，champions/formation/planner 等
// 首屏依赖 /data/*.json，DOM 扫描需 build + preview server + 浏览器 + 数据加载，慢且不稳定；
// 而既有审计的可读性问题（品牌/数据色作文字在浅底不可读，ratio 1.08–1.47）全部源自
// tokens.css 的 oklch 取值，静态分析能以确定、快速、零依赖的方式守护同类回归。
//
// 限制（接受）：
// - 不覆盖运行时 color-mix 派生（如属性标签 color-mix(cat 80%, text)）；这些是 token 组合，
//   不是新颜色，且 cat 已在浅主题降 L，派生色跟随变暗。需要时改用 DOM 扫描。
// - 不覆盖组件私有 CSS 的硬编码色（由 check-colors.ts 守护）。
// - 仅检查 tokens.css 中显式 oklch/rgba 的 token；var()/color-mix()/命名色跳过。
// 若需 DOM 级验证，运行 tests/e2e/ 手动核对。

/** sRGB 三元组，r/g/b ∈ [0,1]，a ∈ [0,1]。 */
export interface Rgba {
  r: number
  g: number
  b: number
  a: number
}

export interface ContrastViolation {
  theme: 'dark' | 'light'
  textToken: string
  bgToken: string
  ratio: number
  threshold: number
  role: 'body' | 'accent'
}

/** 正文文字（小字）门槛；WCAG AA。 */
export const BODY_THRESHOLD = 4.5
/** 装饰/标签色门槛（大字、图标、非正文强调）；WCAG AA large。 */
export const ACCENT_THRESHOLD = 3

// OKLab → linear sRGB（Oklab 反变换，Björn Ottosson 标准）。
const OKLAB_TO_LINEAR_SRGB: readonly (readonly [number, number, number])[] = [
  [+4.0767416621, -3.3077115913, +0.2309699292],
  [-1.2684380046, +2.6097574011, -0.3413193965],
  [-0.0041960863, -0.7034186147, +1.7076147010],
]

function clampUnit(x: number): number {
  return Math.max(0, Math.min(1, x))
}

function encodeSrgb(v: number): number {
  const c = clampUnit(v)
  return c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055
}

/** oklch(L, C, h) → sRGB（gamma 编码后），L ∈ [0,1]，C ∈ ~[0,0.4]，h 为度。 */
function oklchToSrgb(L: number, C: number, hDeg: number): readonly [number, number, number] {
  const h = (hDeg * Math.PI) / 180
  const a = C * Math.cos(h)
  const b = C * Math.sin(h)
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b
  const s_ = L - 0.0894841775 * a - 1.2914855480 * b
  const l = l_ ** 3
  const m = m_ ** 3
  const s = s_ ** 3
  const row0 = OKLAB_TO_LINEAR_SRGB[0]!
  const row1 = OKLAB_TO_LINEAR_SRGB[1]!
  const row2 = OKLAB_TO_LINEAR_SRGB[2]!
  const r = row0[0] * l + row0[1] * m + row0[2] * s
  const g = row1[0] * l + row1[1] * m + row1[2] * s
  const bl = row2[0] * l + row2[1] * m + row2[2] * s
  return [encodeSrgb(r), encodeSrgb(g), encodeSrgb(bl)]
}

/** WCAG 相对亮度。 */
export function relativeLuminance(c: Rgba): number {
  const lin = (v: number): number => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)
  return 0.2126 * lin(c.r) + 0.7152 * lin(c.g) + 0.0722 * lin(c.b)
}

/** WCAG 对比度比，≥1；纯白 vs 纯黑 = 21。 */
export function contrastRatio(a: Rgba, b: Rgba): number {
  const la = relativeLuminance(a)
  const lb = relativeLuminance(b)
  const lighter = Math.max(la, lb)
  const darker = Math.min(la, lb)
  return (lighter + 0.05) / (darker + 0.05)
}

/** fg 合成到 bg（fg.a 视为 alpha），返回不透明色（a=1）。 */
export function alphaComposite(fg: Rgba, bg: Rgba): Rgba {
  const a = clampUnit(fg.a)
  return {
    r: fg.r * a + bg.r * (1 - a),
    g: fg.g * a + bg.g * (1 - a),
    b: fg.b * a + bg.b * (1 - a),
    a: 1,
  }
}

const OKLCH_RE = /^oklch\(\s*([\d.]+)(%?)\s+([\d.eE+-]+)\s+([\d.eE+-]+)\s*(?:\/\s*([\d.]+)(%?))?\s*\)$/
const RGBA_MODERN_RE = /^rgba?\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*(?:\/\s*([\d.]+)(%?))?\s*\)$/
const RGBA_LEGACY_RE = /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)$/

/** 解析单条 CSS 颜色值；不识别 var()/color-mix()/命名色（返回 null）。 */
export function parseColor(raw: string): Rgba | null {
  const s = raw.trim()

  const m1 = OKLCH_RE.exec(s)
  if (m1) {
    const LRaw = m1[1]!
    const lpct = m1[2]!
    const CRaw = m1[3]!
    const hRaw = m1[4]!
    const aRaw = m1[5]
    const apct = m1[6]
    const L = lpct ? Number(LRaw) / 100 : Number(LRaw)
    const C = Number(CRaw)
    const h = Number(hRaw)
    const alpha = aRaw === undefined ? 1 : apct ? Number(aRaw) / 100 : Number(aRaw)
    const [r, g, b] = oklchToSrgb(L, C, h)
    return { r, g, b, a: clampUnit(alpha) }
  }

  const m2 = RGBA_MODERN_RE.exec(s)
  if (m2) {
    const rRaw = m2[1]!
    const gRaw = m2[2]!
    const bRaw = m2[3]!
    const aRaw = m2[4]
    const apct = m2[5]
    const alpha = aRaw === undefined ? 1 : apct ? Number(aRaw) / 100 : Number(aRaw)
    return { r: Number(rRaw) / 255, g: Number(gRaw) / 255, b: Number(bRaw) / 255, a: clampUnit(alpha) }
  }

  const m3 = RGBA_LEGACY_RE.exec(s)
  if (m3) {
    const rRaw = m3[1]!
    const gRaw = m3[2]!
    const bRaw = m3[3]!
    const aRaw = m3[4]
    return { r: Number(rRaw) / 255, g: Number(gRaw) / 255, b: Number(bRaw) / 255, a: aRaw === undefined ? 1 : Number(aRaw) }
  }

  return null
}

/** 提取顶层 `selector { ... }` 块内容；忽略嵌套于 @media 的同名 selector。 */
export function extractTopLevelBlock(css: string, selector: string): string | null {
  let idx = 0
  while (idx < css.length) {
    const found = css.indexOf(selector, idx)
    if (found === -1) return null
    const before = found === 0 ? undefined : css[found - 1]
    // selector 前一个字符不得是标识符/方括号（否则如 `:root` 误匹配 `:root[...]` 的前缀）。
    const continuesBefore = before !== undefined && /[\w-[(]/.test(before)
    let j = found + selector.length
    while (j < css.length && /\s/.test(css[j]!)) j++
    const after = css[j]
    const continuesAfter = after !== undefined && /[\w-[(]/.test(after)
    if (!continuesBefore && after === '{' && !continuesAfter) {
      const start = j + 1
      let depth = 1
      let k = start
      while (k < css.length && depth > 0) {
        const ch = css[k]!
        if (ch === '{') depth++
        else if (ch === '}') depth--
        k++
      }
      return css.slice(start, k - 1)
    }
    idx = found + selector.length
  }
  return null
}

const DECL_RE = /^\s*(--[\w-]+)\s*:\s*([^;]+);\s*$/

/** 解析主题块内所有可解析的 token；不可解析（var/color-mix/命名色）记为 null。 */
export function parseThemeBlock(block: string): Record<string, Rgba | null> {
  const tokens: Record<string, Rgba | null> = {}
  for (const line of block.split('\n')) {
    const m = DECL_RE.exec(line)
    if (!m) continue
    const name = m[1]!
    const value = m[2]!
    tokens[name] = parseColor(value)
  }
  return tokens
}

// 文字类 token 名规则：默认按 token 名前缀分类阈值。
// `--color-text*` → 正文（4.5）；其余强调色 → 装饰/标签（3）。
const BODY_TEXT_PREFIX = '--color-text'

function isTextToken(name: string): boolean {
  return (
    name.startsWith(BODY_TEXT_PREFIX) ||
    name === '--color-copper' ||
    name === '--color-steel' ||
    name === '--color-gold' ||
    name.startsWith('--cat-') ||
    name.startsWith('--color-rarity-') ||
    name === '--color-success' ||
    name === '--color-danger'
  )
}

function roleOf(name: string): 'body' | 'accent' {
  return name.startsWith(BODY_TEXT_PREFIX) ? 'body' : 'accent'
}

// 代表性背景 token：文字最常见的两种底色——页面底（直接看文字）与卡片底（panel/interactive）。
// 不全配对所有 bg，避免噪音；这两个已覆盖绝大多数文字阅读场景。
const PAGE_BG_TOKEN = '--color-bg-mid'
const PANEL_BG_TOKEN = '--color-panel'

interface ResolvedTheme {
  name: 'dark' | 'light'
  tokens: Record<string, Rgba | null>
  pageBase: Rgba // 不透明页面底（用于向下合成带 alpha 的 panel）
}

function resolveTheme(name: 'dark' | 'light', tokens: Record<string, Rgba | null>): ResolvedTheme | null {
  const pageBase = tokens[PAGE_BG_TOKEN]
  if (!pageBase) return null
  return { name, tokens, pageBase }
}

/** 把可能带 alpha 的 bg token 解析为不透明色（向下合成到 pageBase）。 */
function resolveOpaqueBg(token: string, theme: ResolvedTheme): Rgba | null {
  const c = theme.tokens[token]
  if (!c) return null
  return c.a >= 1 ? c : alphaComposite(c, theme.pageBase)
}

export interface ContrastOptions {
  bodyThreshold?: number
  accentThreshold?: number
  bgTokens?: readonly string[]
}

/** 计算双主题下所有文字 token vs 代表背景的 WCAG 对比度违规。 */
export function findContrastViolations(
  css: string,
  options: ContrastOptions = {},
): ContrastViolation[] {
  const bodyThreshold = options.bodyThreshold ?? BODY_THRESHOLD
  const accentThreshold = options.accentThreshold ?? ACCENT_THRESHOLD
  const bgTokens = options.bgTokens ?? [PAGE_BG_TOKEN, PANEL_BG_TOKEN]

  const darkBlock = extractTopLevelBlock(css, ':root')
  const lightBlock = extractTopLevelBlock(css, ':root[data-theme="light"]')

  const themes: ResolvedTheme[] = []
  if (darkBlock) {
    const t = resolveTheme('dark', parseThemeBlock(darkBlock))
    if (t) themes.push(t)
  }
  if (lightBlock) {
    const t = resolveTheme('light', parseThemeBlock(lightBlock))
    if (t) themes.push(t)
  }

  const violations: ContrastViolation[] = []
  for (const theme of themes) {
    const opaqueBgs = new Map<string, Rgba>()
    for (const bg of bgTokens) {
      const resolved = resolveOpaqueBg(bg, theme)
      if (resolved) opaqueBgs.set(bg, resolved)
    }
    for (const [name, color] of Object.entries(theme.tokens)) {
      if (!color || !isTextToken(name)) continue
      const role = roleOf(name)
      const threshold = role === 'body' ? bodyThreshold : accentThreshold
      for (const [bgName, opaqueBg] of opaqueBgs) {
        const effectiveFg = color.a >= 1 ? color : alphaComposite(color, opaqueBg)
        const ratio = contrastRatio(effectiveFg, opaqueBg)
        if (ratio < threshold) {
          violations.push({
            theme: theme.name,
            textToken: name,
            bgToken: bgName,
            ratio: Math.round(ratio * 100) / 100,
            threshold,
            role,
          })
        }
      }
    }
  }
  return violations
}

function formatViolation(v: ContrastViolation): string {
  return `  [${v.theme}] ${v.textToken} on ${v.bgToken}: ratio=${v.ratio.toFixed(2)} < ${v.threshold} (${v.role})`
}

function main(): void {
  const tokensFile = join(process.cwd(), 'src/styles/foundations/tokens.css')
  const css = readFileSync(tokensFile, 'utf8')
  const violations = findContrastViolations(css)

  if (violations.length > 0) {
    console.error(
      `✗ 发现 ${violations.length} 处文字/背景对比度低于 WCAG AA 门槛（深色 + 浅主题）。` +
        ` 门槛：正文 ${BODY_THRESHOLD} / 装饰标签 ${ACCENT_THRESHOLD}。详见 .impeccable.md 与 tokens.css 注释。`,
    )
    for (const v of violations) {
      console.error(formatViolation(v))
    }
    process.exit(1)
  }
  console.log('✓ 双主题文字/背景对比度全部达标。')
}

// vitest 运行时 process.env.VITEST 为 'true'，跳过 CLI；直接 tsx 运行时执行 main。
if (!process.env.VITEST) {
  main()
}
