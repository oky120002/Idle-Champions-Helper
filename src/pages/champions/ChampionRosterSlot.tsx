import { resolveDataUrl } from '../../data/client'
import type { ChampionEquipmentIcon } from '../../domain/types'
import type { ChampionEquipmentSlotViewModel } from './championRoster'

interface ChampionRosterSlotProps {
  slot: ChampionEquipmentSlotViewModel
  equipmentIcon: ChampionEquipmentIcon | null
}

export function ChampionRosterSlot({ slot, equipmentIcon }: ChampionRosterSlotProps) {
  const levelPercent = slot.levelCap && slot.levelCap > 0 ? Math.min((slot.enchant / slot.levelCap) * 100, 100) : 0
  const legendaryPercent = slot.legendaryCap > 0 ? (slot.legendaryLevel / slot.legendaryCap) * 100 : 0

  return (
    <article
      className={`champion-roster-slot champion-roster-slot--gild-${slot.gild} ${equipmentIcon ? 'champion-roster-slot--has-icon' : ''}`}
    >
      {equipmentIcon ? (
        <div
          className="champion-roster-slot__icon"
          aria-hidden="true"
          style={{
            backgroundImage: `radial-gradient(circle at 72% 70%, rgba(214, 179, 102, 0.18), rgba(88, 128, 196, 0.08) 36%, rgba(9, 14, 21, 0.04) 58%, transparent 78%), url("${resolveDataUrl(equipmentIcon.image.path)}")`,
          }}
        />
      ) : null}
      <div className="champion-roster-slot__backdrop" aria-hidden="true">
        <span>{slot.slotId}</span>
      </div>
      <div className="champion-roster-slot__header">
        <div>
          <p className="champion-roster-slot__eyebrow">槽位 {slot.slotId}</p>
          <h3 className="champion-roster-slot__title">{slot.name}</h3>
        </div>
        <span className={`champion-roster-slot__rarity champion-roster-slot__rarity--${slot.rarity}`}>
          稀有度 {slot.rarity}/4
        </span>
      </div>
      <div className="champion-roster-slot__stats">
        <span>{slot.levelCap ? `装备等级 ${slot.enchant}/${slot.levelCap}` : `装备等级 ${slot.enchant}`}</span>
        {slot.gild > 0 ? (
          <span className={`champion-roster-slot__gild champion-roster-slot__gild--${slot.gild}`}>
            {slot.gild === 2 ? '金装' : '闪耀'}
          </span>
        ) : null}
      </div>
      {slot.levelCap ? (
        <div className="champion-roster-slot__meter" aria-hidden="true">
          <span className="champion-roster-slot__meter-fill" style={{ width: `${levelPercent}%` }} />
        </div>
      ) : null}
      {slot.legendaryCap > 0 ? (
        <>
          <div className="champion-roster-slot__stats champion-roster-slot__stats--legendary">
            <span>传奇等级</span>
            <span>
              {slot.legendaryLevel}/{slot.legendaryCap}
            </span>
          </div>
          <div className="champion-roster-slot__meter champion-roster-slot__meter--legendary" aria-hidden="true">
            <span className="champion-roster-slot__meter-fill" style={{ width: `${legendaryPercent}%` }} />
          </div>
        </>
      ) : null}
    </article>
  )
}
