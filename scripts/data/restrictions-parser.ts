/**
 * restrictions 文本模板匹配解析器（阶段 12.2）。
 *
 * 数据源：`variants.json.items[].restrictions: Array<{original, display}>`（双语自由文本）。
 * 评估结论：`docs/modules/planner/m3-data-source-confirmations.md` §12.1。
 *
 * 不用 NLP（批判③），纯关键词模板。只解析高价值 slot-occupying 模式（→ lockedSlotCount）；
 * flavor 文本 / 完成前置 / 变量递增版不匹配 → warning（12.3 手工补 semantic-overrides.json）。
 * champion-tag 限制（"Only Evil Champions"）已被 mechanics 结构化捕获，不在此重复解析。
 */

export interface ParsedRestrictions {
  /** 被占据/诅咒的格数（保守取多条中最严的 max，不累加）。 */
  lockedSlotCount: number
  /** 未匹配的 restriction 文本（低频/变量/特殊机制），待手工补 semantic-overrides。 */
  warnings: string[]
}

export interface RestrictionText {
  original: string
  display: string
}

const EN_NUMBER_WORDS: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8,
}

// slot-occupy 语义关键词（EN）。文本须同时含 slot + 其中之一才算 slot-occupying。
const EN_SLOT_OCCUPY_KEYWORDS = ['take up', 'taken up', 'occupied', 'cursed', 'took up']

// 变量/递增模式（排除）：随层数递增占据格数的文本不产生确定 lockedSlotCount（保守 warning）。
// 注意：cursed slots「change slots every 15 seconds」是固定 N 格轮换位置（计数不变），不算变量。
const VARIABLE_PATTERNS = ['then every', 'another friendly', 'another slot']

// 匹配「数词/数字 + (random )? slots」（数字必须紧邻 slots，避免长文本里无关数字误匹配）。
const EN_NUMBER_SLOTS_RE = /\b(\d+|one|two|three|four|five|six|seven|eight)\s+(?:random\s+)?slots?\b/gi
// 回退：含 "take up slots" / "took up slots"（复数 occupy，无数词邻接 slots）时，
// 取文本首个数词（通常 = 占位实体数，如 "Two shipwrights take up slots"）。
const EN_FIRST_NUMBER_RE = /\b(\d+|one|two|three|four|five|six|seven|eight)\b/i
const EN_TAKE_UP_SLOTS_RE = /\b(?:take|took)\s+up\s+slots\b/i

function enSlotOccupyCount(text: string): number | null {
  const lower = text.toLowerCase()
  if (!lower.includes('slot')) {
    return null
  }
  const hasOccupy = EN_SLOT_OCCUPY_KEYWORDS.some((kw) => lower.includes(kw))
  if (!hasOccupy) {
    return null
  }
  // 变量/递增版不产生确定格数（保守交手工补）。
  if (VARIABLE_PATTERNS.some((p) => lower.includes(p))) {
    return null
  }
  // 优先：数字紧邻 slots（最可靠，如 "Four slots occupied" / "takes up 3 slots"）。
  EN_NUMBER_SLOTS_RE.lastIndex = 0
  const adjMatch = EN_NUMBER_SLOTS_RE.exec(text)
  if (adjMatch) {
    return tokenToNumber(adjMatch[1]!)
  }
  // 回退：「take up slots」（复数 occupy）取首个数词（实体数 = 格数）。
  // 搜索范围限定到「take up slots」之前——占格实体数词总在动词前（"Three imps take up slots"）；
  // 否则长文本后文的无关数字会被误抓（variant 430 "CHA of 14" 被当成 14 格 → 超过阵型总槽位）。
  const takeUpMatch = EN_TAKE_UP_SLOTS_RE.exec(text)
  if (takeUpMatch) {
    const first = EN_FIRST_NUMBER_RE.exec(text.slice(0, takeUpMatch.index))
    if (first) {
      return tokenToNumber(first[1]!)
    }
  }
  return null
}

function tokenToNumber(token: string): number | null {
  const t = token.toLowerCase()
  const n = /^\d+$/.test(t) ? parseInt(t, 10) : EN_NUMBER_WORDS[t]
  return typeof n === 'number' && n > 0 ? n : null
}

/**
 * 手工补：模板漏匹配但格数确定的 restriction（具名列表 / "of the" 间隔 / "additional" 等）。
 * 阶段 12.3——低频变体手工校验后补录；新增条目时核对 in-game 占格数。
 * key = original 文本的唯一子串（大小写不敏感）；value = 占格数。
 */
const RESTRICTION_OVERRIDES: ReadonlyArray<{ match: string; count: number }> = [
  { match: 'nat, squiddly, and jenks', count: 3 }, // 3 名具名英雄各占 1 格
  { match: 'two frightened villagers', count: 2 }, // 文本 "take up additional slots"，非 "up slots" 紧邻，回退不触发
  { match: 'two of the slots in your formation are cursed', count: 2 },
  { match: 'a monodrone and a duodrone', count: 2 }, // variant 430：具名实体无显式数词，回退无匹配
]

function matchOverride(original: string): number | null {
  const lower = original.toLowerCase()
  for (const override of RESTRICTION_OVERRIDES) {
    if (lower.includes(override.match)) {
      return override.count
    }
  }
  return null
}

// 中文：中文数词 + 格 + 占据/占用/被...占。
const ZH_DIGITS: Record<string, number> = {
  '一': 1, '二': 2, '两': 2, '三': 3, '四': 4, '五': 5, '六': 6, '七': 7, '八': 8, '九': 9,
}

function zhSlotOccupyCount(text: string): number | null {
  // 先判定 slot-occupy 语义：含「格」+「占据/占用/被...占」。
  if (!text.includes('格')) {
    return null
  }
  const hasOccupy = text.includes('占据') || text.includes('占用') || /被.{0,6}占/.test(text)
  if (!hasOccupy) {
    return null
  }
  // 提取紧邻「格」前的中文数词或数字。
  const match = text.match(/([一二两三四五六七八九]|\d+)\s*格/)
  if (!match) {
    return null
  }
  const token = match[1]!
  const n = /^\d+$/.test(token) ? parseInt(token, 10) : ZH_DIGITS[token]
  return typeof n === 'number' && n > 0 ? n : null
}

function isTrivialRestriction(original: string, display: string): boolean {
  const text = `${original} ${display}`.toLowerCase()
  // 完成前置 / 空文本 / 明确无限制 → 非 slot-occupying，不算 warning（已知无约束）。
  return (
    text.length === 0
    || text.includes('must have completed')
    || text.includes('no restrictions')
  )
}

/**
 * 解析 variant restrictions → lockedSlotCount + warnings。
 * 双语（EN original + ZH display）分别尝试；取两者中确定的格数（保守 max）。
 */
export function parseRestrictions(restrictions: readonly RestrictionText[]): ParsedRestrictions {
  let lockedSlotCount = 0
  const warnings: string[] = []

  for (const { original, display } of restrictions) {
    const enCount = original ? enSlotOccupyCount(original) : null
    const zhCount = display ? zhSlotOccupyCount(display) : null
    const overrideCount = original ? matchOverride(original) : null
    const count = enCount ?? zhCount ?? overrideCount

    if (count !== null && count > 0) {
      lockedSlotCount = Math.max(lockedSlotCount, count)
    } else if (!isTrivialRestriction(original, display) && (original || display)) {
      // 非 slot-occupying 且非已知无约束 → 记 warning 待手工评估。
      warnings.push(`未解析 restriction：${original || display}`)
    }
  }

  return { lockedSlotCount, warnings }
}
