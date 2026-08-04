import { useEffect, useRef, useState } from 'react'

import type { PlannerComputeRunner } from '../../domain/planner/compute/plannerCompute'
import type { FormationEvaluation, PlannerRecommendationOptions } from '../../domain/planner/recommendationEngine'
import type { PlannerCollections, PlannerRecommendation } from '../../domain/planner/recommendationTypes'
import type { Variant } from '../../domain/types'
import type { UserProfileSnapshot } from '../../domain/user-profile/types'

// debounce：合并连续输入（切模式/锁槽），避免 worker 单线程队列堆积。
// worker 无法中断同步计算，靠 debounce 减少无效请求 + requestId 丢弃旧回包。
const PLANNER_COMPUTE_DEBOUNCE_MS = 150

export interface PlannerComputeOutcome<T> {
  result: T | null
  loading: boolean
  error: string | null
}

/**
 * 底层：卸载到 runner（worker / sync）的异步计算 hook。
 * - collections 变 → runner.updateCollections（worker 发 init 缓存）。
 * - deps 变 + enabled → debounce 后计算；requestId 保证只接受最新回包（旧的丢弃）。
 * - enabled false 时不启动计算，result/loading/error 派生为 null/false/null（不在 effect 里同步 setState 清空）。
 * 调用方 memoize options/placements，保证 deps 引用稳定。
 */
function usePlannerCompute<T>(
  runner: PlannerComputeRunner,
  collections: PlannerCollections,
  enabled: boolean,
  compute: () => Promise<T>,
  deps: unknown[],
): PlannerComputeOutcome<T> {
  const [state, setState] = useState<PlannerComputeOutcome<T>>({
    result: null,
    loading: false,
    error: null,
  })
  const requestIdRef = useRef(0)

  useEffect(() => {
    runner.updateCollections(collections)
  }, [runner, collections])

  useEffect(() => {
    if (!enabled) {
      return undefined
    }
    // 标记「计算中」：异步计算（worker）的 loading 反映外部计算进度，跨 render 持久，
    // 是 effect 同步 external system 的合理用法，非由 props/state 派生。
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState((prev) => (prev.loading && prev.error === null ? prev : { ...prev, loading: true, error: null }))
    const requestId = ++requestIdRef.current
    const timer = setTimeout(() => {
      compute()
        .then((value) => {
          if (requestIdRef.current === requestId) {
            setState({ result: value, loading: false, error: null })
          }
        })
        .catch((caught: unknown) => {
          if (requestIdRef.current === requestId) {
            setState({
              result: null,
              loading: false,
              error: caught instanceof Error ? caught.message : String(caught),
            })
          }
        })
    }, PLANNER_COMPUTE_DEBOUNCE_MS)
    return () => { clearTimeout(timer); }
    // compute 捕获的变量（variant/options/placements）均在 deps；compute 本身不放 deps 避免每次触发。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runner, enabled, ...deps])

  return enabled ? state : { result: null, loading: false, error: null }
}

/** 推荐搜索（beam search）。 */
export function usePlannerRecommendation(
  runner: PlannerComputeRunner,
  collections: PlannerCollections,
  variant: Variant | null,
  profileSnapshot: UserProfileSnapshot | null,
  options: PlannerRecommendationOptions,
): PlannerComputeOutcome<PlannerRecommendation> {
  const enabled = variant !== null && collections.plannerHeroes.length > 0
  return usePlannerCompute<PlannerRecommendation>(
    runner,
    collections,
    enabled,
    () => runner.recommend({ variant, profileSnapshot, options }),
    [collections, variant, profileSnapshot, options],
  )
}

/** 单阵型评估。 */
export function usePlannerEvaluation(
  runner: PlannerComputeRunner,
  collections: PlannerCollections,
  variant: Variant | null,
  profileSnapshot: UserProfileSnapshot | null,
  placements: Record<string, string>,
  options: PlannerRecommendationOptions,
): PlannerComputeOutcome<FormationEvaluation> {
  const enabled = variant !== null && collections.plannerHeroes.length > 0
  return usePlannerCompute<FormationEvaluation>(
    runner,
    collections,
    enabled,
    () => runner.evaluate({ variant, profileSnapshot, placements, options }),
    [collections, variant, profileSnapshot, placements, options],
  )
}
