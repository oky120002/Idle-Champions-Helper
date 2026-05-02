export interface VariantConstraint {
  kind: 'allowList' | 'banList' | 'forceInclude'
  heroIds: string[]
}

export interface VariantRuleResult {
  constraints: VariantConstraint[]
  warnings: string[]
}

interface VariantRule {
  type: string
  heroes?: string[]
  [key: string]: unknown
}

const RULE_TYPE_MAP: Record<string, VariantConstraint['kind']> = {
  only_allow_crusaders: 'allowList',
  disallow_crusaders: 'banList',
  force_use_heroes: 'forceInclude',
}

export function projectVariantRules(rules: VariantRule[]): VariantRuleResult {
  const constraints: VariantConstraint[] = []
  const warnings: string[] = []

  for (const rule of rules) {
    const mappedKind = RULE_TYPE_MAP[rule.type]

    if (mappedKind) {
      constraints.push({
        kind: mappedKind,
        heroIds: rule.heroes ?? [],
      })
    } else {
      warnings.push(`Unknown variant mechanic: ${rule.type}`)
    }
  }

  return { constraints, warnings }
}
