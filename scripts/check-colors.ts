import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

// 颜色字面量：rgb/rgba/hsl/hsla/oklch/oklab/lab/lch 函数（紧接数字字面量）或 #hex（3/4/6/8 位，含 alpha）。
// 命中即视为硬编码。要求括号后跟数字，故 oklch(var())、rgb(var()) 这类包 var 的合法写法不会误中；
// color-mix 的 in oklch 关键字无括号也不会误中。命名色（white/black 等）不检测——
// 本项目用它们作 color-mix 锚点（见 tokens.css 注释），强行检测会大面积误报。
const COLOR_LITERAL_RE = /(?:rgba?|hsla?|oklch|oklab|lab|lch)\(\s*\d|#(?:[0-9a-fA-F]{3,4}){1,2}\b/

export interface ColorViolation {
  file: string
  line: number
  text: string
}

/** 递归扫描 stylesDir 下的 .css，返回硬编码颜色违规（排除 tokensFile 基色定义与注释行）。 */
export function findHardcodedColors(stylesDir: string, tokensFile: string): ColorViolation[] {
  const violations: ColorViolation[] = []

  function scan(dir: string) {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry)
      if (statSync(full).isDirectory()) {
        scan(full)
        continue
      }
      if (!entry.endsWith('.css') || full === tokensFile) continue
      const lines = readFileSync(full, 'utf8').split('\n')
      lines.forEach((line, index) => {
        const trimmed = line.trim()
        if (trimmed.startsWith('/*') || trimmed.startsWith('*')) return
        if (COLOR_LITERAL_RE.test(line)) {
          violations.push({ file: relative(stylesDir, full), line: index + 1, text: trimmed })
        }
      })
    }
  }

  scan(stylesDir)
  return violations
}

function main() {
  const stylesDir = join(process.cwd(), 'src/styles')
  const tokensFile = join(stylesDir, 'foundations/tokens.css')
  const violations = findHardcodedColors(stylesDir, tokensFile)

  if (violations.length > 0) {
    console.error(
      `✗ 发现 ${violations.length} 处硬编码颜色。颜色必须登记为 token（src/styles/foundations/tokens.css），禁止在业务 CSS 写 rgb()/rgba()/#hex：`,
    )
    for (const v of violations) {
      console.error(`  ${v.file}:${v.line}: ${v.text}`)
    }
    process.exit(1)
  }

  console.log('✓ 业务 CSS 无硬编码颜色。')
}

// vitest 运行时 process.env.VITEST 为 'true'，跳过 CLI；直接 tsx 运行时执行 main。
if (!process.env.VITEST) {
  main()
}
