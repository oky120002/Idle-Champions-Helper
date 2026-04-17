import { FormationEditorCard } from './formation/FormationEditorCard'
import { FormationPresetCard } from './formation/FormationPresetCard'
import { useFormationPageModel } from './formation/useFormationPageModel'

export function FormationPage() {
  const model = useFormationPageModel()

  return (
    <div className="page-stack">
      <FormationEditorCard model={model} />
      <FormationPresetCard model={model} />
    </div>
  )
}
