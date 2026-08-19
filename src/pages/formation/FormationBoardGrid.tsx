import type { ReactNode } from 'react'
import { Plus } from 'lucide-react'
import { ChampionAvatar } from '../../components/ChampionAvatar'
import { getLocalizedTextPair, getPrimaryLocalizedText } from '../../domain/localizedText'
import { getFormationSlotLane, type FormationLane } from '../../domain/formationLayout'
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
        if (heroId !== '') {
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
        const classes = [
          hasConflict ? 'formation-slot--conflict' : '',
          isMobileSlotActive ? 'formation-slot--active' : '',
        ]
          .filter(Boolean)
          .join(' ')
        return classes !== '' ? classes : undefined
      }}
      slotExtras={(slot, champion) => renderFormationSlotControls(slot, champion, model)}
    />
  )
}

function getFormationSlotAriaLabel(
  slot: FormationSlot,
  champion: Champion | null,
  model: FormationPageModel,
): string {
  return champion
    ? model.t("编辑槽位 {p0}，当前为 {p1}", { p0: slot.id, p1: getPrimaryLocalizedText(champion.name, model.locale) })
    : model.t("编辑槽位 {p0}，当前未放置", { p0: slot.id })
}

function renderFormationSlotControls(
  slot: FormationSlot,
  champion: Champion | null,
  model: FormationPageModel,
): ReactNode {
  const { t } = model
  const selectedChampionId = champion?.id ?? ''
  const isMobileSlotActive = model.activeMobileSlot?.id === slot.id
  const slotAriaLabel = getFormationSlotAriaLabel(slot, champion, model)

  return (
    <>
      <button
        type="button"
        className="formation-slot__tap-target"
        data-testid={`formation-mobile-slot-${slot.id}`}
        aria-label={slotAriaLabel}
        aria-pressed={isMobileSlotActive}
        onClick={() => model.setActiveMobileSlotId(slot.id)}
      />
      <div className="formation-slot__controls">
        <select
          className="slot-select"
          aria-label={t("槽位 {p0} 英雄选择", { p0: slot.id })}
          value={selectedChampionId}
          onChange={(event) => model.handleAssignChampion(slot.id, event.target.value)}
        >
          <option value="">{t("未放置")}</option>
          {model.getAvailableChampionsForSlot(slot.id).map((item) => (
            <option key={item.id} value={item.id}>
              {model.getChampionOptionLabel(item)}
            </option>
          ))}
        </select>
        {renderSlotHint(slot, champion, model)}
      </div>
    </>
  )
}

function renderSlotHint(
  slot: FormationSlot,
  champion: Champion | null,
  model: FormationPageModel,
): ReactNode {
  const { t, locale } = model
  if (champion) {
    return (
      <div className="formation-slot__current">
        <ChampionAvatar champion={champion} locale={locale} className="champion-avatar--slot" />
        <span className="formation-slot__hint">
          {t("当前：{p0}", { p0: getLocalizedTextPair(champion.name, locale) })}
        </span>
      </div>
    )
  }
  const lane = model.selectedLayout ? getFormationSlotLane(model.selectedLayout, slot.id) : null
  if (lane) {
    return <span className="formation-slot__hint">{t(getFormationLaneLabel(lane))}</span>
  }
  return (
    <span className="formation-slot__hint">
      {t("第 {p0} 排", { p0: String(slot.row) })}
    </span>
  )
}

function getFormationLaneLabel(lane: FormationLane): string {
  return {
    front: '前排',
    middle: '中排',
    back: '后排',
  }[lane]
}
