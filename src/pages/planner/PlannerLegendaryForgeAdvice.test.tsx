import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { I18nProvider } from '../../app/i18n'
import type { ResolvedHeroAbilityProfile } from '../../domain/abilities/abilityModel'
import { PlannerLegendaryForgeAdvice } from './PlannerLegendaryForgeAdvice'

function hero(heroId: string, name: string): ResolvedHeroAbilityProfile {
  return {
    heroId,
    name: { original: name, display: name },
    seat: 1,
    roles: [],
    tags: ['human'],
    baseAttackDamageTypes: [],
    baseAttackCooldown: 1,
    age: null,
    abilityScores: {},
    baseDamage: 1,
    baseHealth: 1,
    carrySignals: [],
    supportSignals: [],
    unsupportedSignals: [],
    sourceBreakdown: { carrySignals: [], supportSignals: [], unsupportedSignals: [] },
  }
}

describe('PlannerLegendaryForgeAdvice', () => {
  it('renders the top forge candidate from the current formation', () => {
    render(
      <I18nProvider>
        <PlannerLegendaryForgeAdvice
          heroes={[hero('a', 'A'), hero('b', 'B')]}
          placements={{ s1: 'a' }}
          catalog={[{
            id: 'legendary-a',
            effectString: 'global_dps_multiplier_mult,20',
            stackFunc: null,
            targetFilters: null,
            filterTargets: null,
            heroIds: ['a'],
          }]}
        />
      </I18nProvider>,
    )
    expect(screen.getByText('A')).toBeInTheDocument()
    expect(screen.getByText(/预计 \+20%/)).toBeInTheDocument()
  })
})
