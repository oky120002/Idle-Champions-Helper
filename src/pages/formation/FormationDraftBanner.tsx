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
  const { draftPrompt, draftStatus } = model

  if (draftPrompt) {
    return <DraftPromptBanner draftPrompt={draftPrompt} model={model} />
  }

  if (draftStatus) {
    return <StatusMessageBanner message={draftStatus} />
  }

  return null
}

interface DraftPromptBannerProps {
  readonly draftPrompt: Exclude<FormationPageModel['draftPrompt'], null>
  readonly model: FormationPageModel
}

function DraftPromptBanner({ draftPrompt, model }: DraftPromptBannerProps) {
  const { draftPromptChampions, locale, t } = model
  const isRestore = draftPrompt.kind === 'restore'

  return (
    <StatusBanner
      tone={isRestore ? 'info' : 'error'}
      title={
        isRestore
          ? t("检测到最近草稿，是否恢复？")
          : t(draftPrompt.title)
      }
      detail={
        isRestore
          ? `${buildDraftPromptSummary(draftPrompt, locale)} · ${getLocalizedTextPair(draftPrompt.preview.layoutName, locale)}`
          : t(draftPrompt.detail)
      }
      actions={
        <ActionButtons
          wrap={false}
          items={[
            {
              id: 'restore-draft',
              label: t("恢复最近草稿"),
              tone: 'secondary',
              hidden: !isRestore,
              onClick: model.handleRestoreRecentDraft,
            },
            {
              id: 'keep-draft',
              label: t("先保留不恢复"),
              tone: 'ghost',
              onClick: model.handleKeepDraftWithoutRestore,
            },
            {
              id: 'discard-draft',
              label: t("丢弃旧草稿"),
              tone: 'ghost',
              onClick: model.handleDiscardRecentDraft,
            },
          ]}
        />
      }
    >
      {isRestore ? (
        <>
          <p className="status-banner__detail">{t(buildRestoreStatusDetail(draftPrompt.preview))}</p>
          <div className="tag-row">
            <span className="tag-pill tag-pill--muted">
              {t("保存版本")}：{draftPrompt.preview.snapshot.dataVersion}
            </span>
            <span className="tag-pill tag-pill--muted">
              {t("恢复版本")}：{draftPrompt.preview.dataVersion}
            </span>
            <span className="tag-pill tag-pill--muted">
              {draftPrompt.preview.restoreMode === 'compatible'
                ? t("兼容恢复")
                : t("原样恢复")}
            </span>
          </div>
          {draftPromptChampions.length > 0 ? (
            <div className="tag-row">
              {draftPromptChampions.map((champion, index) => (
                <ChampionPill key={`${champion.id}-${String(index)}`} champion={champion} locale={locale} />
              ))}
            </div>
          ) : null}
        </>
      ) : null}
    </StatusBanner>
  )
}
