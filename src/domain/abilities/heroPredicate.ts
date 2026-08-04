// IC 英雄布尔谓词的统一解析与求值。
//
// IC 数据有两套「英雄谓词」语法，求值域相同（对单个英雄求布尔）：
//   - shorthand（filter_targets.tags）：| OR、^ AND、! NOT、裸 tag、() 分组
//   - functional（per_hero_expr）：|| OR、&& AND、! NOT、HasTag/GetStat/age/hero_id/HasAttackDamageType
// shorthand 是 functional 的语法糖子集（裸 tag=HasTag、|=||、^=&&、!tag=!HasTag），
// 两者解析到同一 HeroPredicateAST，由同一 evalHeroPredicate 求值。
//
// 数值表达式 per_hero_expr（min/max/floor/GetUpgradeAmount/levels_past_softcap）返回 number
// 非 boolean，属 stack 计算（stage 7），不在本模块——parseHeroPredicate 对它们返回 null。

import type {
  HeroComparisonOperator,
  HeroPredicateAST,
  HeroStatKey,
  ResolvedHeroAbilityProfile,
} from './abilityModel'

export type HeroPredicateDialect = 'shorthand' | 'functional'

const SHORTHAND_OR = '|'
const SHORTHAND_AND = '^'
const FUNCTIONAL_OR = '||'
const FUNCTIONAL_AND = '&&'

/** Extract a regex capture group; throws if missing (regex matched but group didn't — shouldn't happen). */
function groupAt(match: RegExpExecArray, index: number): string {
  const value = match[index]
  if (value === undefined) throw new Error(`capture group ${index} missing`)
  return value
}

/** Check whether the outermost parentheses wrap the entire expression. */
function isFullyWrapped(expr: string): boolean {
  if (!expr.startsWith('(') || !expr.endsWith(')')) return false
  let depth = 0
  for (let index = 0; index < expr.length; index += 1) {
    const char = expr[index]
    if (char === '(') {
      depth += 1
    } else if (char === ')') {
      depth -= 1
      if (depth === 0 && index < expr.length - 1) return false
    }
    if (depth < 0) return false
  }
  return depth === 0
}

function stripOuterParentheses(expr: string): string {
  let current = expr.trim()
  while (isFullyWrapped(current)) {
    current = current.slice(1, -1).trim()
  }
  return current
}

function splitTopLevel(expr: string, delimiter: string): string[] {
  const parts: string[] = []
  let depth = 0
  let lastIndex = 0

  for (let index = 0; index < expr.length; index += 1) {
    const char = expr[index]
    if (char === '(') {
      depth += 1
      continue
    }

    if (char === ')') {
      depth -= 1
      continue
    }

    if (depth === 0 && expr.slice(index, index + delimiter.length) === delimiter) {
      parts.push(expr.slice(lastIndex, index).trim())
      lastIndex = index + delimiter.length
      index += delimiter.length - 1
    }
  }

  parts.push(expr.slice(lastIndex).trim())
  return parts.filter(Boolean)
}

function compareNumber(left: number | null | undefined, operator: HeroComparisonOperator, right: number): boolean {
  if (typeof left !== 'number') {
    return false
  }

  switch (operator) {
    case '>=':
      return left >= right
    case '<=':
      return left <= right
    case '>':
      return left > right
    case '<':
      return left < right
    case '==':
      return left === right
    default:
      return false
  }
}

function getHeroStatValue(hero: ResolvedHeroAbilityProfile, stat: HeroStatKey): number | undefined {
  if (stat === 'total_ability_score') {
    return Object.values(hero.abilityScores).reduce(
      (sum, value) => sum + (typeof value === 'number' ? value : 0),
      0,
    )
  }

  return hero.abilityScores[stat]
}

// functional 叶子：HasTag/GetStat/age/hero_id/HasAttackDamageType(+ has_base_attack_dmg_type_ 别名)/base_attack_cooldown/is_undead/true/as_int。
// 非 boolean 叶子（min/max/floor 等数值表达式）返回 null。

