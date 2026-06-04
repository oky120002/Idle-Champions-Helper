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

export function buildPlannerAgeQualifier(operator, value, excludedHeroId = null) {
  if (operator === '==') {
    return {
      minAge: value,
      minAgeOperator: '>=',
      maxAge: value,
      maxAgeOperator: '<=',
      ...(excludedHeroId ? { excludedHeroIds: [excludedHeroId] } : {}),
    }
  }

  return {
    ...(operator === '>=' || operator === '>'
      ? { minAge: value, minAgeOperator: operator }
      : { maxAge: value, maxAgeOperator: operator }),
    ...(excludedHeroId ? { excludedHeroIds: [excludedHeroId] } : {}),
  }
}

export function parsePlannerTagDisjunction(expr) {
  const clauses = splitTopLevel(stripOuterParentheses(expr), '||')
  if (clauses.length === 0) {
    return null
  }

  const tags = clauses.map((clause) => {
    const match = stripOuterParentheses(clause).match(/^HasTag\(`([^`]+)`\)$/)
    return match ? match[1] : null
  })

  if (tags.some((tag) => !tag)) {
    return null
  }

  return {
    requiredTags: [...new Set(tags)],
    matchMode: 'any',
  }
}

function mergePlannerTagRequirements(leftQualifier, rightQualifier) {
  const leftTags = leftQualifier.requiredTags ?? []
  const rightTags = rightQualifier.requiredTags ?? []
  if (leftTags.length === 0) {
    return rightTags.length > 0
      ? { requiredTags: rightTags, matchMode: rightQualifier.matchMode ?? 'any' }
      : {}
  }

  if (rightTags.length === 0) {
    return { requiredTags: leftTags, matchMode: leftQualifier.matchMode ?? 'any' }
  }

  const leftMode = leftQualifier.matchMode ?? 'any'
  const rightMode = rightQualifier.matchMode ?? 'any'
  const leftIsSingleTag = leftTags.length === 1
  const rightIsSingleTag = rightTags.length === 1

  if (leftMode === 'all' && rightMode === 'all') {
    return {
      requiredTags: [...new Set([...leftTags, ...rightTags])],
      matchMode: 'all',
    }
  }

  if ((leftMode === 'all' && rightIsSingleTag) || (rightMode === 'all' && leftIsSingleTag)) {
    return {
      requiredTags: [...new Set([...leftTags, ...rightTags])],
      matchMode: 'all',
    }
  }

  if (leftIsSingleTag && rightIsSingleTag) {
    return {
      requiredTags: [...new Set([...leftTags, ...rightTags])],
      matchMode: 'all',
    }
  }

  if (
    leftMode === rightMode
    && leftTags.length === rightTags.length
    && leftTags.every((tag) => rightTags.includes(tag))
  ) {
    return {
      requiredTags: leftTags,
      matchMode: leftMode,
    }
  }

  return null
}

function chooseStricterLowerAgeBound(leftValue, leftOperator, rightValue, rightOperator) {
  if (
    (leftValue === null || leftValue === undefined)
    && (rightValue === null || rightValue === undefined)
  ) {
    return {}
  }

  if (leftValue === null || leftValue === undefined) {
    return { minAge: rightValue, minAgeOperator: rightOperator }
  }

  if (rightValue === null || rightValue === undefined) {
    return { minAge: leftValue, minAgeOperator: leftOperator }
  }

  if (rightValue > leftValue) {
    return { minAge: rightValue, minAgeOperator: rightOperator }
  }

  if (rightValue < leftValue) {
    return { minAge: leftValue, minAgeOperator: leftOperator }
  }

  return {
    minAge: leftValue,
    minAgeOperator: leftOperator === '>' || rightOperator === '>' ? '>' : '>=',
  }
}

function chooseStricterUpperAgeBound(leftValue, leftOperator, rightValue, rightOperator) {
  if (
    (leftValue === null || leftValue === undefined)
    && (rightValue === null || rightValue === undefined)
  ) {
    return {}
  }

  if (leftValue === null || leftValue === undefined) {
    return { maxAge: rightValue, maxAgeOperator: rightOperator }
  }

  if (rightValue === null || rightValue === undefined) {
    return { maxAge: leftValue, maxAgeOperator: leftOperator }
  }

  if (rightValue < leftValue) {
    return { maxAge: rightValue, maxAgeOperator: rightOperator }
  }

  if (rightValue > leftValue) {
    return { maxAge: leftValue, maxAgeOperator: leftOperator }
  }

  return {
    maxAge: leftValue,
    maxAgeOperator: leftOperator === '<' || rightOperator === '<' ? '<' : '<=',
  }
}

export function mergePlannerHeroQualifiers(leftQualifier, rightQualifier) {
  const mergedTagRequirements = mergePlannerTagRequirements(leftQualifier, rightQualifier)
  if (mergedTagRequirements === null) {
    return null
  }

  const leftRequiredBaseAttackCooldown = leftQualifier.requiredBaseAttackCooldown
  const rightRequiredBaseAttackCooldown = rightQualifier.requiredBaseAttackCooldown
  if (
    leftRequiredBaseAttackCooldown
    && rightRequiredBaseAttackCooldown
    && JSON.stringify(leftRequiredBaseAttackCooldown) !== JSON.stringify(rightRequiredBaseAttackCooldown)
  ) {
    return null
  }

  const leftRequiredAttackDamageTypes = leftQualifier.requiredAttackDamageTypes ?? []
  const rightRequiredAttackDamageTypes = rightQualifier.requiredAttackDamageTypes ?? []
  if (
    leftRequiredAttackDamageTypes.length > 0
    && rightRequiredAttackDamageTypes.length > 0
    && JSON.stringify(leftRequiredAttackDamageTypes) !== JSON.stringify(rightRequiredAttackDamageTypes)
  ) {
    return null
  }

  const lowerAgeBound = chooseStricterLowerAgeBound(
    leftQualifier.minAge,
    leftQualifier.minAgeOperator ?? '>=',
    rightQualifier.minAge,
    rightQualifier.minAgeOperator ?? '>=',
  )
  const upperAgeBound = chooseStricterUpperAgeBound(
    leftQualifier.maxAge,
    leftQualifier.maxAgeOperator ?? '<=',
    rightQualifier.maxAge,
    rightQualifier.maxAgeOperator ?? '<=',
  )

  return {
    ...mergedTagRequirements,
    ...((leftQualifier.excludedTags?.length ?? 0) > 0 || (rightQualifier.excludedTags?.length ?? 0) > 0
      ? { excludedTags: [...new Set([...(leftQualifier.excludedTags ?? []), ...(rightQualifier.excludedTags ?? [])])] }
      : {}),
    ...((leftQualifier.requiredStats?.length ?? 0) > 0 || (rightQualifier.requiredStats?.length ?? 0) > 0
      ? { requiredStats: [...(leftQualifier.requiredStats ?? []), ...(rightQualifier.requiredStats ?? [])] }
      : {}),
    ...(leftRequiredBaseAttackCooldown || rightRequiredBaseAttackCooldown
      ? {
          requiredBaseAttackCooldown: leftRequiredBaseAttackCooldown ?? rightRequiredBaseAttackCooldown,
        }
      : {}),
    ...(leftRequiredAttackDamageTypes.length > 0 || rightRequiredAttackDamageTypes.length > 0
      ? {
          requiredAttackDamageTypes: leftRequiredAttackDamageTypes.length > 0
            ? leftRequiredAttackDamageTypes
            : rightRequiredAttackDamageTypes,
        }
      : {}),
    ...((leftQualifier.excludedAttackDamageTypes?.length ?? 0) > 0 || (rightQualifier.excludedAttackDamageTypes?.length ?? 0) > 0
      ? {
          excludedAttackDamageTypes: [
            ...new Set([
              ...(leftQualifier.excludedAttackDamageTypes ?? []),
              ...(rightQualifier.excludedAttackDamageTypes ?? []),
            ]),
          ],
        }
      : {}),
    ...lowerAgeBound,
    ...upperAgeBound,
    ...((leftQualifier.excludedHeroIds?.length ?? 0) > 0 || (rightQualifier.excludedHeroIds?.length ?? 0) > 0
      ? { excludedHeroIds: [...new Set([...(leftQualifier.excludedHeroIds ?? []), ...(rightQualifier.excludedHeroIds ?? [])])] }
      : {}),
  }
}

export function splitPlannerExprAtTopLevel(expr, delimiter) {
  return splitTopLevel(expr, delimiter)
}

export function stripPlannerExprOuterParentheses(expr) {
  return stripOuterParentheses(expr)
}
