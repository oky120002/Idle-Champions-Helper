import { FieldGroup } from '../../components/FieldGroup'
import { buildPriorityLabel } from './preset-model'
import type { PresetsPageModel, PresetView } from './types'

type PresetEditorFormProps = {
  model: PresetsPageModel
  view: PresetView
}

export function PresetEditorForm({ model, view }: PresetEditorFormProps) {
  const { locale, t, editor, priorityOptions, updateEditor, savePresetEdit, cancelEditingPreset } = model

  return (
    <div className="form-stack result-card__section">
      <FieldGroup label={t({ zh: '方案名称', en: 'Preset name' })} labelFor={`preset-name-${view.preset.id}`}>
        <input
          id={`preset-name-${view.preset.id}`}
          className="text-input"
          type="text"
          value={editor.name}
          onChange={(event) => updateEditor('name', event.target.value)}
        />
      </FieldGroup>

      <FieldGroup label={t({ zh: '方案备注', en: 'Preset notes' })} labelFor={`preset-description-${view.preset.id}`}>
        <textarea
          id={`preset-description-${view.preset.id}`}
          className="text-area"
          rows={4}
          value={editor.description}
          onChange={(event) => updateEditor('description', event.target.value)}
        />
      </FieldGroup>

      <FieldGroup label={t({ zh: '场景标签', en: 'Scenario tags' })} labelFor={`preset-tags-${view.preset.id}`}>
        <input
          id={`preset-tags-${view.preset.id}`}
          className="text-input"
          type="text"
          value={editor.scenarioTagsInput}
          onChange={(event) => updateEditor('scenarioTagsInput', event.target.value)}
        />
      </FieldGroup>

      <FieldGroup label={t({ zh: '优先级', en: 'Priority' })}>
        <div className="segmented-control">
          {priorityOptions.map((option) => (
            <button
              key={option}
              type="button"
              className={
                editor.priority === option
                  ? 'segmented-control__button segmented-control__button--active'
                  : 'segmented-control__button'
              }
              onClick={() => updateEditor('priority', option)}
            >
              {buildPriorityLabel(option, locale)}
            </button>
          ))}
        </div>
      </FieldGroup>

      <div className="button-row">
        <button
          type="button"
          className="action-button action-button--secondary"
          disabled={editor.name.trim().length === 0}
          onClick={() => savePresetEdit(view.preset)}
        >
          {t({ zh: '保存修改', en: 'Save changes' })}
        </button>
        <button type="button" className="action-button action-button--ghost" onClick={cancelEditingPreset}>
          {t({ zh: '取消编辑', en: 'Cancel edit' })}
        </button>
      </div>
    </div>
  )
}