function matchSaveDependentLeaf(expr: string): HeroPredicateAST | null {
  // EligibleForPatron(<var>)：参数恒为「当前 patron」变量（如 aeon_current_patron_id），不解析参数；
  // runtime 查 hero.eligiblePatronIds 是否含 ownedSaveContext.currentPatronId。
  if (/^EligibleForPatron\([^)]+\)$/.exec(expr)) {
    return { op: 'eligibleForPatron' }
  }

  // GetUpgradeUnlocked(N)：存档依赖 global 谓词。parser 仅产 {upgradeId}；
  // build 期 enrichUpgradeUnlockNodes 解析 ownerHeroId(self) + requiredLevel 烘进节点。
  const upgradeUnlocked = /^GetUpgradeUnlocked\((\d+)\)$/.exec(expr)
  if (upgradeUnlocked) {
    return { op: 'upgradeUnlocked', upgradeId: groupAt(upgradeUnlocked, 1) }
  }

  // GetUpgradePurchased(N)：存档依赖 global 谓词。parser 仅产 {upgradeId}；
  // build 期 enrichment 补 ownerHeroId(self) + requiredLevel + isSpecialization。
  const upgradePurchased = /^GetUpgradePurchased\((\d+)\)$/.exec(expr)
  if (upgradePurchased) {
    return { op: 'upgradePurchased', upgradeId: groupAt(upgradePurchased, 1) }
  }

  // GetFeatEquipped(N)：存档依赖 per-hero 谓词。runtime 查 equippedFeatIds（被评估英雄的 feats）。
  const featEquipped = /^GetFeatEquipped\((\d+)\)$/.exec(expr)
  if (featEquipped) {
    return { op: 'featEquipped', featId: groupAt(featEquipped, 1) }
  }

  return null
}

function matchTagLeaf(expr: string): HeroPredicateAST | null {
  if (expr === 'is_undead') {
    return { op: 'tag', tag: 'undead' }
  }

  // has_base_attack_dmg_type_X 是 HasAttackDamageType(`X`) 的裸标识符别名
  //（raw 23 处，magic/melee/ranged；泛化支持任意类型名，与 HasAttackDamageType 同语义）
  const baseAttackDmgType = /^has_base_attack_dmg_type_([a-zA-Z_]+)$/.exec(expr)
  if (baseAttackDmgType) {
    return { op: 'attackType', attackType: groupAt(baseAttackDmgType, 1).toLowerCase(), negate: false }
  }

  // has_tag_X 是 HasTag(`X`) 的裸标识符别名（raw has_tag_rivalswaterdeep/speed/acqinc/cteam）。
  const hasTagAlias = /^has_tag_([a-zA-Z_]+)$/.exec(expr)
  if (hasTagAlias) {
    return { op: 'tag', tag: groupAt(hasTagAlias, 1).toLowerCase() }
  }

  const tag = /^HasTag\(`([^`]+)`\)$/.exec(expr)
  if (tag) {
    return { op: 'tag', tag: groupAt(tag, 1).toLowerCase() }
  }

  const attackType = /^HasAttackDamageType\(`([^`]+)`\)$/.exec(expr)
  if (attackType) {
    return { op: 'attackType', attackType: groupAt(attackType, 1).toLowerCase(), negate: false }
  }

  return null
}

function matchStatLeaf(expr: string): HeroPredicateAST | null {
  const stat = /^GetStat\(`([A-Za-z_]+)`\)\s*(>=|<=|>|<|==)\s*(\d+)$/.exec(expr)
  if (stat) {
    return {
      op: 'stat',
      stat: groupAt(stat, 1).toLowerCase() as HeroStatKey,
      operator: groupAt(stat, 2) as HeroComparisonOperator,
      value: Number(groupAt(stat, 3)),
    }
  }

  const cooldown = /^base_attack_cooldown\s*(>=|<=|>|<|==)\s*(\d+(?:\.\d+)?)$/.exec(expr)
  if (cooldown) {
    return {
      op: 'baseAttackCooldown',
      operator: groupAt(cooldown, 1) as HeroComparisonOperator,
      value: Number(groupAt(cooldown, 2)),
    }
  }

  const age = /^age\s*(>=|<=|>|<|==)\s*(\d+)$/.exec(expr)
  if (age) {
    return {
      op: 'age',
      operator: groupAt(age, 1) as HeroComparisonOperator,
      value: Number(groupAt(age, 2)),
    }
  }

  const heroIdEq = /^hero_id\s*==\s*(\d+)$/.exec(expr)
  if (heroIdEq) {
    return { op: 'heroId', heroId: groupAt(heroIdEq, 1), negate: false }
  }

  const heroIdNeq = /^hero_id\s*!=\s*(\d+)$/.exec(expr)
  if (heroIdNeq) {
    return { op: 'heroId', heroId: groupAt(heroIdNeq, 1), negate: true }
  }

  return null
}

