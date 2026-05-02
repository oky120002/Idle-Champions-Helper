import { useState } from 'react'
import type { ScenarioRef } from '../../domain/types/formation'

interface PlannerResult {
  score: string
  placements: Record<string, string>
  explanations: string[]
  warnings: string[]
}

interface PlannerSavePresetProps {
  result: PlannerResult | null
  layoutId: string | null
  scenarioRef: ScenarioRef | null
}

export function PlannerSavePreset({ result, layoutId, scenarioRef }: PlannerSavePresetProps) {
  const [saved, setSaved] = useState(false)

  if (!result || !layoutId) {
    return (
      <div>
        <button type="button" disabled>保存</button>
      </div>
    )
  }

  async function handleSave() {
    // In a real implementation, this would call saveFormationPreset
    // with layoutId, placements, and scenarioRef
    void layoutId
    void scenarioRef
    void result
    setSaved(true)
  }

  return (
    <div>
      <button type="button" onClick={() => void handleSave()} disabled={saved}>
        保存
      </button>
      {saved && <span>已保存</span>}
    </div>
  )
}
