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

const SHORTHAND_OR = '|'
const SHORTHAND_AND = '^'
const FUNCTIONAL_OR = '||'
const FUNCTIONAL_AND = '&&'

function stripOuterParentheses(expr) {
  let current = expr.trim()

  while (current.startsWith('(') && current.endsWith(')')) {
    let depth = 0
    let wrapsWholeExpr = true

    for (let index = 0; index < current.length; index += 1) {
      const char = current[index]
      if (char === '(') {
        depth += 1
      } else if (char === ')') {
        depth -= 1
        if (depth === 0 && index < current.length - 1) {
          wrapsWholeExpr = false
          break
        }
      }

      if (depth < 0) {
        wrapsWholeExpr = false
        break
      }
    }

    if (!wrapsWholeExpr || depth !== 0) {
      break
    }

    current = current.slice(1, -1).trim()
  }

  return current
}

function splitTopLevel(expr, delimiter) {
  const parts = []
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

function compareNumber(left, operator, right) {
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

function getHeroStatValue(hero, stat) {
  if (stat === 'total_ability_score') {
    return Object.values(hero.abilityScores ?? {}).reduce(
      (sum, value) => sum + (typeof value === 'number' ? value : 0),
      0,
    )
  }

  return hero.abilityScores[stat]
}

// functional 叶子：HasTag/GetStat/age/hero_id/HasAttackDamageType/base_attack_cooldown/is_undead/true/as_int。
// 非 boolean 叶子（min/max/floor 等数值表达式）返回 null。
function matchFunctionalLeaf(expr) {
  if (expr === 'true') {
    return { op: 'true' }
  }

  if (expr === 'is_undead') {
    return { op: 'tag', tag: 'undead' }
  }

  const asIntMatch = expr.match(/^as_int\((.+)\)$/)
  if (asIntMatch) {
    return parseHeroPredicate(asIntMatch[1], 'functional')
  }

  const attackDamageTypeMatch = expr.match(/^HasAttackDamageType\(`([^`]+)`\)$/)
  if (attackDamageTypeMatch) {
    return { op: 'attackType', attackType: attackDamageTypeMatch[1].toLowerCase(), negate: false }
  }

  const tagMatch = expr.match(/^HasTag\(`([^`]+)`\)$/)
  if (tagMatch) {
    return { op: 'tag', tag: tagMatch[1].toLowerCase() }
  }

  const statMatch = expr.match(/^GetStat\(`([A-Za-z_]+)`\)\s*(>=|<=|>|<|==)\s*(\d+)$/)
  if (statMatch) {
    return { op: 'stat', stat: statMatch[1].toLowerCase(), operator: statMatch[2], value: Number(statMatch[3]) }
  }

  const baseAttackCooldownMatch = expr.match(/^base_attack_cooldown\s*(>=|<=|>|<|==)\s*(\d+(?:\.\d+)?)$/)
  if (baseAttackCooldownMatch) {
    return { op: 'baseAttackCooldown', operator: baseAttackCooldownMatch[1], value: Number(baseAttackCooldownMatch[2]) }
  }

  const ageMatch = expr.match(/^age\s*(>=|<=|>|<|==)\s*(\d+)$/)
  if (ageMatch) {
    return { op: 'age', operator: ageMatch[1], value: Number(ageMatch[2]) }
  }

  const heroIdEqMatch = expr.match(/^hero_id\s*==\s*([0-9]+)$/)
  if (heroIdEqMatch) {
    return { op: 'heroId', heroId: heroIdEqMatch[1], negate: false }
  }

  const heroIdNeqMatch = expr.match(/^hero_id\s*!=\s*([0-9]+)$/)
  if (heroIdNeqMatch) {
    return { op: 'heroId', heroId: heroIdNeqMatch[1], negate: true }
  }

  return null
}

export function parseHeroPredicate(expr, dialect) {
  if (typeof expr !== 'string') {
    return null
  }

  const trimmed = expr.trim()
  if (!trimmed) {
    return null
  }

  const stripped = stripOuterParentheses(trimmed)
  if (stripped !== trimmed) {
    return parseHeroPredicate(stripped, dialect)
  }

  if (dialect === 'functional') {
    const leaf = matchFunctionalLeaf(stripped)
    if (leaf !== null) {
      return leaf
    }
  }

  // OR（低优先级先 split）。任一子句不可解析 → 整体 null（保守，避免部分解析导致语义偏移）。
  const orDelimiter = dialect === 'functional' ? FUNCTIONAL_OR : SHORTHAND_OR
  const orParts = splitTopLevel(stripped, orDelimiter)
  if (orParts.length > 1) {
    const children = orParts.map((part) => parseHeroPredicate(part, dialect))
    if (children.some((node) => node === null)) {
      return null
    }
    return children.length === 1 ? children[0] : { op: 'or', children }
  }

  // AND。任一子句不可解析 → 整体 null（保守，避免丢弃导致放宽语义）。
  const andDelimiter = dialect === 'functional' ? FUNCTIONAL_AND : SHORTHAND_AND
  const andParts = splitTopLevel(stripped, andDelimiter)
  if (andParts.length > 1) {
    const children = andParts.map((part) => parseHeroPredicate(part, dialect))
    if (children.some((node) => node === null)) {
      return null
    }
    return children.length === 1 ? children[0] : { op: 'and', children }
  }

  // NOT（前缀 !）
  if (stripped.startsWith('!')) {
    const child = parseHeroPredicate(stripped.slice(1), dialect)
    return child ? { op: 'not', child } : null
  }

  // shorthand：剩余整体视为单个 tag
  if (dialect === 'shorthand') {
    return { op: 'tag', tag: stripped.toLowerCase() }
  }

  // functional：未匹配叶子且非 OR/AND/NOT → 数值表达式等，返回 null
  return null
}

function evalNode(ast, hero, tags, attackTypes) {
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
      if (!compareNumber(hero.age, ast.operator, ast.value)) {
        return false
      }
      if (ast.excludeHeroId && String(hero.heroId) === ast.excludeHeroId) {
        return false
      }
      return true
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
    case 'true':
      return true
    default:
      return false
  }
}

export function evalHeroPredicate(ast, hero) {
  const tags = new Set(
    (hero.tags ?? [])
      .filter((tag) => typeof tag === 'string')
      .map((tag) => tag.toLowerCase()),
  )
  const attackTypes = new Set(
    (hero.baseAttackDamageTypes ?? [])
      .filter((value) => typeof value === 'string')
      .map((value) => value.toLowerCase()),
  )
  return evalNode(ast, hero, tags, attackTypes)
}

// 遍历 AST 判断是否含某类节点。覆盖率统计 / reasonCode 分类用。
export function predicateHasNode(ast, op) {
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
