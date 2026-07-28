import { buildPlannerRecommendation, evaluateFormation } from '../recommendationEngine'
import type {
  FormationEvaluation,
  PlannerEvaluateInput,
  PlannerRecommendInput,
} from '../recommendationEngine'
import type { ResolvedHeroAbilityProfile } from '../../abilities/abilityModel'
import type { ResolvedPlannerScenarioModel } from '../plannerModel'
import type { PlannerCollections, PlannerRecommendation } from '../recommendationTypes'

// === Worker 通信协议（UI ↔ worker 消息） ===
// init 一次性把大数据（plannerHeroes + plannerScenarios，~17.5M）发进 worker 缓存；
// 之后 recommend/evaluate 只传小载荷（variant + profileSnapshot + options/placements）。
// variants 不进 worker——engine 只用 UI 已解析的 selectedVariant（见 resolvePlannerScenario）。

export interface PlannerComputeInitMessage {
  type: 'init'
  plannerHeroes: ResolvedHeroAbilityProfile[]
  plannerScenarios: ResolvedPlannerScenarioModel[]
}

export interface PlannerComputeRecommendMessage extends PlannerRecommendInput {
  type: 'recommend'
  requestId: number
}

export interface PlannerComputeEvaluateMessage extends PlannerEvaluateInput {
  type: 'evaluate'
  requestId: number
}

export type PlannerComputeInbound =
  | PlannerComputeInitMessage
  | PlannerComputeRecommendMessage
  | PlannerComputeEvaluateMessage

export interface PlannerComputeResultMessage {
  type: 'result'
  requestId: number
  ok: true
  result: PlannerRecommendation | FormationEvaluation
}

export interface PlannerComputeErrorMessage {
  type: 'result'
  requestId: number
  ok: false
  error: string
}

export type PlannerComputeOutbound = PlannerComputeResultMessage | PlannerComputeErrorMessage

// === Runner 接口（hook 依赖此抽象，便于测试注入同步实现） ===

export interface PlannerComputeRunner {
  /**
   * collections 变化时调：worker 实现发 init 把 plannerHeroes+plannerScenarios 推进 worker 缓存；
   * sync 实现也缓存（主线程 engine 调用需要）。
   */
  updateCollections(collections: PlannerCollections): void
  recommend(input: PlannerRecommendInput): Promise<PlannerRecommendation>
  evaluate(input: PlannerEvaluateInput): Promise<FormationEvaluation>
  dispose(): void
}

// === 同步实现（测试 / 降级用：直接调 engine） ===

export class SyncPlannerComputeRunner implements PlannerComputeRunner {
  private collections: PlannerCollections | null = null

  updateCollections(collections: PlannerCollections): void {
    this.collections = collections
  }

  recommend(input: PlannerRecommendInput): Promise<PlannerRecommendation> {
    if (!this.collections) {
      return Promise.reject(new Error('SyncPlannerComputeRunner: updateCollections 未调用'))
    }
    return Promise.resolve(buildPlannerRecommendation({ ...input, collections: this.collections }))
  }

  evaluate(input: PlannerEvaluateInput): Promise<FormationEvaluation> {
    if (!this.collections) {
      return Promise.reject(new Error('SyncPlannerComputeRunner: updateCollections 未调用'))
    }
    return Promise.resolve(evaluateFormation({ ...input, collections: this.collections }))
  }

  dispose(): void {
    // noop
  }
}

// === Worker 实现（生产用：postMessage + requestId 路由 + collections 缓存进 worker） ===

interface PendingRequest {
  resolve: (value: PlannerRecommendation | FormationEvaluation) => void
  reject: (error: Error) => void
}

export class WorkerPlannerComputeRunner implements PlannerComputeRunner {
  private readonly worker: Worker
  private nextRequestId = 1
  private readonly pending = new Map<number, PendingRequest>()

  constructor(worker: Worker) {
    this.worker = worker
    this.worker.onmessage = (event: MessageEvent) => {
      this.handleMessage(event.data as PlannerComputeOutbound)
    }
    // worker import 失败 / 未捕获错误：reject 所有 pending，避免 UI 永久 loading。
    this.worker.onerror = (event: ErrorEvent) => {
      const error = new Error(event.message || 'planner compute worker error')
      for (const request of this.pending.values()) {
        request.reject(error)
      }
      this.pending.clear()
    }
  }

