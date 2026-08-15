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
    ['adjacent', '系统解析：核心英雄须位于纳耶里相邻槽位（含参考英雄自身）。'],
    ['not-adjacent', '系统解析：核心英雄不能位于纳耶里相邻槽位（含参考英雄自身）。'],
    ['front-columns', '系统解析：核心英雄须位于纳耶里前方1列（含参考英雄自身）。'],
    ['behind-columns', '系统解析：核心英雄须位于纳耶里后方2列（含参考英雄自身）。'],
  ] as const)('%s 模式展示系统解析的位置规则', (kind, expected) => {
    renderPattern({ kind, referenceHeroId: 'nayeli', includeReference: true, ...(kind === 'front-columns' ? { columnSpan: 1 } : {}), ...(kind === 'behind-columns' ? { columnSpan: 2 } : {}) })

    expect(screen.getByText(expected)).toBeInTheDocument()
    expect(screen.getByTestId('planner-damage-slot-toggle-s2')).toHaveAttribute('data-disabled', 'true')
  })

  it('缺失参考英雄时回退显示英雄 id', () => {
    renderPattern({ kind: 'same-column', referenceHeroId: 'missing-hero', includeReference: true })

    expect(screen.getByText('系统解析：核心英雄须与missing-hero同列。')).toBeInTheDocument()
  })

  it('展示拓扑最短路径范围与参考英雄是否包含', () => {
    renderPattern({ kind: 'within-slots', referenceHeroId: 'nayeli', slotSpan: 2, includeReference: false })

    expect(screen.getByText('系统解析：核心英雄须位于纳耶里2格以内（不含参考英雄自身）。')).toBeInTheDocument()
  })

  it('未提供列跨度时使用模式默认值，并对无效跨度回退到默认值', () => {
    const { rerender } = renderPattern({ kind: 'front-columns', referenceHeroId: 'nayeli', includeReference: true })
    expect(screen.getByText('系统解析：核心英雄须位于纳耶里前方2列（含参考英雄自身）。')).toBeInTheDocument()

    rerender(
      <I18nProvider>
        <PlannerDamageSlots
          slots={slots}
          disabledSlots={[]}
          onToggle={() => {}}
          damageSourcePattern={{ kind: 'behind-columns', referenceHeroId: 'nayeli', columnSpan: 0, includeReference: true }}
          referenceHeroName="纳耶里"
        />
      </I18nProvider>,
    )
    expect(screen.getByText('系统解析：核心英雄须位于纳耶里后方1列（含参考英雄自身）。')).toBeInTheDocument()
  })

  it('英文界面使用中央字典，不直出中文文案', () => {
    renderPattern({ kind: 'same-column', referenceHeroId: 'nayeli', includeReference: true }, 'en-US')

    expect(screen.getByText('System parsed: the carry must be in the same column as Nayeli.')).toBeInTheDocument()
    expect(screen.queryByText('系统解析：核心英雄须与 纳耶里 同列。')).toBeNull()
  })
})
