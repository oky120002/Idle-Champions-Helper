import { Plus } from 'lucide-react'
import { ChampionAvatar } from '../../components/ChampionAvatar'
import { getLocalizedTextPair, getPrimaryLocalizedText } from '../../domain/localizedText'
import { FormationBoardCanvas } from './FormationBoardCanvas'
import type { FormationPageModel } from './types'

interface FormationBoardGridProps {
  model: FormationPageModel
}

/**
 * 阵型编辑器棋盘（阶段 15.1 改组装）：复用 FormationBoardCanvas 做格子/头像渲染，
 * 经 slotExtras 注入 formation 专属交互（移动端 tap-target + select 下拉 + 当前英雄卡）。
 */
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

  const placements = Object.fromEntries(
    selectedChampions.map((item) => [item.slotId, item.champion.id]),
  )

  return (
    <FormationBoardCanvas
      slots={selectedLayout.slots}
      placements={placements}
      championById={championById}
      boardStyle={formationBoardStyle}
      emptyIndicator={
        <span className="formation-slot__summary-empty">
          <Plus aria-hidden="true" strokeWidth={2} />
        </span>
      }
      slotClassName={(slot, champion) => {
        const hasConflict = champion ? conflictingSeats.includes(champion.seat) : false
        const isMobileSlotActive = activeMobileSlot?.id === slot.id
        return (
          [
            hasConflict ? 'formation-slot--conflict' : '',
            isMobileSlotActive ? 'formation-slot--active' : '',
          ]
            .filter(Boolean)
            .join(' ') || undefined
        )
      }}
      slotExtras={(slot, champion, index) => {
        const selectedChampionId = champion?.id ?? ''
        const isMobileSlotActive = activeMobileSlot?.id === slot.id
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
          <>
            <button
              type="button"
              className="formation-slot__tap-target"
              data-testid={`formation-mobile-slot-${slot.id}`}
              aria-label={slotAriaLabel}
              aria-pressed={isMobileSlotActive}
              onClick={() => setActiveMobileSlotId(slot.id)}
            />
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
          </>
        )
      }}
    />
  )
}
