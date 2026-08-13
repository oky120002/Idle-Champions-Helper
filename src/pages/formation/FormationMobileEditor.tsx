import { ActionButton } from '../../components/ActionButton'
import { ChampionAvatar } from '../../components/ChampionAvatar'
import { formatSeatLabel, getLocalizedTextPair, getRoleLabel } from '../../domain/localizedText'
import { HeroPicker } from './HeroPicker'
import type { FormationPageModel } from './types'

interface FormationMobileEditorProps {
  readonly model: FormationPageModel
}

export function FormationMobileEditor({ model }: FormationMobileEditorProps) {
  const {
    selectedLayout,
    activeMobileSlot,
    activeMobileChampion,
    activeMobileChampionId,
    getAvailableChampionsForSlot,
    locale,
    t,
    handleAssignChampion,
  } = model

  if (!selectedLayout || !activeMobileSlot) {
    return null
  }

  return (
    <div className="formation-mobile-editor" data-testid="formation-mobile-editor">
      <div className="formation-mobile-editor__header">
        <div>
          <p className="formation-mobile-editor__eyebrow">{t("当前编辑槽位")}</p>
          <h3 className="formation-mobile-editor__title" data-testid="formation-mobile-editor-slot">
            {t("槽位 {p0}", { p0: activeMobileSlot.id })}
          </h3>
          <p className="formation-mobile-editor__description">
            {activeMobileChampion
              ? t("当前为 {p0}，点击下方可更换英雄。", { p0: getLocalizedTextPair(activeMobileChampion.name, locale) })
              : t("当前未放置英雄，先从下方列表里选择一名候选。")}
          </p>
        </div>
        {activeMobileChampion ? (
          <ActionButton
            tone="ghost"
            className="formation-mobile-editor__clear"
            onClick={() => handleAssignChampion(activeMobileSlot.id, '')}
          >
            {t("清空槽位")}
          </ActionButton>
        ) : null}
      </div>

      <HeroPicker
        champions={getAvailableChampionsForSlot(activeMobileSlot.id)}
        value={activeMobileChampionId}
        onChange={(heroId) => handleAssignChampion(activeMobileSlot.id, heroId)}
      />

      {activeMobileChampion ? (
        <div className="formation-mobile-editor__current">
          <ChampionAvatar champion={activeMobileChampion} locale={locale} className="champion-avatar--slot" />
          <div className="formation-mobile-editor__current-copy">
            <strong className="formation-mobile-editor__current-name" data-testid="formation-mobile-current-name">
              {getLocalizedTextPair(activeMobileChampion.name, locale)}
            </strong>
            <span className="formation-mobile-editor__current-meta">
              {formatSeatLabel(activeMobileChampion.seat, locale)} ·{' '}
              {activeMobileChampion.roles.map((role) => getRoleLabel(role, locale)).join(' / ')}
            </span>
          </div>
        </div>
      ) : (
        <p className="formation-mobile-editor__empty" data-testid="formation-mobile-current-name">
          {t("当前未放置英雄")}
        </p>
      )}
    </div>
  )
}
