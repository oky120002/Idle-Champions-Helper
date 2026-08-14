import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { I18nProvider } from '../../app/i18n'
import type { Champion, FormationSlot } from '../../domain/types'
import type { DamageSourcePattern } from '../../domain/planner/plannerModel'
import { PlannerDamageSlots } from './PlannerDamageSlots'

const slots: FormationSlot[] = [
  { id: 's1', row: 1, column: 1 },
  { id: 's2', row: 1, column: 2 },
]

const championById = new Map<string, Champion>([
  ['nayeli', { id: 'nayeli', name: { original: 'Nayeli', display: '纳耶里' }, seat: 3, roles: ['tanking'], affiliations: [], tags: [] }],
])

function renderPattern(pattern: DamageSourcePattern | null, locale: 'zh-CN' | 'en-US' = 'zh-CN') {
  localStorage.setItem('idle-champions-helper.locale', locale)
  const referenceHero = pattern == null ? null : championById.get(pattern.referenceHeroId)
  let referenceHeroName: string | null = pattern?.referenceHeroId ?? null
  if (referenceHero != null) {
    referenceHeroName = locale === 'zh-CN' ? referenceHero.name.display : referenceHero.name.original
  }
  return render(
    <I18nProvider>
      <PlannerDamageSlots
        slots={slots}
        disabledSlots={['s2']}
        onToggle={() => {}}
        damageSourcePattern={pattern}
        referenceHeroName={referenceHeroName}
      />
    </I18nProvider>,
  )
}

afterEach(() => {
  localStorage.clear()
})

describe('PlannerDamageSlots', () => {
  it.each([
    ['same-column', '系统解析：核心英雄须与纳耶里同列。'],
    ['adjacent', '系统解析：核心英雄须位于纳耶里相邻槽位（含其自身）。'],
    ['not-adjacent', '系统解析：核心英雄不能位于纳耶里相邻槽位（含其自身）。'],
    ['front-columns', '系统解析：核心英雄须位于纳耶里所在列及前方1列（含所在列）。'],
    ['behind-columns', '系统解析：核心英雄须位于纳耶里所在列及后方2列（含所在列）。'],
  ] as const)('%s 模式展示系统解析的位置规则', (kind, expected) => {
    renderPattern({ kind, referenceHeroId: 'nayeli', ...(kind === 'front-columns' ? { columnSpan: 1 } : {}), ...(kind === 'behind-columns' ? { columnSpan: 2 } : {}) })

    expect(screen.getByText(expected)).toBeInTheDocument()
    expect(screen.getByTestId('planner-damage-slot-toggle-s2')).toHaveAttribute('data-disabled', 'true')
  })

  it('缺失参考英雄时回退显示英雄 id', () => {
    renderPattern({ kind: 'same-column', referenceHeroId: 'missing-hero' })

    expect(screen.getByText('系统解析：核心英雄须与missing-hero同列。')).toBeInTheDocument()
  })

  it('未提供列跨度时使用模式默认值，并对无效跨度回退到默认值', () => {
    const { rerender } = renderPattern({ kind: 'front-columns', referenceHeroId: 'nayeli' })
    expect(screen.getByText('系统解析：核心英雄须位于纳耶里所在列及前方2列（含所在列）。')).toBeInTheDocument()

    rerender(
      <I18nProvider>
        <PlannerDamageSlots
          slots={slots}
          disabledSlots={[]}
          onToggle={() => {}}
          damageSourcePattern={{ kind: 'behind-columns', referenceHeroId: 'nayeli', columnSpan: 0 }}
          referenceHeroName="纳耶里"
        />
      </I18nProvider>,
    )
    expect(screen.getByText('系统解析：核心英雄须位于纳耶里所在列及后方1列（含所在列）。')).toBeInTheDocument()
  })

  it('英文界面使用中央字典，不直出中文文案', () => {
    renderPattern({ kind: 'same-column', referenceHeroId: 'nayeli' }, 'en-US')

    expect(screen.getByText('System parsed: the carry must be in the same column as Nayeli.')).toBeInTheDocument()
    expect(screen.queryByText('系统解析：核心英雄须与 纳耶里 同列。')).toBeNull()
  })
})
