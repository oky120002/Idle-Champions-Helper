import { describe, expect, it } from 'vitest'

import {
  SyncPlannerComputeRunner,
  WorkerPlannerComputeRunner,
  processPlannerComputeInbound,
  type PlannerComputeInbound,
  type PlannerComputeOutbound,
} from './plannerCompute'
import type { FormationEvaluation } from '../recommendationEngine'
import type { PlannerCollections, PlannerRecommendation } from '../recommendationTypes'

// Fake Worker：捕获 postMessage、暴露 emit 模拟 worker 回包、记录 terminate。
// node 环境无真 Worker，runner 测试用此替身覆盖协议与路由逻辑。
class FakeWorker {
  onmessage: ((event: MessageEvent) => void) | null = null
  onerror: ((event: ErrorEvent) => void) | null = null
  readonly posted: PlannerComputeInbound[] = []
  terminated = false

  postMessage(message: PlannerComputeInbound): void {
    this.posted.push(message)
  }

  terminate(): void {
    this.terminated = true
  }

  emit(message: PlannerComputeOutbound): void {
    this.onmessage?.({ data: message } as MessageEvent)
  }
}

function fakeRec(overrides: Partial<PlannerRecommendation> = {}): PlannerRecommendation {
  return {
    result: null,
    results: [],
    layoutId: null,
    slots: [],
    scenarioRef: null,
    blocker: null,
    ...overrides,
  }
}

const emptyCollections: PlannerCollections = {
  variants: [],
  plannerHeroes: [],
  plannerScenarios: [],
}

// 从 posted 消息取 requestId（TS 无法从联合 narrow 出非 init，统一在此收窄）。
function requestIdOf(message: PlannerComputeInbound | undefined): number {
  if (!message || message.type === 'init') {
    throw new Error('expected recommend/evaluate message')
  }
  return message.requestId
}

