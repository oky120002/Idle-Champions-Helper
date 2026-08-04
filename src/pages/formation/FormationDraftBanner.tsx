import { ActionButtons } from '../../components/ActionButtons'
import { ChampionPill } from '../../components/ChampionPill'
import { StatusBanner } from '../../components/StatusBanner'
import { StatusMessageBanner } from '../../components/StatusMessageBanner'
import { buildRestoreStatusDetail } from '../../data/formationPersistence'
import { getLocalizedTextPair } from '../../domain/localizedText'
import { buildDraftPromptSummary } from './formation-model-helpers'
import type { FormationPageModel } from './types'

interface FormationDraftBannerProps {
  readonly model: FormationPageModel
}

export function FormationDraftBanner({ model }: FormationDraftBannerProps) {
  const { draftPrompt, draftStatus, draftPromptChampions, locale, t } = model

  if (draftPrompt) {
    return renderDraftPromptBanner(model, draftPrompt, draftPromptChampions, locale, t)
  }

  if (draftStatus) {
    return <StatusMessageBanner message={draftStatus} />
  }

  return null
}

function renderDraftPromptBanner(
  model: FormationPageModel,
  draftPrompt: NonNullable<FormationPageModel['draftPrompt']>,
  draftPromptChampions: FormationPageModel['draftPromptChampions'],
  locale: FormationPageModel['locale'],
  t: FormationPageModel['t'],
) {
  return (
    <StatusBanner
      tone={draftPrompt.kind === 'restore' ? 'info' : 'error'}
      title={resolveDraftTitle(draftPrompt, t)}
      detail={resolveDraftDetail(draftPrompt, locale, t)}
      actions={
        <ActionButtons
          wrap={false}
          items={buildDraftActions(model, draftPrompt, t)}
        />
      }
    >
      {draftPrompt.kind === 'restore' ? (
        <RestoreDraftChildren draftPrompt={draftPrompt} champions={draftPromptChampions} locale={locale} t={t} />
      ) : null}
    </StatusBanner>
  )
}

function resolveDraftTitle(draftPrompt: NonNullable<FormationPageModel['draftPrompt']>, t: FormationPageModel['t']) {
  return draftPrompt.kind === 'restore'
    ? t({ zh: '检测到最近草稿，是否恢复？', en: 'Recent draft detected. Restore it?' })
    : t(draftPrompt.title)
}

function resolveDraftDetail(draftPrompt: NonNullable<FormationPageModel['draftPrompt']>, locale: FormationPageModel['locale'], t: FormationPageModel['t']) {
  return draftPrompt.kind === 'restore'
    ? `${buildDraftPromptSummary(draftPrompt, locale)} · ${getLocalizedTextPair(draftPrompt.preview.layoutName, locale)}`
    : t(draftPrompt.detail)
}

function buildDraftActions(model: FormationPageModel, draftPrompt: NonNullable<FormationPageModel['draftPrompt']>, t: FormationPageModel['t']) {
  return [
    {
      id: 'restore-draft',
      label: t({ zh: '恢复最近草稿', en: 'Restore draft' }),
      tone: 'secondary' as const,
      hidden: draftPrompt.kind !== 'restore',
      onClick: model.handleRestoreRecentDraft,
    },
    {
      id: 'keep-draft',
      label: t({ zh: '先保留不恢复', en: 'Keep for now' }),
      tone: 'ghost' as const,
      onClick: model.handleKeepDraftWithoutRestore,
    },
    {
      id: 'discard-draft',
      label: t({ zh: '丢弃旧草稿', en: 'Discard draft' }),
      tone: 'ghost' as const,
      onClick: model.handleDiscardRecentDraft,
    },
  ]
}

function RestoreDraftChildren({ draftPrompt, champions, locale, t }: {
  readonly draftPrompt: Extract<NonNullable<FormationPageModel['draftPrompt']>, { kind: 'restore' }>
  readonly champions: FormationPageModel['draftPromptChampions']
  readonly locale: FormationPageModel['locale']
  readonly t: FormationPageModel['t']
}) {
  return (
    <>
      <p className="status-banner__detail">{t(buildRestoreStatusDetail(draftPrompt.preview))}</p>
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
      {champions.length > 0 ? (
        <div className="tag-row">
          {champions.map((champion, index) => (
            <ChampionPill key={`${champion.id}-${index}`} champion={champion} locale={locale} />
          ))}
        </div>
      ) : null}
    </>
  )
}
