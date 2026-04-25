import { ActionButtons } from '../../components/ActionButtons'
import { ChampionPill } from '../../components/ChampionPill'
import { StatusBanner } from '../../components/StatusBanner'
import { buildRestoreStatusDetail } from '../../data/formationPersistence'
import { getLocalizedTextPair } from '../../domain/localizedText'
import { buildDraftPromptSummary } from './formation-model-helpers'
import type { FormationPageModel } from './types'

interface FormationDraftBannerProps {
  model: FormationPageModel
}

export function FormationDraftBanner({ model }: FormationDraftBannerProps) {
  const { draftPrompt, draftStatus, draftPromptChampions, locale, t } = model

  if (draftPrompt) {
    return (
      <StatusBanner
        tone={draftPrompt.kind === 'restore' ? 'info' : 'error'}
        title={
          draftPrompt.kind === 'restore'
            ? t({ zh: '检测到最近草稿，是否恢复？', en: 'Recent draft detected. Restore it?' })
            : draftPrompt.title
        }
        detail={
          draftPrompt.kind === 'restore'
            ? `${buildDraftPromptSummary(draftPrompt, locale)} · ${getLocalizedTextPair(draftPrompt.preview.layoutName, locale)}`
            : draftPrompt.detail
        }
        actions={
          <ActionButtons
            wrap={false}
            items={[
              {
                id: 'restore-draft',
                label: t({ zh: '恢复最近草稿', en: 'Restore draft' }),
                tone: 'secondary',
                hidden: draftPrompt.kind !== 'restore',
                onClick: model.handleRestoreRecentDraft,
              },
              {
                id: 'keep-draft',
                label: t({ zh: '先保留不恢复', en: 'Keep for now' }),
                tone: 'ghost',
                onClick: model.handleKeepDraftWithoutRestore,
              },
              {
                id: 'discard-draft',
                label: t({ zh: '丢弃旧草稿', en: 'Discard draft' }),
                tone: 'ghost',
                onClick: model.handleDiscardRecentDraft,
              },
            ]}
          />
        }
      >
        {draftPrompt.kind === 'restore' ? (
          <>
            <p className="status-banner__detail">{buildRestoreStatusDetail(draftPrompt.preview)}</p>
            <div className="tag-row">
              <span className="tag-pill tag-pill--muted">
                {t({ zh: '保存版本', en: 'Saved version' })}：{draftPrompt.preview.snapshot.dataVersion}
              </span>
              <span className="tag-pill tag-pill--muted">
                {t({ zh: '恢复版本', en: 'Restore version' })}：{draftPrompt.preview.dataVersion}
              </span>
              <span className="tag-pill tag-pill--muted">
                {draftPrompt.preview.restoreMode === 'compatible'
                  ? t({ zh: '兼容恢复', en: 'Compatible restore' })
                  : t({ zh: '原样恢复', en: 'Exact restore' })}
              </span>
            </div>
            {draftPromptChampions.length > 0 ? (
              <div className="tag-row">
                {draftPromptChampions.map((champion, index) => (
                  <ChampionPill key={`${champion.id}-${index}`} champion={champion} locale={locale} />
                ))}
              </div>
            ) : null}
          </>
        ) : null}
      </StatusBanner>
    )
  }

  if (draftStatus) {
    return <StatusBanner tone={draftStatus.tone} title={draftStatus.title} detail={draftStatus.detail} />
  }

  return null
}
