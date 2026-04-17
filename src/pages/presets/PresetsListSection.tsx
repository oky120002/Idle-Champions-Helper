import { StatusBanner } from '../../components/StatusBanner'
import { PresetCard } from './PresetCard'
import type { PresetsPageModel } from './types'

type PresetsListSectionProps = {
  model: PresetsPageModel
}

export function PresetsListSection({ model }: PresetsListSectionProps) {
  const { state, t } = model

  if (state.status !== 'ready') {
    return null
  }

  if (state.items.length === 0) {
    return (
      <StatusBanner tone="info">
        {t({
          zh: '这里还没有命名方案。先去阵型页摆出一套阵容，再点击“保存为方案”。',
          en: 'There are no named presets yet. Build a formation first, then click “Save as preset.”',
        })}
      </StatusBanner>
    )
  }

  return (
    <div className="results-grid">
      {state.items.map((view) => (
        <PresetCard key={view.preset.id} model={model} view={view} />
      ))}
    </div>
  )
}
