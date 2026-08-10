import { type CSSProperties } from 'react'
import { resolveDataUrl } from '../../data/client'
import type { AppLocale } from '../../app/i18n'
import type { ChampionEquipmentIcon } from '../../domain/types'
import type { ChampionEquipmentSlotViewModel } from './championRoster'

interface ChampionRosterSlotProps {
  readonly slot: ChampionEquipmentSlotViewModel
  readonly equipmentIcon: ChampionEquipmentIcon | null
  readonly locale: AppLocale
}

function buildLabels(slot: ChampionEquipmentSlotViewModel, isZh: boolean) {
  const isGolden = slot.gild === 2
  const gildZh = isGolden ? '金装' : '闪耀'
  const gildEn = isGolden ? 'Golden' : 'Shiny'
  return {
    slot: isZh ? `槽位 ${slot.slotId}` : `Slot ${slot.slotId}`,
    rarity: isZh ? `稀有度 ${String(slot.rarity)}/4` : `Rarity ${String(slot.rarity)}/4`,
    gearPrefix: isZh ? '装备等级' : 'Gear level',
    gild: isZh ? gildZh : gildEn,
    legendary: isZh ? '传奇等级' : 'Legendary level',
  }
}

export function ChampionRosterSlot({ slot, equipmentIcon, locale }: ChampionRosterSlotProps) {
  const isZh = locale === 'zh-CN'
  const labels = buildLabels(slot, isZh)
  const gildSuffix = String(slot.gild)
  const raritySuffix = String(slot.rarity)
  const levelPercent = slot.levelCap != null && slot.levelCap > 0 ? Math.min((slot.enchant / slot.levelCap) * 100, 100) : 0
  const legendaryPercent = slot.legendaryCap > 0 ? (slot.legendaryLevel / slot.legendaryCap) * 100 : 0
  const hasLevelCap = slot.levelCap != null && slot.levelCap !== 0
  const levelCapSuffix = hasLevelCap ? `/${String(slot.levelCap)}` : ''

  return (
    <article
      className={`champion-roster-slot champion-roster-slot--gild-${gildSuffix} ${equipmentIcon != null ? 'champion-roster-slot--has-icon' : ''}`}
    >
      {equipmentIcon != null ? (
        <div
          className="champion-roster-slot__icon"
          aria-hidden="true"
          style={{ '--roster-icon-url': `url("${resolveDataUrl(equipmentIcon.image.path)}")` } as CSSProperties}
        />
      ) : null}
      <div className="champion-roster-slot__backdrop" aria-hidden="true">
        <span>{slot.slotId}</span>
      </div>
      <div className="champion-roster-slot__header">
        <div>
          <p className="champion-roster-slot__eyebrow">{labels.slot}</p>
          <h3 className="champion-roster-slot__title">{slot.name}</h3>
        </div>
        <span className={`champion-roster-slot__rarity champion-roster-slot__rarity--${raritySuffix}`}>
          {labels.rarity}
        </span>
      </div>
      <div className="champion-roster-slot__stats">
        <span>{`${labels.gearPrefix} ${String(slot.enchant)}${levelCapSuffix}`}</span>
        {slot.gild > 0 ? (
          <span className={`champion-roster-slot__gild champion-roster-slot__gild--${gildSuffix}`}>
            {labels.gild}
          </span>
        ) : null}
      </div>
      {hasLevelCap ? (
        <div className="champion-roster-slot__meter" aria-hidden="true">
          <span className="champion-roster-slot__meter-fill" style={{ width: `${String(levelPercent)}%` }} />
        </div>
      ) : null}
      {slot.legendaryCap > 0 ? (
        <>
          <div className="champion-roster-slot__stats champion-roster-slot__stats--legendary">
            <span>{labels.legendary}</span>
            <span>
              {slot.legendaryLevel}/{slot.legendaryCap}
            </span>
          </div>
          <div className="champion-roster-slot__meter champion-roster-slot__meter--legendary" aria-hidden="true">
            <span className="champion-roster-slot__meter-fill" style={{ width: `${String(legendaryPercent)}%` }} />
          </div>
        </>
      ) : null}
    </article>
  )
}
