// planner compute worker 入口：收消息 → 调 engine → 发结果。
// 逻辑抽到 processPlannerComputeInbound（纯函数，单测覆盖）；本文件只做 IO（维护 state + postMessage）。
import {
  processPlannerComputeInbound,
  type PlannerComputeInbound,
  type PlannerComputeOutbound,
  type PlannerComputeWorkerState,
} from './plannerCompute'

const state: PlannerComputeWorkerState = {
  plannerHeroes: [],
  plannerScenarios: [],
}

// module worker 下 self 是 DedicatedWorkerGlobalScope。用最小内联类型（不引 webworker lib，
// 避免与 tsconfig DOM lib 的 self: Window 冲突）。
const scope = self as unknown as {
  onmessage: ((event: MessageEvent) => void) | null
  postMessage(message: PlannerComputeOutbound): void
}

scope.onmessage = (event: MessageEvent) => {
  const message = event.data as PlannerComputeInbound
  if (message.type === 'init') {
    state.plannerHeroes = message.plannerHeroes
    state.plannerScenarios = message.plannerScenarios
    return
  }
  const response = processPlannerComputeInbound(message, state)
  if (response) {
    scope.postMessage(response)
  }
}
