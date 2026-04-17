import { ChampionAvatar } from '../../components/ChampionAvatar'
import { getLocalizedTextPair, getPrimaryLocalizedText } from '../../domain/localizedText'
import type { FormationPageModel } from './types'

interface FormationBoardGridProps {
  model: FormationPageModel
}

export function FormationBoardGrid({ model }: FormationBoardGridProps) {
  const {
    selectedLayout,
    selectedChampions,
    championById,
    championOptions,
    activeMobileSlot,
    conflictingSeats,
    formationBoardStyle,
    locale,
    t,
    getChampionOptionLabel,
    setActiveMobileSlotId,
    handleAssignChampion,
  } = model

  if (!selectedLayout) {
    return null
  }

  return (
    <div className="formation-board-wrap">
      <div className="formation-board" data-testid="formation-board" style={formationBoardStyle}>
        {selectedLayout.slots.map((slot, index) => {
          const selectedChampion = selectedChampions.find((item) => item.slotId === slot.id)?.champion ?? null
          const selectedChampionId = selectedChampion?.id ?? ''
          const champion = selectedChampionId ? championById.get(selectedChampionId) ?? selectedChampion : null
          const hasConflict = champion ? conflictingSeats.includes(champion.seat) : false
          const isMobileSlotActive = activeMobileSlot?.id === slot.id
          const slotLabel = locale === 'zh-CN' ? `槽位 ${index + 1}` : `Slot ${index + 1}`
          const slotAriaLabel = champion
            ? t({
                zh: `编辑槽位 ${index + 1}，当前为 ${getPrimaryLocalizedText(champion.name, locale)}`,
                en: `Edit slot ${index + 1}, current champion ${getPrimaryLocalizedText(champion.name, locale)}`,
              })
            : t({
                zh: `编辑槽位 ${index + 1}，当前未放置`,
                en: `Edit slot ${index + 1}, currently empty`,
              })

          return (
            <div
              key={slot.id}
              className={[
                'formation-slot',
                hasConflict ? 'formation-slot--conflict' : '',
                isMobileSlotActive ? 'formation-slot--active' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              style={{ gridColumn: slot.column, gridRow: slot.row }}
            >
              <button
                type="button"
                className="formation-slot__tap-target"
                data-testid={`formation-mobile-slot-${slot.id}`}
                aria-label={slotAriaLabel}
                aria-pressed={isMobileSlotActive}
                onClick={() => setActiveMobileSlotId(slot.id)}
              />
              <span className="formation-slot__label">{slotLabel}</span>
              <div className="formation-slot__summary" aria-hidden="true">
                {champion ? (
                  <div className="formation-slot__summary-badge">
                    <ChampionAvatar champion={champion} locale={locale} className="champion-avatar--slot-mini" />
                    <span className="formation-slot__summary-seat">{champion.seat}</span>
                  </div>
                ) : (
                  <span className="formation-slot__summary-empty">+</span>
                )}
              </div>
              <div className="formation-slot__controls">
                <select
                  className="slot-select"
                  value={selectedChampionId}
                  onChange={(event) => handleAssignChampion(slot.id, event.target.value)}
                >
                  <option value="">{t({ zh: '未放置', en: 'Empty' })}</option>
                  {championOptions.map((item) => (
                    <option key={item.id} value={item.id}>
                      {getChampionOptionLabel(item)}
                    </option>
                  ))}
                </select>
                {champion ? (
                  <div className="formation-slot__current">
                    <ChampionAvatar champion={champion} locale={locale} className="champion-avatar--slot" />
                    <span className="formation-slot__hint">
                      {t({
                        zh: `当前：${getLocalizedTextPair(champion.name, locale)}`,
                        en: `Current: ${getLocalizedTextPair(champion.name, locale)}`,
                      })}
                    </span>
                  </div>
                ) : (
                  <span className="formation-slot__hint">
                    {t({
                      zh: `坐标 ${slot.row}-${slot.column}`,
                      en: `Position ${slot.row}-${slot.column}`,
                    })}
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
