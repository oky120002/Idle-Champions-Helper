import { Plus } from 'lucide-react'
import type { ReactNode } from 'react'

import { ChampionAvatar } from '../../components/ChampionAvatar'
import { getLocalizedTextPair, getPrimaryLocalizedText } from '../../domain/localizedText'
import type { Champion, FormationSlot } from '../../domain/types'
import { FormationBoardCanvas } from './FormationBoardCanvas'
import type { FormationPageModel } from './types'

interface FormationBoardGridProps {
  readonly model: FormationPageModel
}

/**
 * 阵型编辑器棋盘：复用 FormationBoardCanvas 做格子/头像渲染，
 * 经 slotExtras 注入 formation 专属交互（移动端 tap-target + select 下拉 + 当前英雄卡）。
 */
export function FormationBoardGrid({ model }: FormationBoardGridProps) {
  const {
    selectedLayout,
    selectedChampions,
    championById,
    activeMobileSlot,
    conflictingSeats,
    formationBoardStyle,
    locale,
    t,
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
      onSlotDrop={(slotId, event) => {
        const heroId = event.dataTransfer.getData('text/plain')
        if (heroId) {
          handleAssignChampion(slotId, heroId)
        }
      }}
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
      slotExtras={(slot, champion) => renderSlotExtras(slot, champion, model, locale, t)}
    />
  )
}

function renderSlotExtras(slot: FormationSlot, champion: Champion | null, model: FormationPageModel, locale: FormationPageModel['locale'], t: FormationPageModel['t']): ReactNode {
  const { activeMobileSlot, setActiveMobileSlotId } = model
  const isMobileSlotActive = activeMobileSlot?.id === slot.id
  const slotAriaLabel = buildSlotAriaLabel(slot, champion, locale, t)

  return (
    <>
      <button
        type="button"
        className="formation-slot__tap-target"
        data-testid={`formation-mobile-slot-${slot.id}`}
        aria-label={slotAriaLabel}
        aria-pressed={isMobileSlotActive}
        onClick={() => { setActiveMobileSlotId(slot.id); }}
      />
      <div className="formation-slot__controls">
        {renderSlotSelect(slot, champion, model, t)}
        {renderSlotCurrentInfo(slot, champion, locale, t)}
      </div>
    </>
  )
}

function buildSlotAriaLabel(slot: FormationSlot, champion: Champion | null, locale: FormationPageModel['locale'], t: FormationPageModel['t']): string {
  return champion
    ? t({
        zh: `编辑槽位 ${slot.id}，当前为 ${getPrimaryLocalizedText(champion.name, locale)}`,
        en: `Edit slot ${slot.id}, current champion ${getPrimaryLocalizedText(champion.name, locale)}`,
      })
    : t({
        zh: `编辑槽位 ${slot.id}，当前未放置`,
        en: `Edit slot ${slot.id}, currently empty`,
      })
}

function renderSlotSelect(slot: FormationSlot, champion: Champion | null, model: FormationPageModel, t: FormationPageModel['t']): ReactNode {
  const { getAvailableChampionsForSlot, getChampionOptionLabel, handleAssignChampion } = model
  return (
    <select
      className="slot-select"
      aria-label={t({ zh: `槽位 ${slot.id} 英雄选择`, en: `Champion for slot ${slot.id}` })}
      value={champion?.id ?? ''}
      onChange={(event) => { handleAssignChampion(slot.id, event.target.value); }}
    >
      <option value="">{t({ zh: '未放置', en: 'Empty' })}</option>
      {getAvailableChampionsForSlot(slot.id).map((item) => (
        <option key={item.id} value={item.id}>
          {getChampionOptionLabel(item)}
        </option>
      ))}
    </select>
  )
}

function renderSlotCurrentInfo(slot: FormationSlot, champion: Champion | null, locale: FormationPageModel['locale'], t: FormationPageModel['t']): ReactNode {
  if (champion) {
    return (
      <div className="formation-slot__current">
        <ChampionAvatar champion={champion} locale={locale} className="champion-avatar--slot" />
        <span className="formation-slot__hint">
          {t({
            zh: `当前：${getLocalizedTextPair(champion.name, locale)}`,
            en: `Current: ${getLocalizedTextPair(champion.name, locale)}`,
          })}
        </span>
      </div>
    )
  }
  return (
    <span className="formation-slot__hint">
      {t({
        zh: `坐标 ${slot.row}-${slot.column}`,
        en: `Position ${slot.row}-${slot.column}`,
      })}
    </span>
  )
}