describe('WorkerPlannerComputeRunner', () => {
  it('updateCollections 发 init（plannerHeroes + plannerScenarios；不传 variants）', () => {
    const fake = new FakeWorker()
    const runner = new WorkerPlannerComputeRunner(fake as unknown as Worker)

    runner.updateCollections({
      variants: [{ id: 'v1' } as never],
      plannerHeroes: [{ heroId: 'h1' } as never],
      plannerScenarios: [{ variantId: 'v1' } as never],
    })

    expect(fake.posted).toHaveLength(1)
    expect(fake.posted[0]).toMatchObject({
      type: 'init',
      plannerHeroes: [{ heroId: 'h1' }],
      plannerScenarios: [{ variantId: 'v1' }],
    })
    // variants 不进 worker（engine 只用 UI 已解析的 selectedVariant）
    expect(fake.posted[0]).not.toHaveProperty('variants')
  })

  it('recommend 发消息 + 收 result 正确 resolve（requestId 路由）', async () => {
    const fake = new FakeWorker()
    const runner = new WorkerPlannerComputeRunner(fake as unknown as Worker)

    const promise = runner.recommend(null, null, {})
    const last = fake.posted.at(-1)
    expect(last?.type).toBe('recommend')
    const requestId = requestIdOf(last)

    const result = fakeRec({ blocker: 'missing-profile' })
    fake.emit({ type: 'result', requestId, ok: true, result })
    await expect(promise).resolves.toBe(result)
  })

  it('evaluate 路由到 FormationEvaluation', async () => {
    const fake = new FakeWorker()
    const runner = new WorkerPlannerComputeRunner(fake as unknown as Worker)

    const promise = runner.evaluate(null, null, {}, {})
    const requestId = requestIdOf(fake.posted.at(-1))

    const result = { result: null, layoutId: null, slots: [], scenarioRef: null, blocker: null } as FormationEvaluation
    fake.emit({ type: 'result', requestId, ok: true, result })
    await expect(promise).resolves.toBe(result)
  })

  it('并发请求 requestId 单调递增、result 乱序仍各自正确 resolve', async () => {
    const fake = new FakeWorker()
    const runner = new WorkerPlannerComputeRunner(fake as unknown as Worker)

    const p1 = runner.recommend(null, null, {})
    const p2 = runner.recommend(null, null, {})
    const id1 = requestIdOf(fake.posted[0])
    const id2 = requestIdOf(fake.posted[1])
    expect(id2).toBe(id1 + 1)

    const recB = fakeRec({ blocker: 'no-legal-recommendation' })
    const recA = fakeRec({ blocker: 'insufficient-owned-heroes' })
    // 乱序回包：先 id2 再 id1
    fake.emit({ type: 'result', requestId: id2, ok: true, result: recB })
    fake.emit({ type: 'result', requestId: id1, ok: true, result: recA })

    await expect(p1).resolves.toBe(recA)
    await expect(p2).resolves.toBe(recB)
  })

  it('ok:false 回包 → reject（含 error 文案）', async () => {
    const fake = new FakeWorker()
    const runner = new WorkerPlannerComputeRunner(fake as unknown as Worker)

    const promise = runner.recommend(null, null, {})
    const requestId = requestIdOf(fake.posted.at(-1))

    fake.emit({ type: 'result', requestId, ok: false, error: 'boom' })
    await expect(promise).rejects.toThrow('boom')
  })

  it('未知 requestId 的 result 被丢弃（防过期回包污染）', async () => {
    const fake = new FakeWorker()
    const runner = new WorkerPlannerComputeRunner(fake as unknown as Worker)

    const promise = runner.recommend(null, null, {})
    const requestId = requestIdOf(fake.posted.at(-1))

    // 过期 requestId（不在 pending 中）
    fake.emit({ type: 'result', requestId: 9999, ok: true, result: fakeRec({ blocker: 'no-legal-recommendation' }) })
    // 正确 requestId
    fake.emit({ type: 'result', requestId, ok: true, result: fakeRec({ blocker: null }) })

    await expect(promise).resolves.toMatchObject({ blocker: null })
  })

  it('dispose reject 所有 pending 并 terminate worker', async () => {
    const fake = new FakeWorker()
    const runner = new WorkerPlannerComputeRunner(fake as unknown as Worker)

    const promise = runner.recommend(null, null, {})
    runner.dispose()

    await expect(promise).rejects.toThrow('disposed')
    expect(fake.terminated).toBe(true)
  })

  it('worker onerror reject 所有 pending（import 失败等）', async () => {
    const fake = new FakeWorker()
    const runner = new WorkerPlannerComputeRunner(fake as unknown as Worker)

    const p1 = runner.recommend(null, null, {})
    const p2 = runner.evaluate(null, null, {}, {})

    fake.onerror?.({ message: 'import failed' } as ErrorEvent)

    await expect(p1).rejects.toThrow('import failed')
    await expect(p2).rejects.toThrow('import failed')
  })
})

describe('SyncPlannerComputeRunner', () => {
  it('updateCollections 后 recommend 透传 engine（空数据走 blocker=null 早返回）', async () => {
    const runner = new SyncPlannerComputeRunner()
    runner.updateCollections(emptyCollections)

    const result = await runner.recommend(null, null, {})
    expect(result).toMatchObject({ result: null, results: [], blocker: null })
  })

  it('未 updateCollections 直接 recommend 抛错', async () => {
    const runner = new SyncPlannerComputeRunner()
    await expect(runner.recommend(null, null, {})).rejects.toThrow('updateCollections')
  })
})

describe('processPlannerComputeInbound', () => {
  const emptyState = { plannerHeroes: [], plannerScenarios: [] }

  it('init 返回 null（worker 调用方自行更新 state）', () => {
    const response = processPlannerComputeInbound(
      { type: 'init', plannerHeroes: [], plannerScenarios: [] },
      emptyState,
    )
    expect(response).toBeNull()
  })

  it('recommend 调 engine 返回 ok:true result（透传 requestId）', () => {
    const response = processPlannerComputeInbound(
      { type: 'recommend', variant: null, profileSnapshot: null, options: {}, requestId: 7 },
      emptyState,
    )
    expect(response).toMatchObject({ type: 'result', requestId: 7, ok: true, result: { blocker: null } })
  })

  it('evaluate 调 engine 返回 ok:true result（透传 requestId）', () => {
    const response = processPlannerComputeInbound(
      { type: 'evaluate', variant: null, profileSnapshot: null, placements: {}, options: {}, requestId: 9 },
      emptyState,
    )
    expect(response).toMatchObject({ type: 'result', requestId: 9, ok: true })
  })
})
