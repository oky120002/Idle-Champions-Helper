import { ActionButton } from '../../components/ActionButton'
import { ChampionAvatar } from '../../components/ChampionAvatar'
import { formatSeatLabel, getLocalizedTextPair, getRoleLabel } from '../../domain/localizedText'
import { HeroPicker } from './HeroPicker'
import type { FormationPageModel } from './types'

interface FormationMobileEditorProps {
  model: FormationPageModel
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
          <p className="formation-mobile-editor__eyebrow">{t({ zh: '当前编辑槽位', en: 'Editing slot' })}</p>
          <h3 className="formation-mobile-editor__title" data-testid="formation-mobile-editor-slot">
            {t({ zh: `槽位 ${activeMobileSlot.id}`, en: `Slot ${activeMobileSlot.id}` })}
          </h3>
          <p className="formation-mobile-editor__description">
            {activeMobileChampion
              ? t({
                  zh: `当前为 ${getLocalizedTextPair(activeMobileChampion.name, locale)}，点击下方可更换英雄。`,
                  en: `Currently ${getLocalizedTextPair(activeMobileChampion.name, locale)}. Use the picker below to swap champions.`,
                })
              : t({
                  zh: '当前未放置英雄，先从下方列表里选择一名候选。',
                  en: 'This slot is empty. Pick a champion below to place one here.',
                })}
          </p>
        </div>
        {activeMobileChampion ? (
          <ActionButton
            tone="ghost"
            className="formation-mobile-editor__clear"
            onClick={() => handleAssignChampion(activeMobileSlot.id, '')}
          >
            {t({ zh: '清空槽位', en: 'Clear slot' })}
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
          {t({ zh: '当前未放置英雄', en: 'No champion placed yet' })}
        </p>
      )}
    </div>
  )
}
