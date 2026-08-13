import { ActionButtons } from '../../components/ActionButtons'
import { PresetFormFields } from '../../components/PresetFormFields'
import { buildPriorityLabel } from './preset-model'
import type { PresetsPageModel, PresetView } from './types'

type PresetEditorFormProps = {
  model: PresetsPageModel
  view: PresetView
}

export function PresetEditorForm({ model, view }: Readonly<PresetEditorFormProps>) {
  const { locale, t, editor, priorityOptions, updateEditor, savePresetEdit, cancelEditingPreset } = model

  return (
    <div className="form-stack result-card__section">
      <PresetFormFields
        value={editor}
        priorityOptions={priorityOptions}
        nameInputId={`preset-name-${view.preset.id}`}
        descriptionInputId={`preset-description-${view.preset.id}`}
        tagsInputId={`preset-tags-${view.preset.id}`}
        nameLabel={t("方案名称")}
        descriptionLabel={t("方案备注")}
        tagsLabel={t("场景标签")}
        priorityLabel={t("优先级")}
        getPriorityOptionLabel={(option) => buildPriorityLabel(option, locale)}
        onChange={updateEditor}
        includeStackClass={false}
      />

      <ActionButtons
        items={[
          {
            id: 'save-edit',
            label: t("保存修改"),
            tone: 'secondary',
            disabled: editor.name.trim().length === 0,
            onClick: () => savePresetEdit(view.preset),
          },
          {
            id: 'cancel-edit',
            label: t("取消编辑"),
            tone: 'ghost',
            onClick: cancelEditingPreset,
          },
        ]}
      />
    </div>
  )
}
