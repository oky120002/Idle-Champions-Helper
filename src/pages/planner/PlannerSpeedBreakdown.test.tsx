import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { I18nProvider } from '../../app/i18n'
import type { SpeedBreakdown } from '../../domain/planner/speedScoring'
import { PlannerSpeedBreakdown } from './PlannerSpeedBreakdown'

function buildBreakdown(overrides: Partial<SpeedBreakdown> = {}): SpeedBreakdown {
  return {
    total: 3.75,
    categoryFactors: [
      { category: 'spawnSpeed', factor: 2 },
      { category: 'questProgress', factor: 1.5 },
      { category: 'timeScale', factor: 1.25 },
    ],
    heroContributions: [
      {
        heroId: 'deekin',
        effects: [{ category: 'spawnSpeed', value: 100, rawEffect: 'test_spawn' }],
      },
      {
        heroId: 'havilar',
        effects: [{ category: 'questProgress', value: 50, multiplier: 2, rawEffect: 'test_quest' }],
      },
    ],
    ...overrides,
  }
}

describe('PlannerSpeedBreakdown', () => {
  it('breakdown 为 null 时不渲染', () => {
    const { container } = render(
      <I18nProvider>
        <PlannerSpeedBreakdown breakdown={null} heroNameById={new Map()} />
      </I18nProvider>,
    )
    expect(container.querySelector('[data-section="speed-breakdown"]')).toBeNull()
  })

  it('展示总速度因子', () => {
    render(
      <I18nProvider>
        <PlannerSpeedBreakdown breakdown={buildBreakdown()} heroNameById={new Map()} />
      </I18nProvider>,
    )
    const total = screen.getByTestId('planner-speed-breakdown-total')
    expect(total.textContent).toContain('3.75')
  })

  it('展示各类别因子，使用中文标签', () => {
    render(
      <I18nProvider>
        <PlannerSpeedBreakdown breakdown={buildBreakdown()} heroNameById={new Map()} />
      </I18nProvider>,
    )
    // spawnSpeed → 刷新加速（factor 列表 + hero 贡献均出现）
    const spawnLabels = screen.getAllByText('刷新加速')
    expect(spawnLabels.length).toBeGreaterThanOrEqual(1)
    // questProgress → 任务倍增（factor 列表 + hero 贡献均出现）
    const questLabels = screen.getAllByText('任务倍增')
    expect(questLabels.length).toBeGreaterThanOrEqual(1)
    // timeScale → 时间加速（仅 factor 列表）
    expect(screen.getByText('时间加速')).toBeInTheDocument()
    // 技术名不直出
    expect(screen.queryByText('spawnSpeed')).toBeNull()
    expect(screen.queryByText('questProgress')).toBeNull()
  })

  it('按英雄列出速度贡献，使用 heroNameById 解析名字', () => {
    render(
      <I18nProvider>
        <PlannerSpeedBreakdown
          breakdown={buildBreakdown()}
          heroNameById={new Map([['deekin', '迪肯'], ['havilar', '哈维拉']])}
        />
      </I18nProvider>,
    )
    expect(screen.getByText('迪肯')).toBeInTheDocument()
    expect(screen.getByText('哈维拉')).toBeInTheDocument()
  })

  it('heroContributions 为空时不渲染贡献区块', () => {
    const { container } = render(
      <I18nProvider>
        <PlannerSpeedBreakdown breakdown={buildBreakdown({ heroContributions: [] })} heroNameById={new Map()} />
      </I18nProvider>,
    )
    expect(container.querySelector('.planner-breakdown__contributions')).toBeNull()
    expect(container.querySelector('.planner-breakdown__sources-title')).toBeNull()
  })

  it('值为 1 的因子不渲染（仅展示非平凡因子）', () => {
    render(
      <I18nProvider>
        <PlannerSpeedBreakdown breakdown={buildBreakdown()} heroNameById={new Map()} />
      </I18nProvider>,
    )
    // factor 2.0 and 1.5 and 1.25 present
    expect(screen.getByText('×2.00')).toBeInTheDocument()
    expect(screen.getByText('×1.50')).toBeInTheDocument()
    expect(screen.getByText('×1.25')).toBeInTheDocument()
    // no ×1.00 noise
    expect(screen.queryByText('×1.00')).toBeNull()
  })

  it('questProgress multiply 效果展示 chance% ×mult 格式', () => {
    render(
      <I18nProvider>
        <PlannerSpeedBreakdown
          breakdown={buildBreakdown()}
          heroNameById={new Map([['deekin', '迪肯'], ['havilar', '哈维拉']])}
        />
      </I18nProvider>,
    )
    // Havilar: 50% ×2
    expect(screen.getByText('50% ×2')).toBeInTheDocument()
  })

  it('spawnSpeed 效果展示 +value% 格式', () => {
    render(
      <I18nProvider>
        <PlannerSpeedBreakdown
          breakdown={buildBreakdown()}
          heroNameById={new Map([['deekin', '迪肯'], ['havilar', '哈维拉']])}
        />
      </I18nProvider>,
    )
    // Deekin: +100%
    expect(screen.getByText('+100%')).toBeInTheDocument()
  })
})