  updateCollections(collections: PlannerCollections): void {
    this.worker.postMessage({
      type: 'init',
      plannerHeroes: collections.plannerHeroes,
      plannerScenarios: collections.plannerScenarios,
    } satisfies PlannerComputeInitMessage)
  }

  recommend(input: PlannerRecommendInput): Promise<PlannerRecommendation> {
    return this.dispatch<PlannerRecommendation>({ type: 'recommend', ...input })
  }

  evaluate(input: PlannerEvaluateInput): Promise<FormationEvaluation> {
    return this.dispatch<FormationEvaluation>({ type: 'evaluate', ...input })
  }

  private dispatch<T extends PlannerRecommendation | FormationEvaluation>(
    message: Omit<PlannerComputeRecommendMessage, 'requestId'> | Omit<PlannerComputeEvaluateMessage, 'requestId'>,
  ): Promise<T> {
    const requestId = this.nextRequestId++
    this.worker.postMessage({ ...message, requestId })
    return new Promise<T>((resolve, reject) => {
      this.pending.set(requestId, { resolve: resolve as PendingRequest['resolve'], reject })
    })
  }

  private handleMessage(message: PlannerComputeOutbound): void {
    if (message.type !== 'result') {
      return
    }
    const request = this.pending.get(message.requestId)
    if (!request) {
      // 过期请求的回包（已被 dispose 或新请求顶替）——静默丢弃，防污染。
      return
    }
    this.pending.delete(message.requestId)
    if (message.ok) {
      request.resolve(message.result)
    } else {
      request.reject(new Error(message.error))
    }
  }

  dispose(): void {
    const error = new Error('planner compute runner disposed')
    for (const request of this.pending.values()) {
      request.reject(error)
    }
    this.pending.clear()
    this.worker.terminate()
  }
}

/**
 * 生产工厂：创建真 module worker。仅在浏览器调用（hook 按需创建单例）。
 * worker 入口见 `plannerCompute.worker.ts`。
 */
export function createWorkerPlannerComputeRunner(): WorkerPlannerComputeRunner {
  const worker = new Worker(new URL('./plannerCompute.worker.ts', import.meta.url), { type: 'module' })
  return new WorkerPlannerComputeRunner(worker)
}

/**
 * 默认工厂：浏览器用 worker 卸载计算；jsdom（测试）/ SSR 等 Worker 不可用环境降级 Sync。
 */
export function createPlannerComputeRunner(): PlannerComputeRunner {
  if (typeof Worker === 'undefined') {
    return new SyncPlannerComputeRunner()
  }
  return createWorkerPlannerComputeRunner()
}

// === Worker 端纯逻辑（入口只做 IO：维护 state + postMessage，逻辑抽离便于单测） ===

export interface PlannerComputeWorkerState {
  plannerHeroes: ResolvedHeroAbilityProfile[]
  plannerScenarios: ResolvedPlannerScenarioModel[]
}

/**
 * 处理一条入站消息：init 返回 null（调用方更新 state）；recommend/evaluate 调 engine 后返回出站响应。
 * engine 抛错 → ok:false（含 error 文案），由 UI 端 client reject。
 */
export function processPlannerComputeInbound(
  message: PlannerComputeInbound,
  state: PlannerComputeWorkerState,
): PlannerComputeOutbound | null {
  if (message.type === 'init') {
    return null
  }
  // engine 只用 plannerHeroes + plannerScenarios；variants 始终空（UI 已解析 selectedVariant 传入）。
  const collections: PlannerCollections = {
    variants: [],
    plannerHeroes: state.plannerHeroes,
    plannerScenarios: state.plannerScenarios,
  }
  const requestId = message.requestId
  try {
    const result = message.type === 'recommend'
      ? buildPlannerRecommendation({
          variant: message.variant,
          collections,
          profileSnapshot: message.profileSnapshot,
          options: message.options,
        })
      : evaluateFormation({
          variant: message.variant,
          collections,
          profileSnapshot: message.profileSnapshot,
          placements: message.placements,
          options: message.options,
        })
    return { type: 'result', requestId, ok: true, result }
  } catch (error) {
    return { type: 'result', requestId, ok: false, error: error instanceof Error ? error.message : String(error) }
  }
}
