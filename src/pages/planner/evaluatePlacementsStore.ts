import { useEffect, useState } from 'react'

export type EvaluatePlacements = Record<string, string>

let currentState: EvaluatePlacements = {}
const listeners = new Set<() => void>()

function emit(): void {
  listeners.forEach((listener) => {
    listener()
  })
}

export function getEvaluatePlacements(): EvaluatePlacements {
  return currentState
}

export function setEvaluatePlacements(next: EvaluatePlacements): void {
  currentState = next
  emit()
}

export function patchEvaluatePlacements(slotId: string, heroId: string): void {
  currentState = { ...currentState, [slotId]: heroId }
  emit()
}

export function removeEvaluatePlacement(slotId: string): void {
  currentState = Object.fromEntries(Object.entries(currentState).filter(([key]) => key !== slotId))
  emit()
}

export function clearEvaluatePlacements(): void {
  currentState = {}
  emit()
}

/**
 * 跨路由保留的玩家自摆阵型（slotId→heroId）。
 * 模块级内存 store：返回 /planner 再进来自配面板，摆的阵型仍在；刷新页面丢失。
 * 自配评估是临时实验，要持久化用现有「保存预设」。
 */
export function useEvaluatePlacements(): [EvaluatePlacements, (next: EvaluatePlacements) => void] {
  const [value, setValue] = useState(currentState)

  useEffect(() => {
    const listener = () => {
      setValue(currentState)
    }
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  }, [])

  return [value, setEvaluatePlacements]
}
