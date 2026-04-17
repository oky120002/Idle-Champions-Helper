import { ChampionPill } from '../../components/ChampionPill'
import { StatusBanner } from '../../components/StatusBanner'
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

      {view.prompt.kind === 'invalid' ? <StatusBanner tone="error" title={view.prompt.title} detail={view.prompt.detail} /> : null}

      {view.prompt.kind === 'restore' && showCompatibilityNotice ? (
        <StatusBanner
          tone="info"
          title={t({ zh: '恢复时会带兼容处理', en: 'Restore will apply compatibility handling' })}
          detail={buildRestoreStatusDetail(view.prompt.preview)}
        />
      ) : null}

      <div className="button-row result-card__section">
        <button
          type="button"
          className="action-button action-button--secondary"
          disabled={view.prompt.kind !== 'restore'}
          onClick={() => restorePreset(view)}
        >
          {t({ zh: '恢复到阵型页', en: 'Restore to formation' })}
        </button>
        <button type="button" className="action-button action-button--ghost" onClick={() => startEditingPreset(view.preset)}>
          {t({ zh: '编辑', en: 'Edit' })}
        </button>
        {isDeleteConfirming ? (
          <>
            <button type="button" className="action-button" onClick={() => deletePreset(view.preset)}>
              {t({ zh: '确认删除', en: 'Confirm delete' })}
            </button>
            <button type="button" className="action-button action-button--ghost" onClick={clearDeleteConfirm}>
              {t({ zh: '取消', en: 'Cancel' })}
            </button>
          </>
        ) : (
          <button type="button" className="action-button action-button--ghost" onClick={() => openDeleteConfirm(view.preset.id)}>
            {t({ zh: '删除', en: 'Delete' })}
          </button>
        )}
      </div>

      {isEditing ? <PresetEditorForm model={model} view={view} /> : null}
    </article>
  )
}
