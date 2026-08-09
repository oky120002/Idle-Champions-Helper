/**
 * restrictions 文本模板匹配解析器。
 *
 * 数据源：`variants.json.items[].restrictions: Array<{original, display}>`（双语自由文本）。
 * 评估结论：`docs/specs/modules/planner/data-source-confirmations.md` §12.1。
 *
 * 不用 NLP，纯关键词模板。解析以下高价值模式：
 * 1. slot-occupying（→ lockedSlotCount）
 * 2. 属性门槛（→ attributeRequirements，CON/INT/CHA/STR/DEX/WIS score of N or higher/lower）
 * 3. 可行性上下文（→ viabilityContext，护甲段数/命中型/伤害修正等）
 * flavor 文本 / 完成前置 / 变量递增版不匹配 → warning（12.3 手工补 semantic-overrides.json）。
 * champion-tag 限制（"Only Evil Champions"）已被 mechanics 结构化捕获，不在此重复解析。
 */

import type { AttributeRequirement } from '../../src/domain/types/formation.ts'
import type { DamageSourcePattern, SegmentConfig, ViabilityContext } from '../../src/domain/planner/plannerModel.ts'

export type { AttributeRequirement, DamageSourcePattern, SegmentConfig, ViabilityContext }

export interface ParsedRestrictions {
  /** 被占据/诅咒的格数（保守取多条中最严的 max，不累加）。 */
  lockedSlotCount: number
  /** 属性门槛（CON/INT/CHA/STR/DEX/WIS score of N or higher/lower）。 */
  attributeRequirements: AttributeRequirement[]
  /** 可行性上下文（护甲/伤害修正等）。 */
  viabilityContext: ViabilityContext
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
    const token = adjMatch[1]
    if (token === undefined) return null
    return tokenToNumber(token)
  }
  // 回退：「take up slots」（复数 occupy）取首个数词（实体数 = 格数）。
  // 搜索范围限定到「take up slots」之前——占格实体数词总在动词前（"Three imps take up slots"）；
  // 否则长文本后文的无关数字会被误抓（variant 430 "CHA of 14" 被当成 14 格 → 超过阵型总槽位）。
  const takeUpMatch = EN_TAKE_UP_SLOTS_RE.exec(text)
  if (takeUpMatch) {
    const first = EN_FIRST_NUMBER_RE.exec(text.slice(0, takeUpMatch.index))
    if (first) {
      const token = first[1]
      if (token === undefined) return null
      return tokenToNumber(token)
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
 * 低频变体手工校验后补录；新增条目时核对 in-game 占格数。
 * key = original 文本的唯一子串（大小写不敏感）；value = 占格数。
 *
 * 排序约定：更具体的 match 排前——matchOverride 取首个命中，泛化子串须排在特化子串之后，
 * 否则会被同含该子串的其它 variant 抢先命中（如 v682 "Rudolph..." 与 v414 都含 "barovian wedding"，
 * v682 须先命中专属的 "rudolph van richten"）。
 */
const RESTRICTION_OVERRIDES: ReadonlyArray<{ match: string; count: number }> = [
  { match: 'nat, squiddly, and jenks', count: 3 }, // 3 名具名英雄各占 1 格
  { match: 'two frightened villagers', count: 2 }, // 文本 "take up additional slots"，非 "up slots" 紧邻，回退不触发
  { match: 'two of the slots in your formation are cursed', count: 2 },
  { match: 'a monodrone and a duodrone', count: 2 }, // variant 430：具名实体无显式数词，回退无匹配
  // 模板漏匹配的非英雄占格（措辞超出模板：动词变位 takes/taking up、
  // number 与 slots 间插 formation、"take up space" 无 slots、具名实体无数词）。
  // 注意区分 NPC 占格（本块）vs 英雄 forcedHeroes（不在此计）：
  //   - v682 Rudolph + Ireena 是 NPC（forcedHeroes 空）→ 2；v1977/78/79 Rudolph 是英雄（forcedHeroes=[177]）→ 不匹配。
  //   - v1261 Bronze Dragon 是 NPC（3 格）；v1629 Bronze Dragon 是 NPC（2 格），按 "as an escort" 区分。
  { match: 'rudolph van richten and his ally', count: 2 }, // v682：Rudolph + Ireena 两名 NPC
  { match: 'young bronze dragon', count: 3 }, // v1124：Young Bronze Dragon 占后三格
  { match: 'bronze dragon joins the formation as an escort', count: 3 }, // v1261：Bronze Dragon escort 占三格
  { match: 'bronze dragon joins the formation', count: 2 }, // v1629：Bronze Dragon 占两格（须排在 v1261 后）
  { match: 'barovian wedding', count: 2 }, // v414：两名婚礼宾客 take up space
  { match: 'two costumed fans', count: 2 }, // v444：两名粉丝 take up space
  { match: 'three black cats', count: 3 }, // v1589：三只黑猫 take up space
  { match: 'ill-informed guide', count: 1 }, // v96：无知向导占中央一格
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

// 位置轮换标记：固定 N 格，仅位置随区域/时间变化（计数不变）→ 非变量，正常取数。
// 如 v241「两格...每经过 25 区域后改变位置」= 2 格换位置，不是递增。
// 不匹配孤立的「移动」——v296「守望者...无法被移动或移除」是英雄锁定（forcedHeroes），
// 不是 NPC 换位置；若用孤立「移动」会误判变量递增（每 50 区域 +1 格）为位置轮换，
// 跳过排除、误产 occ。只收明确的位置变化短语（阵型中移动 / 改变位置 / 变换位置 / 切换位置）。
const ZH_POSITION_ROTATION_RE = /阵型中移动|移动位置|改变位置|变换位置|切换位置|换位置|换格/
// 区域递增占格标记：「每经过 N 区域」「每 N 个区域」「额外 N 格」——计数随区域增长。
// 注意：「每 N 秒换格」是固定 N 格轮换位置（计数不变），不在此列（无区域递增标记）。
const ZH_AREA_INCREMENT_RE = /每经过|每\s*\d+\s*个?区域|额外\s*[一二两三四五六七八九\d]/

function zhSlotOccupyCount(text: string): number | null {
  // 先判定 slot-occupy 语义：含「格」+「占据/占用/被...占」。
  if (!text.includes('格')) {
    return null
  }
  const hasOccupy = text.includes('占据') || text.includes('占用') || /被.{0,6}占/.test(text)
  if (!hasOccupy) {
    return null
  }
  // 变量递增版（随区域重复占据新格，计数增长）不产生确定格数（保守交手工补）。
  // 须先排除位置轮换（固定 N 格换位置，计数不变）——否则 v241「两格...每经过 N 区域改变位置」
  // 会被「每经过」误判为递增。
  if (ZH_AREA_INCREMENT_RE.test(text) && !ZH_POSITION_ROTATION_RE.test(text)) {
    return null
  }
  // 提取紧邻「格」前的中文数词或数字。
  // eslint-disable-next-line sonarjs/super-linear-regex -- 交替组内 CJK 字符集与 ASCII digit 不重叠，回溯风险可忽略
  const match = /([一二两三四五六七八九]|\d+)\s*格/.exec(text)
  if (match === null) {
    return null
  }
  const token = match[1]
  if (token === undefined) {
    return null
  }
  const n = /^\d+$/.test(token) ? parseInt(token, 10) : ZH_DIGITS[token]
  return typeof n === 'number' && n > 0 ? n : null
}

function isTrivialRestriction(original: string, display: string): boolean {
  const text = `${original} ${display}`.toLowerCase()
  // 完成前置 / 明确无限制 → 非 slot-occupying，不算 warning（已知无约束）。
  return text.includes('must have completed') || text.includes('no restrictions')
}

/**
 * 检查 restriction 文本是否含有未被属性门槛/占格/trivial 句覆盖的残余句子。
 * 用于属性门槛提取成功后仍检测敌人刷新/伤害调整等特殊机制句，
 * 避免条目级抑制吞掉复合 restriction 中的特殊机制 warning（72 变体受影响）。
 */
function hasResidualMechanics(original: string): boolean {
  if (original === '') return false
  // 规范化换行后按句拆分（与 parseAttributeRequirements 一致）。
  const normalized = original.replace(/\r?\n/g, ' ')
  for (const sentence of normalized.split(/\.\s+/)) {
    const s = sentence.trim()
    if (s === '') continue
    const lower = s.toLowerCase()
    // trivial 句（完成前置 / 无限制）
    if (lower.includes('must have completed') || lower.includes('no restrictions')) continue
    // 使用门槛句（属性门槛或标签限制「Only Evil Champions can be used」）
    if (USAGE_GATE_RE.test(s)) continue
    // 占格句（含 slot + 占据关键词，slot 计数由 enSlotOccupyCount/override 处理）
    if (lower.includes('slot') && EN_SLOT_OCCUPY_KEYWORDS.some((kw) => lower.includes(kw))) continue
    // 残余非平凡句 = 特殊机制
    return true
  }
  return false
}

// 属性门槛正则（全局）：(STAT) (score )?of (N) or (higher|lower)
// 匹配 "CON score of 13 or higher" / "CHA of 14 or lower" 等（"score" 可选）。
// STAT 全大写三字母，N 为数字。忽略大小写。全局标志用于 matchAll 提取多属性门槛。
const ATTRIBUTE_THRESHOLD_RE = /\b(STR|DEX|CON|INT|WIS|CHA)\s+(?:score\s+)?of\s+(\d+)\s+or\s+(higher|lower)\b/gi

// 使用门槛语句标记（白名单）：仅从显式声明「谁能上场」的句子提取属性门槛。
// 排除三类条件效果句（属性模式出现但非使用门槛）：
//   - 伤害修饰（v319: "Champions with INT of 14 or higher deal 400% additional damage"）
//   - 伤害免疫（v865: "Champions with INT score of 15 or higher take no damage"）
//   - 邻接位限制（v1984: "only Champions with INT of 12 or lower are allowed to be placed adjacent"）
const USAGE_GATE_RE = /\b(?:can|may)\s+(?:be\s+used|partake)\b|\bonly\s+use\b|\btake\s+part\b/i

/**
 * 从 restriction 文本提取全部属性门槛。
 * 按句拆分，仅从使用门槛语句（含「can/may be used」「only use」「take part」等）提取，
 * 排除伤害修饰/免疫/邻接位限制等条件效果句。
 */
function parseAttributeRequirements(text: string): AttributeRequirement[] {
  const results: AttributeRequirement[] = []
  for (const sentence of text.split(/\.\s+/)) {
    if (!USAGE_GATE_RE.test(sentence)) continue
    for (const match of sentence.matchAll(ATTRIBUTE_THRESHOLD_RE)) {
      const stat = match[1]?.toLowerCase()
      const value = match[2] !== undefined ? parseInt(match[2], 10) : NaN
      const direction = match[3]?.toLowerCase()
      if (stat === undefined || Number.isNaN(value) || direction === undefined) continue
      results.push({
        stat: stat as AttributeRequirement['stat'],
        operator: direction === 'higher' ? '>=' : '<=',
        value,
      })
    }
  }
  return results
}

// ─── 可行性上下文解析 ───

// eslint-disable-next-line sonarjs/super-linear-regex -- 固定模式无回溯风险（alternation 分支不重叠）
const ARMOR_SEGMENTS_RE = /(\d+)\s+(?:additional\s+)?armored\s+(?:hit\s+points|HP)/i
// eslint-disable-next-line sonarjs/super-linear-regex -- 同上
const HITS_BASED_SEGMENTS_RE = /(\d+)\s+(?:additional\s+)?hits-based\s+(?:HP|hit\s+points|health)/i
const ARMORED_FLAG_RE = /armored\s+hit-based\s+health/i
// eslint-disable-next-line sonarjs/super-linear-regex -- 同上
const SCALING_ADDITIONAL_RE = /(\d+)\s+additional\s+(?:armored|hits-based)\s+hit\s+points/i
const SCALING_EVERY_RE = /every\s+(\d+)\s+areas/i
const DAMAGE_REDUCED_RE = /damage\s+(?:is\s+)?reduced\s+by\s+(\d+(?:\.\d+)?)\s*%/i
const ENEMY_DAMAGE_MULT_RE = /deal\s+(\d+(?:\.\d+)?)x\s+damage/i
// 持续掉血：「Champions take/lose X% of (their) max health every second」。
// 排除 random（单目标爆发）和 reduce（伤害削减非掉血）。
// eslint-disable-next-line sonarjs/regex-complexity -- 多变体自然语言模式，拆分后更难维护
const HEALTH_DRAIN_PCT_RE = /(?:take|takes|lose|loses)\s+(?:damage\s+)?(?:equal\s+to\s+)?(\d+(?:\.\d+)?)\s*%\s+(?:of\s+(?:their\s+)?(?:max|maximum|total)\s*health|unavoidable\s+damage)/i
const EVERY_SECOND_RE = /\b(?:every|each|per)\s+second\b/i
// S4 burst：every N seconds (N≥2) 打 X% 伤害——等效 drainRate = X/100/N
const BURST_INTERVAL_RE = /\b(?:every|each)\s+(\d+)(?:-(\d+))?\s+seconds?\b/i
// eslint-disable-next-line sonarjs/super-linear-regex, sonarjs/regex-complexity -- 多变体自然语言模式
const BURST_PCT_RE = /(\d+(?:\.\d+)?)\s*%\s+(?:of\s+(?:their\s+)?(?:max|maximum)\s*health|of\s+(?:the\s+)?champion|damage)/i

function parseSegmentConfig(text: string, baseRegex: RegExp): SegmentConfig | null {
  const baseMatch = baseRegex.exec(text)
  if (!baseMatch) {
    // 检查是否仅有标志（"armored hit-based health"），无具体段数
    if (ARMORED_FLAG_RE.test(text) && baseRegex === ARMOR_SEGMENTS_RE) {
      return { segments: 1 } // 标志存在但无段数 → 默认 1（保守最小值）
    }
    return null
  }
  const segments = parseInt(baseMatch[1] ?? '', 10)
  if (!Number.isFinite(segments) || segments <= 0) return null

  const scalingAdditionalMatch = SCALING_ADDITIONAL_RE.exec(text)
  const scalingEveryMatch = SCALING_EVERY_RE.exec(text)
  if (scalingAdditionalMatch && scalingEveryMatch) {
    const additional = parseInt(scalingAdditionalMatch[1] ?? '', 10)
    const everyAreas = parseInt(scalingEveryMatch[1] ?? '', 10)
    if (Number.isFinite(additional) && additional > 0 && Number.isFinite(everyAreas) && everyAreas > 0) {
      return { segments, scaling: { additional, everyAreas } }
    }
  }
  return { segments }
}

function parseDamageModifier(text: string): number | null {
  const match = DAMAGE_REDUCED_RE.exec(text)
  if (!match) return null
  const pct = parseFloat(match[1] ?? '')
  if (!Number.isFinite(pct) || pct <= 0 || pct >= 100) return null
  return (100 - pct) / 100 // "reduced by 99%" → 0.01
}

function parseEnemyDamageMult(text: string): number | null {
  const match = ENEMY_DAMAGE_MULT_RE.exec(text)
  if (!match) return null
  const mult = parseFloat(match[1] ?? '')
  return Number.isFinite(mult) && mult > 0 ? mult : null
}

function parseHealthDrainRate(text: string): number | null {
  if (!EVERY_SECOND_RE.test(text)) return null
  if (/\brandom\b/i.test(text)) return null
  if (/\breduc/i.test(text)) return null
  const match = HEALTH_DRAIN_PCT_RE.exec(text)
  if (!match) return null
  const pct = parseFloat(match[1] ?? '')
  if (!Number.isFinite(pct) || pct <= 0 || pct > 100) return null
  return pct / 100
}

/** S4 burst：X% 伤害 every N 秒（N≥2）→ 等效持续掉血 X/100/N。含随机目标 burst。 */
function parseBurstDrainRate(text: string): number | null {
  if (/\breduc/i.test(text)) return null
  const intervalMatch = BURST_INTERVAL_RE.exec(text)
  if (!intervalMatch) return null
  const interval = parseInt(intervalMatch[1] ?? '', 10)
  if (!Number.isFinite(interval) || interval < 2) return null
  const pctMatch = BURST_PCT_RE.exec(text)
  if (!pctMatch) return null
  const pct = parseFloat(pctMatch[1] ?? '')
  if (!Number.isFinite(pct) || pct <= 0 || pct > 100) return null
  return pct / 100 / interval
}

function parseViabilityContext(original: string): ViabilityContext {
  if (original === '') return { armor: null, hitsBased: null, damageModifier: null, enemyDamageMult: null, healthDrainRate: null }
  const continuous = parseHealthDrainRate(original)
  const burst = parseBurstDrainRate(original)
  const drainSum = (continuous ?? 0) + (burst ?? 0)
  return {
    armor: parseSegmentConfig(original, ARMOR_SEGMENTS_RE),
    hitsBased: parseSegmentConfig(original, HITS_BASED_SEGMENTS_RE),
    damageModifier: parseDamageModifier(original),
    enemyDamageMult: parseEnemyDamageMult(original),
    healthDrainRate: drainSum > 0 ? drainSum : null,
  }
}

/**
 * 解析 variant restrictions → lockedSlotCount + attributeRequirements + viabilityContext + warnings。
 * 双语（EN original + ZH display）分别尝试；slot count 取保守 max，属性门槛取全量并集。
 */
export function parseRestrictions(restrictions: readonly RestrictionText[]): ParsedRestrictions {
  let lockedSlotCount = 0
  const attributeRequirements: AttributeRequirement[] = []
  const warnings: string[] = []
  const seenAttrs = new Set<string>()
  let armor: SegmentConfig | null = null
  let hitsBased: SegmentConfig | null = null
  let damageModifier: number | null = null
  let enemyDamageMult: number | null = null
  let healthDrainRate: number | null = null

  for (const { original, display } of restrictions) {
    // 属性门槛从 EN original 提取（中文 display 通常不含 "CON score of" 模式）
    const extractedAttrs = original !== '' ? parseAttributeRequirements(original) : []
    for (const req of extractedAttrs) {
      const key = `${req.stat}${req.operator}${String(req.value)}`
      if (!seenAttrs.has(key)) {
        seenAttrs.add(key)
        attributeRequirements.push(req)
      }
    }

    // 可行性上下文从 EN original 提取
    if (original !== '') {
      const vc = parseViabilityContext(original)
      if (vc.armor) armor = vc.armor
      if (vc.hitsBased) hitsBased = vc.hitsBased
      if (vc.damageModifier != null) damageModifier = vc.damageModifier
      if (vc.enemyDamageMult != null) enemyDamageMult = vc.enemyDamageMult
      if (vc.healthDrainRate != null) healthDrainRate = vc.healthDrainRate
    }

    const enCount = original !== '' ? enSlotOccupyCount(original) : null
    const zhCount = display !== '' ? zhSlotOccupyCount(display) : null
    const overrideCount = original !== '' ? matchOverride(original) : null
    const count = enCount ?? zhCount ?? overrideCount

    if (count !== null && count > 0) {
      lockedSlotCount = Math.max(lockedSlotCount, count)
    } else if (extractedAttrs.length > 0 && !hasResidualMechanics(original)) {
      // 属性门槛提取成功且无残余特殊机制句 → 非未解析，不记 warning。
    } else if (!isTrivialRestriction(original, display) && (original !== '' || display !== '')) {
      // 非 slot-occupying 且非已知无约束 → 记 warning 待手工评估。
      warnings.push(`未解析 restriction：${original !== '' ? original : display}`)
    }
  }

  return {
    lockedSlotCount,
    attributeRequirements,
    viabilityContext: { armor, hitsBased, damageModifier, enemyDamageMult, healthDrainRate },
    warnings,
  }
}

// ─── 伤害来源位置限制解析 ───

const EN_COLUMN_NUMBERS: Record<string, number> = { one: 1, two: 2, three: 3, four: 4 }
const PRONOUNS = new Set(['him', 'her', 'them', 'his', 'hers', 'theirs', 'it'])

/** 精确匹配后回退后缀匹配（"van richten" → "rudolph van richten"）。 */
function lookupHeroName(name: string, heroNameToId: ReadonlyMap<string, string>): string | null {
  const lower = name.toLowerCase().trim()
  if (lower.length < 3) return null
  const exact = heroNameToId.get(lower)
  if (exact != null) return exact
  for (const [fullName, id] of heroNameToId) {
    if (fullName.endsWith(' ' + lower)) return id
  }
  return null
}

/**
 * 从位置关键词附近提取参考英雄名，解析为 heroId。
 *
 * 策略：用模式正则捕获名字 token（"in front of Presto" → "Presto"）。
 * 若 token 是代词（him/her/them），回退到 "Only [Name] and Champions" 前缀。
 * 若均非已知 champion 名 → null（NPC 引用如 Mirt/skunk，交 UI 层）。
 */
function resolveReferenceHero(
  sentence: string,
  nameRegex: RegExp,
  heroNameToId: ReadonlyMap<string, string>,
): string | null {
  const match = nameRegex.exec(sentence)
  if (match) {
    // Strip possessive ‘s / ‘s suffix（"Ezmerelda’s" → "Ezmerelda"，"Lae’zel’s" → "Lae’zel"）。
    const token = match[1]?.trim().replace(/['’]s$/i, '')
    if (token != null && token !== '' && !PRONOUNS.has(token.toLowerCase())) {
      const id = lookupHeroName(token, heroNameToId)
      if (id != null) return id
    }
  }
  // 代词回退："Only [Name] and (the) Champions ..." 前缀中的具名英雄。
  // eslint-disable-next-line sonarjs/super-linear-regex -- \w[\w\s']*? 非贪婪限定在 "and champions" 前，回溯可忽略
  const onlyMatch = /\bonly\s+(\w[\w\s']*?)\s+and\s+(?:the\s+)?champions/i.exec(sentence)
  if (onlyMatch) {
    const name = onlyMatch[1]?.trim()
    if (name != null && name !== '' && !PRONOUNS.has(name.toLowerCase())) {
      const id = lookupHeroName(name, heroNameToId)
      if (id != null) return id
    }
  }
  return null
}

interface PatternMatch {
  kind: DamageSourcePattern['kind']
  columnSpan?: number
  /** 参考英雄名提取正则（捕获组 1 = 名字 token）。 */
  nameRegex: RegExp
}

function parseColumnSpan(token: string | undefined, fallback: number): number {
  if (token == null) return fallback
  const num = /^\d+$/.test(token) ? parseInt(token, 10) : EN_COLUMN_NUMBERS[token.toLowerCase()]
  return typeof num === 'number' && num > 0 ? num : fallback
}

/** 按优先级尝试匹配模式；返回模式 + 名字提取正则。 */
function matchPattern(sentence: string): PatternMatch | null {
  const lower = sentence.toLowerCase()

  // not-adjacent: "not next to/adjacent to X" / "next to X deal no damage"
  const notAdjacent = /\bnot\s+(?:next\s+to|adjacent\s+to)\b/i.test(sentence)
  // eslint-disable-next-line sonarjs/super-linear-regex -- \w+.* 回溯在短句上可忽略
  const adjacentNoDamage = /\b(?:next\s+to|adjacent\s+to)\s+\w+.*deal\s+no\s+damage/i.test(sentence)
  if (notAdjacent || adjacentNoDamage) {
    return { kind: 'not-adjacent', nameRegex: /(?:next\s+to|adjacent\s+to)\s+([\w'-]+)/i }
  }

  // front-columns: "(N) columns in front of X"
  // eslint-disable-next-line sonarjs/super-linear-regex -- alternation 分支不重叠
  const frontMatch = /(\d+|one|two|three|four)?\s*columns?\s+in\s+front\b/.exec(lower)
  if (frontMatch) {
    const span = frontMatch[1] !== undefined ? parseColumnSpan(frontMatch[1], 2) : 100
    return { kind: 'front-columns', columnSpan: span, nameRegex: /in\s+front\s+of\s+([\w'-]+)/i }
  }

  // behind-columns: "(N) column(s) behind X"
  // eslint-disable-next-line sonarjs/super-linear-regex -- 同上
  const behindMatch = /(\d+|one|two|three|four)?\s*columns?\s+behind\b/.exec(lower)
  if (behindMatch) {
    const span = behindMatch[1] !== undefined ? parseColumnSpan(behindMatch[1], 1) : 1
    return { kind: 'behind-columns', columnSpan: span, nameRegex: /behind\s+([\w'-]+)/i }
  }

  // same-column: "in X's column" / "X's column"（排除 front/behind/back）
  if (/\bcolumn\b/i.test(sentence) && !/\b(?:front|behind|back)\b/i.test(sentence)) {
    // eslint-disable-next-line sonarjs/super-linear-regex -- [\w'-]* 回溯在短名字 token 上可忽略
    return { kind: 'same-column', nameRegex: /(\w[\w'-]*)'?s?\s+column/i }
  }

  // adjacent (positive): "next to/adjacent to X can deal damage"
  if (/\b(?:next\s+to|adjacent\s+to)\b/i.test(sentence)) {
    return { kind: 'adjacent', nameRegex: /(?:next\s+to|adjacent\s+to)\s+([\w'-]+)/i }
  }

  return null
}

/**
 * 从 restrictions 文本解析伤害来源位置限制模式。
 *
 * 解析高频位置模式（same-column / adjacent / not-adjacent / front-columns / behind-columns），
 * 通过位置关键词附近的名字 + champion 名表解析参考英雄。
 * NPC 引用（Mirt、skunk、Elminster 等）不在名表中 → 返回 null（交 UI 层）。
 *
 * @param heroNameToId champion original 名（小写）→ heroId 映射。
 */
export function parseDamageSourcePattern(
  restrictions: readonly RestrictionText[],
  heroNameToId: ReadonlyMap<string, string>,
): DamageSourcePattern | null {
  for (const { original } of restrictions) {
    if (original === '') continue
    const normalized = original.replace(/\r?\n/g, ' ')
    for (const rawSentence of normalized.split(/\.\s+/)) {
      const sentence = rawSentence.trim()
      if (sentence === '') continue
      const lower = sentence.toLowerCase()

      const hasDamageConstraint = lower.includes('deal damage') || lower.includes('deal no damage')
      if (!hasDamageConstraint) continue

      const patternMatch = matchPattern(sentence)
      if (!patternMatch) continue

      const referenceHeroId = resolveReferenceHero(sentence, patternMatch.nameRegex, heroNameToId)
      if (referenceHeroId === null) continue // NPC 引用或未识别名，交 UI

      return {
        kind: patternMatch.kind,
        referenceHeroId,
        ...(patternMatch.columnSpan != null ? { columnSpan: patternMatch.columnSpan } : {}),
      }
    }
  }
  return null
}
