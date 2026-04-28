import { ArchiveRestore, Pencil, Trash2, X } from 'lucide-react'
import { ActionButtons } from '../../components/ActionButtons'
import { ChampionPill } from '../../components/ChampionPill'
import { StatusBannerStack, type StatusBannerStackItem } from '../../components/StatusBannerStack'
import { createExclusiveStatusBannerItems } from '../../components/statusBannerStackItemBuilders'
import { buildRestoreStatusDetail } from '../../data/formationPersistence'
import {
  buildChampionSummary,
  buildLayoutSummary,
  buildPriorityLabel,
  formatDateTime,
  hasDroppedReferences,
  isCompatibleRestore,
} from './preset-model'
import { PresetEditorForm } from './PresetEditorForm'
import type { PresetsPageModel, PresetView } from './types'

type PresetCardProps = {
  model: PresetsPageModel
  view: PresetView
}

export function PresetCard({ model, view }: PresetCardProps) {
  const { locale, t, editingPresetId, deleteConfirmId, startEditingPreset, openDeleteConfirm, clearDeleteConfirm, restorePreset, deletePreset } = model
  const championSummary = buildChampionSummary(view)
  const showCompatibilityNotice = isCompatibleRestore(view) || hasDroppedReferences(view)
  const isEditing = editingPresetId === view.preset.id
  const isDeleteConfirming = deleteConfirmId === view.preset.id
  const activeStatus =
    view.prompt.kind === 'invalid'
      ? 'invalid'
      : view.prompt.kind === 'restore' && showCompatibilityNotice
        ? 'compatibility'
        : 'none'
  const statusItems: StatusBannerStackItem[] = createExclusiveStatusBannerItems({
    status: activeStatus,
    items: [
      {
        id: 'invalid-prompt',
        when: 'invalid',
        tone: 'error',
        ...(view.prompt.kind === 'invalid'
          ? {
              title: view.prompt.title,
              detail: view.prompt.detail,
            }
          : {}),
      },
      {
        id: 'compatibility-notice',
        when: 'compatibility',
        tone: 'info',
        title: t({ zh: '恢复时会带兼容处理', en: 'Restore will apply compatibility handling' }),
        ...(view.prompt.kind === 'restore' && showCompatibilityNotice
          ? { detail: buildRestoreStatusDetail(view.prompt.preview) }
          : {}),
      },
    ],
  })

  return (
    <article className="result-card">
      <div className="result-card__header">
        <span className="result-card__eyebrow">{buildPriorityLabel(view.preset.priority, locale)}</span>
        <h3 className="result-card__title">{view.preset.name}</h3>
      </div>

      <p className="supporting-text">
        {view.preset.description ||
          t({
            zh: '当前还没有备注，可在这里补充这套阵容适合的目标和限制。',
            en: 'There are no notes yet. Add what this formation is for and what constraints matter.',
          })}
      </p>

      <div className="tag-row">
        <span className="tag-pill tag-pill--muted">{buildLayoutSummary(view, locale)}</span>
        <span className="tag-pill tag-pill--muted">
          {t({ zh: '保存版本', en: 'Saved version' })}：{view.preset.dataVersion}
        </span>
        <span className="tag-pill tag-pill--muted">
          {t({ zh: '更新于', en: 'Updated' })}：{formatDateTime(view.preset.updatedAt, locale)}
        </span>
        <span className="tag-pill tag-pill--muted">
          {view.preset.scenarioRef
            ? `${view.preset.scenarioRef.kind}:${view.preset.scenarioRef.id}`
            : t({ zh: '未绑定正式场景', en: 'No formal scenario linked' })}
        </span>
      </div>

      {view.preset.scenarioTags.length > 0 ? (
        <div className="tag-row result-card__section">
          {view.preset.scenarioTags.map((tag) => (
            <span key={tag} className="tag-pill">
              {tag}
            </span>
          ))}
        </div>
      ) : null}

      {championSummary.length > 0 ? (
        <div className="tag-row result-card__section">
          {championSummary.map((champion, index) => (
            <ChampionPill key={`${champion.id}-${index}`} champion={champion} locale={locale} />
          ))}
        </div>
      ) : null}

      <StatusBannerStack items={statusItems} />

      <ActionButtons
        className="button-row result-card__section"
        items={[
          {
            id: 'restore-preset',
            label: t({ zh: '恢复到阵型页', en: 'Restore to formation' }),
            icon: <ArchiveRestore aria-hidden="true" strokeWidth={1.9} />,
            tone: 'secondary',
            disabled: view.prompt.kind !== 'restore',
            onClick: () => restorePreset(view),
          },
          {
            id: 'edit-preset',
            label: t({ zh: '编辑', en: 'Edit' }),
            icon: <Pencil aria-hidden="true" strokeWidth={1.9} />,
            tone: 'ghost',
            onClick: () => startEditingPreset(view.preset),
          },
          {
            id: 'confirm-delete',
            label: t({ zh: '确认删除', en: 'Confirm delete' }),
            icon: <Trash2 aria-hidden="true" strokeWidth={1.9} />,
            hidden: !isDeleteConfirming,
            onClick: () => deletePreset(view.preset),
          },
          {
            id: 'cancel-delete',
            label: t({ zh: '取消', en: 'Cancel' }),
            icon: <X aria-hidden="true" strokeWidth={1.9} />,
            tone: 'ghost',
            hidden: !isDeleteConfirming,
            onClick: clearDeleteConfirm,
          },
          {
            id: 'open-delete-confirm',
            label: t({ zh: '删除', en: 'Delete' }),
            icon: <Trash2 aria-hidden="true" strokeWidth={1.9} />,
            tone: 'ghost',
            hidden: isDeleteConfirming,
            onClick: () => openDeleteConfirm(view.preset.id),
          },
        ]}
      />

      {isEditing ? <PresetEditorForm model={model} view={view} /> : null}
    </article>
  )
}
