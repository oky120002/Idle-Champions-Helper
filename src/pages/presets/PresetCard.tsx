import { ArchiveRestore, Pencil, Trash2, X } from 'lucide-react'
import { ActionButtons } from '../../components/ActionButtons'
import { ChampionPill } from '../../components/ChampionPill'
import { StatusBannerStack, type StatusBannerStackItem } from '../../components/StatusBannerStack'
import { createExclusiveStatusBannerItems } from '../../components/statusBannerStackItemBuilders'
import { buildRestoreStatusDetail } from '../../data/formationPersistence'
import { useScenarioLabelLookup } from '../../data/useScenarioLabelLookup'
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

export function PresetCard({ model, view }: Readonly<PresetCardProps>) {
  const { locale, t, editingPresetId, deleteConfirmId, startEditingPreset, openDeleteConfirm, clearDeleteConfirm, restorePreset, deletePreset } = model
  const getScenarioLabel = useScenarioLabelLookup()
  const championSummary = buildChampionSummary(view)
  const showCompatibilityNotice = isCompatibleRestore(view) || hasDroppedReferences(view)
  const isEditing = editingPresetId === view.preset.id
  const isDeleteConfirming = deleteConfirmId === view.preset.id
  let activeStatus: 'invalid' | 'compatibility' | 'none'
  if (view.prompt.kind === 'invalid') {
    activeStatus = 'invalid'
  } else if (showCompatibilityNotice) {
    activeStatus = 'compatibility'
  } else {
    activeStatus = 'none'
  }
  const statusItems: StatusBannerStackItem[] = createExclusiveStatusBannerItems({
    status: activeStatus,
    items: [
      {
        id: 'invalid-prompt',
        when: 'invalid',
        tone: 'error',
        ...(view.prompt.kind === 'invalid'
          ? {
              title: t(view.prompt.title),
              detail: t(view.prompt.detail),
            }
          : {}),
      },
      {
        id: 'compatibility-notice',
        when: 'compatibility',
        tone: 'info',
        title: t("恢复时会带兼容处理"),
        ...(view.prompt.kind === 'restore' && showCompatibilityNotice
          ? { detail: t(buildRestoreStatusDetail(view.prompt.preview)) }
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
        {view.preset.description !== ''
          ? view.preset.description
          : t("当前还没有备注，可在这里补充这套阵容适合的目标和限制。")}
      </p>

      <div className="tag-row">
        <span className="tag-pill tag-pill--muted">{buildLayoutSummary(view, locale)}</span>
        <span className="tag-pill tag-pill--muted">
          {t("保存版本")}：{view.preset.dataVersion}
        </span>
        <span className="tag-pill tag-pill--muted">
          {t("更新于")}：{formatDateTime(view.preset.updatedAt, locale)}
        </span>
        <span className="tag-pill tag-pill--muted">
          {view.preset.scenarioRef
            ? (getScenarioLabel(view.preset.scenarioRef)
              ?? `${view.preset.scenarioRef.kind}:${view.preset.scenarioRef.id}`)
            : t("未绑定正式场景")}
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
            <ChampionPill key={`${champion.id}-${String(index)}`} champion={champion} locale={locale} />
          ))}
        </div>
      ) : null}

      <StatusBannerStack items={statusItems} />

      <ActionButtons
        className="button-row result-card__section"
        items={[
          {
            id: 'restore-preset',
            label: t("恢复到阵型页"),
            icon: <ArchiveRestore aria-hidden="true" strokeWidth={1.9} />,
            tone: 'secondary',
            disabled: view.prompt.kind !== 'restore',
            onClick: () => restorePreset(view),
          },
          {
            id: 'edit-preset',
            label: t("编辑"),
            icon: <Pencil aria-hidden="true" strokeWidth={1.9} />,
            tone: 'ghost',
            onClick: () => startEditingPreset(view.preset),
          },
          {
            id: 'confirm-delete',
            label: t("确认删除"),
            icon: <Trash2 aria-hidden="true" strokeWidth={1.9} />,
            hidden: !isDeleteConfirming,
            onClick: () => deletePreset(view.preset),
          },
          {
            id: 'cancel-delete',
            label: t("取消"),
            icon: <X aria-hidden="true" strokeWidth={1.9} />,
            tone: 'ghost',
            hidden: !isDeleteConfirming,
            onClick: clearDeleteConfirm,
          },
          {
            id: 'open-delete-confirm',
            label: t("删除"),
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