function matchFunctionalLeaf(expr: string): HeroPredicateAST | null {
  if (expr === 'true') return { op: 'true' }

  // is_alive：稳态模型恒 true（planner 不建模战斗死亡）；!is_alive 恒 false。
  if (expr === 'is_alive') return { op: 'isAlive' }

  const asInt = /^as_int\((.+)\)$/.exec(expr)
  if (asInt) {
    return parseHeroPredicate(groupAt(asInt, 1), 'functional')
  }

  return matchSaveDependentLeaf(expr) ?? matchTagLeaf(expr) ?? matchStatLeaf(expr)
}

/** Parse OR/AND composite; returns null if not a composite or any child unparseable. */
function parseComposite(
  expr: string,
  dialect: HeroPredicateDialect,
  delimiter: string,
  op: 'or' | 'and',
): HeroPredicateAST | null {
  const parts = splitTopLevel(expr, delimiter)
  if (parts.length <= 1) return null

  const children = parts.map((part) => parseHeroPredicate(part, dialect))
  if (children.some((node) => node === null)) return null

  const nodes = children.filter((node): node is HeroPredicateAST => node !== null)
  if (nodes.length === 1) {
    const [only] = nodes
    return only ?? { op, children: nodes }
  }
  return { op, children: nodes }
}

export function parseHeroPredicate(expr: unknown, dialect: HeroPredicateDialect): HeroPredicateAST | null {
  if (typeof expr !== 'string') return null

  const trimmed = expr.trim()
  if (!trimmed) return null

  const stripped = stripOuterParentheses(trimmed)
  if (stripped !== trimmed) return parseHeroPredicate(stripped, dialect)

  if (dialect === 'functional') {
    const leaf = matchFunctionalLeaf(stripped)
    if (leaf !== null) return leaf
  }

  // OR（低优先级先 split）。任一子句不可解析 → 整体 null（保守，避免部分解析导致语义偏移）。
  const orDelimiter = dialect === 'functional' ? FUNCTIONAL_OR : SHORTHAND_OR
  const orNode = parseComposite(stripped, dialect, orDelimiter, 'or')
  if (orNode !== null) return orNode

  // AND。任一子句不可解析 → 整体 null（保守，避免丢弃导致放宽语义）。
  const andDelimiter = dialect === 'functional' ? FUNCTIONAL_AND : SHORTHAND_AND
  const andNode = parseComposite(stripped, dialect, andDelimiter, 'and')
  if (andNode !== null) return andNode

  // NOT（前缀 !）
  if (stripped.startsWith('!')) {
    const child = parseHeroPredicate(stripped.slice(1), dialect)
    return child !== null ? { op: 'not', child } : null
  }

  // shorthand：剩余整体视为单个 tag
  if (dialect === 'shorthand') {
    return { op: 'tag', tag: stripped.toLowerCase() }
  }

  // functional：未匹配叶子且非 OR/AND/NOT → 数值表达式等，返回 null
  return null
}

function evalUpgradeUnlocked(ast: HeroPredicateAST, hero: ResolvedHeroAbilityProfile): boolean {
  if (ast.op !== 'upgradeUnlocked') return false
  // build 未解析（ownerHeroId/requiredLevel 缺）或无存档上下文 → false（保守）。
  if (ast.requiredLevel === undefined || ast.ownerHeroId === undefined) return false
  const ownerLevel = hero.ownedSaveContext?.ownedLevels.get(ast.ownerHeroId)
  return typeof ownerLevel === 'number' && ownerLevel >= ast.requiredLevel
}

