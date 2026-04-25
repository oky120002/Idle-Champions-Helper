import { PresetFormFields } from '../../components/PresetFormFields'
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
      <PresetFormFields
        value={editor}
        priorityOptions={priorityOptions}
        nameInputId={`preset-name-${view.preset.id}`}
        descriptionInputId={`preset-description-${view.preset.id}`}
        tagsInputId={`preset-tags-${view.preset.id}`}
        nameLabel={t({ zh: '方案名称', en: 'Preset name' })}
        descriptionLabel={t({ zh: '方案备注', en: 'Preset notes' })}
        tagsLabel={t({ zh: '场景标签', en: 'Scenario tags' })}
        priorityLabel={t({ zh: '优先级', en: 'Priority' })}
        getPriorityOptionLabel={(option) => buildPriorityLabel(option, locale)}
        onChange={updateEditor}
        includeStackClass={false}
      />

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
