import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { PlannerComputeRunner } from '../../domain/planner/compute/plannerCompute'
import type { FormationEvaluation, PlannerRecommendationOptions } from '../../domain/planner/recommendationEngine'
import type { PlannerCollections, PlannerRecommendation } from '../../domain/planner/recommendationTypes'
import { unwrap } from '../../../tests/utils/dom-assertions'
import { usePlannerEvaluation, usePlannerRecommendation } from './usePlannerCompute'

const collections: PlannerCollections = {
  variants: [],
  plannerHeroes: [{ heroId: 'h1' } as never],
  plannerScenarios: [],
}
const variant = { id: 'v1' } as never

const emptyRec: PlannerRecommendation = {
  result: null,
  results: [],
  layoutId: null,
  slots: [],
  scenarioRef: null,
  blocker: null,
}

interface ControllableRunner {
  runner: PlannerComputeRunner
  resolveRecommend: (index: number, value: PlannerRecommendation) => void
}

function createControllableRunner(): ControllableRunner {
  const recommendResolvers: Array<(value: PlannerRecommendation) => void> = []
  const runner = {
    updateCollections: vi.fn(),
    recommend: vi.fn(() => new Promise<PlannerRecommendation>((resolve) => recommendResolvers.push(resolve))),
    evaluate: vi.fn(() => Promise.resolve({} as FormationEvaluation)),
    convertGoldLevel: vi.fn(() => Promise.resolve({ heroes: [], maxGold: '0' })),
    dispose: vi.fn(),
  }
  return {
    runner,
    resolveRecommend: (index, value) => {
      const resolver = unwrap(recommendResolvers.at(index), `resolver at ${String(index)} missing`)
      resolver(value)
    },
  }
}

afterEach(() => vi.useRealTimers())

describe('usePlannerRecommendation', () => {
  it('collections 变 → runner.updateCollections 调用', () => {
    const { runner } = createControllableRunner()
    renderHook(() => usePlannerRecommendation(runner, collections, variant, null, {}))
    expect(runner.updateCollections).toHaveBeenCalledWith(collections)
  })

  it('enabled 后 loading=true，debounce 后 recommend 调用，resolve 后 result 更新 loading=false', async () => {
    vi.useFakeTimers()
    const { runner, resolveRecommend } = createControllableRunner()
    const options: PlannerRecommendationOptions = {}
    const { result } = renderHook(() => usePlannerRecommendation(runner, collections, variant, null, options))

    expect(result.current.loading).toBe(true)
    expect(result.current.result).toBeNull()
    expect(runner.recommend).not.toHaveBeenCalled()

    await act(async () => { await vi.advanceTimersByTimeAsync(150) })
    expect(runner.recommend).toHaveBeenCalledTimes(1)

    await act(async () => resolveRecommend(0, emptyRec))
    expect(result.current.result).toEqual(emptyRec)
    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBeNull()
  })

  it('未 enabled（无 variant）→ result null, loading false, 不调 recommend', async () => {
    vi.useFakeTimers()
    const { runner } = createControllableRunner()
    const { result } = renderHook(() => usePlannerRecommendation(runner, collections, null, null, {}))

    expect(result.current.loading).toBe(false)
    expect(result.current.result).toBeNull()

    await act(async () => { await vi.advanceTimersByTimeAsync(300) })
    expect(runner.recommend).not.toHaveBeenCalled()
  })

  it('连续改 options → 旧回包丢弃，只接受最新 requestId 结果', async () => {
    vi.useFakeTimers()
    const { runner, resolveRecommend } = createControllableRunner()
    const rec1: PlannerRecommendation = { ...emptyRec, blocker: 'missing-profile' }
    const rec2: PlannerRecommendation = { ...emptyRec, blocker: null }

    const { result, rerender } = renderHook(
      ({ options }: { options: PlannerRecommendationOptions }) =>
        usePlannerRecommendation(runner, collections, variant, null, options),
      { initialProps: { options: { scoringMode: 'carry-dps' } } },
    )

    await act(async () => { await vi.advanceTimersByTimeAsync(150) })
    expect(runner.recommend).toHaveBeenCalledTimes(1)

    rerender({ options: { scoringMode: 'team-gold' } })
    await act(async () => { await vi.advanceTimersByTimeAsync(150) })
    expect(runner.recommend).toHaveBeenCalledTimes(2)

    // 先回第二次（最新 requestId）→ 生效
    await act(async () => resolveRecommend(1, rec2))
    expect(result.current.result).toEqual(rec2)

    // 再回第一次（旧 requestId）→ 不覆盖
    await act(async () => resolveRecommend(0, rec1))
    expect(result.current.result).toEqual(rec2)
  })

  it('recommend reject → error 状态、loading=false', async () => {
    vi.useFakeTimers()
    const runner = {
      updateCollections: vi.fn(),
      recommend: vi.fn(() => Promise.reject(new Error('worker boom'))),
      evaluate: vi.fn(),
      dispose: vi.fn(),
    } as unknown as PlannerComputeRunner
    const options: PlannerRecommendationOptions = {}
    const { result } = renderHook(() => usePlannerRecommendation(runner, collections, variant, null, options))

    await act(async () => { await vi.advanceTimersByTimeAsync(150) })
    expect(result.current.error).toBe('worker boom')
    expect(result.current.loading).toBe(false)
  })
})

describe('usePlannerEvaluation', () => {
  it('enabled 后 debounce 调 evaluate，resolve 后 result 更新', async () => {
    vi.useFakeTimers()
    const fakeEval = { result: null, layoutId: null, slots: [], scenarioRef: null, blocker: null } as FormationEvaluation
    const runner = {
      updateCollections: vi.fn(),
      recommend: vi.fn(),
      evaluate: vi.fn(() => Promise.resolve(fakeEval)),
      dispose: vi.fn(),
    } as unknown as PlannerComputeRunner

    const options: PlannerRecommendationOptions = {}
    const placements = {}
    const { result } = renderHook(() => usePlannerEvaluation(runner, collections, variant, null, placements, options))
    expect(result.current.loading).toBe(true)

    await act(async () => { await vi.advanceTimersByTimeAsync(150) })
    expect(runner.evaluate).toHaveBeenCalledTimes(1)
    expect(result.current.result).toEqual(fakeEval)
    expect(result.current.loading).toBe(false)
  })
})