function evalUpgradePurchased(ast: HeroPredicateAST, hero: ResolvedHeroAbilityProfile): boolean {
  if (ast.op !== 'upgradePurchased') return false
  if (ast.ownerHeroId === undefined) return false
  // specialization → 玩家是否选了这个专精（owner.specializations 含 N）。
  if (ast.isSpecialization === true) {
    return hero.ownedSaveContext?.ownedSpecializations.get(ast.ownerHeroId)?.has(ast.upgradeId) ?? false
  }
  // regular → owner 等级 >= requiredLevel（同 GetUpgradeUnlocked，owned 英雄升级即自动购买）。
  if (ast.requiredLevel === undefined) return false
  const ownerLevel = hero.ownedSaveContext?.ownedLevels.get(ast.ownerHeroId)
  return typeof ownerLevel === 'number' && ownerLevel >= ast.requiredLevel
}

function evalEligibleForPatron(hero: ResolvedHeroAbilityProfile): boolean {
  const patronId = hero.ownedSaveContext?.currentPatronId
  if (patronId === undefined || patronId === null) return false // 未导入存档 → 无 patron 上下文，保守 false
  if (patronId === 0) return true // 自由玩（无 patron 限制）→ 全 eligible
  return hero.eligiblePatronIds?.includes(String(patronId)) ?? false
}

function evalNode(
  ast: HeroPredicateAST,
  hero: ResolvedHeroAbilityProfile,
  tags: Set<string>,
  attackTypes: Set<string>,
): boolean {
  switch (ast.op) {
    case 'or':
      return ast.children.some((child) => evalNode(child, hero, tags, attackTypes))
    case 'and':
      return ast.children.every((child) => evalNode(child, hero, tags, attackTypes))
    case 'not':
      return !evalNode(ast.child, hero, tags, attackTypes)
    case 'tag':
      return tags.has(ast.tag)
    case 'stat':
      return compareNumber(getHeroStatValue(hero, ast.stat), ast.operator, ast.value)
    case 'age':
      return compareNumber(hero.age, ast.operator, ast.value)
    case 'heroId': {
      const equal = String(hero.heroId) === ast.heroId
      return ast.negate ? !equal : equal
    }
    case 'attackType': {
      const has = attackTypes.has(ast.attackType)
      return ast.negate ? !has : has
    }
    case 'baseAttackCooldown':
      return compareNumber(hero.baseAttackCooldown, ast.operator, ast.value)
    case 'upgradeUnlocked':
      return evalUpgradeUnlocked(ast, hero)
    case 'upgradePurchased':
      return evalUpgradePurchased(ast, hero)
    case 'featEquipped':
      // 被评估英雄是否装备 feat N；无存档上下文 → false（未拥有/未装备不可能命中）。
      return hero.ownedSaveContext?.equippedFeatIds.has(ast.featId) ?? false
    case 'isAlive':
      // 稳态模型：所有英雄存活（planner 不建模战斗死亡）。
      return true
    case 'eligibleForPatron':
      return evalEligibleForPatron(hero)
    case 'true':
      return true
    default:
      return false
  }
}

export function evalHeroPredicate(ast: HeroPredicateAST, hero: ResolvedHeroAbilityProfile): boolean {
  const tags = new Set(
    hero.tags
      .filter((tag): tag is string => typeof tag === 'string')
      .map((tag) => tag.toLowerCase()),
  )
  const attackTypes = new Set(
    hero.baseAttackDamageTypes
      .filter((value): value is string => typeof value === 'string')
      .map((value) => value.toLowerCase()),
  )
  return evalNode(ast, hero, tags, attackTypes)
}

// 遍历 AST 判断是否含某类节点。覆盖率统计 / reasonCode 分类用。
export function predicateHasNode(
  ast: HeroPredicateAST | null | undefined,
  op: HeroPredicateAST['op'],
): boolean {
  if (!ast) {
    return false
  }
  if (ast.op === op) {
    return true
  }
  if (ast.op === 'or' || ast.op === 'and') {
    return ast.children.some((child) => predicateHasNode(child, op))
  }
  if (ast.op === 'not') {
    return predicateHasNode(ast.child, op)
  }
  return false
}
