import { buildPlannerRecommendation, evaluateFormation } from '../recommendationEngine'
import type {
  FormationEvaluation,
  PlannerEvaluateInput,
  PlannerRecommendInput,
} from '../recommendationEngine'
import type { ResolvedHeroAbilityProfile } from '../../abilities/abilityModel'
import type { ResolvedPlannerScenarioModel } from '../plannerModel'
import type { PlannerCollections, PlannerRecommendation } from '../recommendationTypes'
import { computeAffordableLevel, computeCumulativeLevelCost, computeMaxGoldForLevel } from '../../simulator/goldBudgetBaseline'
import { formatGameNumber, parseGameNumber, toGameNumber } from '../../gameNumber'

// === Worker 通信协议（UI ↔ worker 消息） ===
// init 一次性把大数据（plannerHeroes + plannerScenarios）发进 worker 缓存；
// 内存对象图 ~17.5M（Decimal/对象开销），序列化载荷 6.6MB；postMessage 走 structuredClone 实测 ~32ms 一次性。
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

// === 金币↔等级换算（UI 实时调用，不经过 engine） ===

export interface PlannerComputeConvertMessage {
  type: 'convertGoldLevel'
  requestId: number
  mode: 'gold' | 'level'
  /** gold 模式：金币预算（游戏记数法字符串） */
  goldBudget?: string
  /** level 模式：全局等级 */
  level?: number
}

export interface GoldLevelHeroEntry {
  heroId: string
  heroName: string
  seat: number
  /** gold 模式：金币能升到的等级；level 模式：传入的统一等级 */
  level: number
  /** 该等级的累计升级费用（游戏记数法字符串） */
  goldCost: string
}

export interface GoldLevelConversion {
  heroes: readonly GoldLevelHeroEntry[]
  /** 所有英雄中最贵的累计费用（游戏记数法字符串） */
  maxGold: string
}

export type PlannerComputeInbound =
  | PlannerComputeInitMessage
  | PlannerComputeRecommendMessage
  | PlannerComputeEvaluateMessage
  | PlannerComputeConvertMessage

export interface PlannerComputeResultMessage {
  type: 'result'
  requestId: number
  ok: true
  result: PlannerRecommendation | FormationEvaluation | GoldLevelConversion
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
  convertGoldLevel(input: { mode: 'gold'; goldBudget: string } | { mode: 'level'; level: number }): Promise<GoldLevelConversion>
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

  convertGoldLevel(input: { mode: 'gold'; goldBudget: string } | { mode: 'level'; level: number }): Promise<GoldLevelConversion> {
    if (!this.collections) {
      return Promise.reject(new Error('SyncPlannerComputeRunner: updateCollections 未调用'))
    }
    return Promise.resolve(processConvertGoldLevel(input, this.collections.plannerHeroes))
  }

  dispose(): void {
    // noop
  }
}

// === Worker 实现（生产用：postMessage + requestId 路由 + collections 缓存进 worker） ===

interface PendingRequest {
  resolve: (value: PlannerRecommendation | FormationEvaluation | GoldLevelConversion) => void
  reject: (error: Error) => void
}

export class WorkerPlannerComputeRunner implements PlannerComputeRunner {
  private readonly worker: Worker
  private nextRequestId = 1
  private readonly pending = new Map<number, PendingRequest>()

  constructor(worker: Worker) {
    this.worker = worker
    this.worker.onmessage = (event: MessageEvent) => this.handleMessage(event.data as PlannerComputeOutbound)
    // worker import 失败 / 未捕获错误：reject 所有 pending，避免 UI 永久 loading。
    this.worker.onerror = (event: ErrorEvent) => {
      const error = new Error(event.message !== '' ? event.message : 'planner compute worker error')
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

  convertGoldLevel(input: { mode: 'gold'; goldBudget: string } | { mode: 'level'; level: number }): Promise<GoldLevelConversion> {
    return this.dispatch<GoldLevelConversion>({ type: 'convertGoldLevel', ...input })
  }

  private dispatch<T>(
    message: Omit<PlannerComputeRecommendMessage, 'requestId'> | Omit<PlannerComputeEvaluateMessage, 'requestId'> | Omit<PlannerComputeConvertMessage, 'requestId'>,
  ): Promise<T> {
    const requestId = this.nextRequestId++
    this.worker.postMessage({ ...message, requestId })
    return new Promise<T>((resolve, reject) => {
      this.pending.set(requestId, { resolve: resolve as PendingRequest['resolve'], reject })
    })
  }

  private handleMessage(message: PlannerComputeOutbound): void {
    // PlannerComputeOutbound 两成员 type 恒为 'result'，无需运行时再判。
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
  if (message.type === 'convertGoldLevel') {
    const input = message.mode === 'gold'
      ? { mode: 'gold' as const, goldBudget: message.goldBudget ?? '0' }
      : { mode: 'level' as const, level: message.level ?? 0 }
    return { type: 'result', ok: true, requestId: message.requestId, result: processConvertGoldLevel(input, state.plannerHeroes) }
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
          profileSnapshot: message.profileSnapshot,
          options: message.options,
          collections,
        })
      : evaluateFormation({
          variant: message.variant,
          profileSnapshot: message.profileSnapshot,
          placements: message.placements,
          options: message.options,
          collections,
        })
    return { type: 'result', ok: true, requestId, result }
  } catch (error) {
    return { type: 'result', ok: false, error: error instanceof Error ? error.message : String(error), requestId }
  }
}

/**
 * 金币↔等级换算纯函数（UI 实时调用：输入金币看等级，或输入等级看金币）。
 *
 * gold 模式：全局金币值 → 每个英雄各自换算等级（baseCost + costCurves 不同，等级不同）。
 * level 模式：全局统一等级 → 每个英雄各自的累计费用 + 最高费用。
 */
export function processConvertGoldLevel(
  input: { mode: 'gold'; goldBudget: string } | { mode: 'level'; level: number },
  heroes: readonly ResolvedHeroAbilityProfile[],
): GoldLevelConversion {
  const makeEntry = (hero: ResolvedHeroAbilityProfile, level: number): GoldLevelHeroEntry => ({
    heroId: hero.heroId,
    heroName: hero.name.display,
    seat: hero.seat,
    level,
    goldCost: formatGameNumber(computeCumulativeLevelCost(hero.baseCost ?? 0, hero.costCurves?.['1'] ?? 1.06, level)),
  })

  const heroCostData = heroes.map(h => ({ baseCost: h.baseCost ?? 0, costCurves: h.costCurves }))

  if (input.mode === 'gold') {
    const parsed = parseGameNumber(input.goldBudget)
    const budget = parsed.ok ? parsed.value : toGameNumber(0)
    const entries = heroes.map(hero => makeEntry(hero, computeAffordableLevel(hero.baseCost ?? 0, hero.costCurves, budget)))
    const maxLevel = entries.length > 0 ? Math.max(...entries.map(e => e.level)) : 0
    return { heroes: entries, maxGold: formatGameNumber(computeMaxGoldForLevel(heroCostData, maxLevel)) }
  }

  const entries = heroes.map(hero => makeEntry(hero, input.level))
  return { heroes: entries, maxGold: formatGameNumber(computeMaxGoldForLevel(heroCostData, input.level)) }
}
