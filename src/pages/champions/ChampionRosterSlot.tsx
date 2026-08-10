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

export function ChampionRosterSlot({ slot, equipmentIcon, locale }: ChampionRosterSlotProps) {
  const isZh = locale === 'zh-CN'
  const gildSuffix = String(slot.gild)
  const raritySuffix = String(slot.rarity)
  const levelPercent = slot.levelCap != null && slot.levelCap > 0 ? Math.min((slot.enchant / slot.levelCap) * 100, 100) : 0
  const legendaryPercent = slot.legendaryCap > 0 ? (slot.legendaryLevel / slot.legendaryCap) * 100 : 0
  const hasLevelCap = slot.levelCap != null && slot.levelCap !== 0

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
          <p className="champion-roster-slot__eyebrow">
            {isZh ? `槽位 ${String(slot.slotId)}` : `Slot ${String(slot.slotId)}`}
          </p>
          <h3 className="champion-roster-slot__title">{slot.name}</h3>
        </div>
        <span className={`champion-roster-slot__rarity champion-roster-slot__rarity--${raritySuffix}`}>
          {isZh ? `稀有度 ${raritySuffix}/4` : `Rarity ${raritySuffix}/4`}
        </span>
      </div>
      <div className="champion-roster-slot__stats">
        <span>
          {isZh
            ? `装备等级 ${String(slot.enchant)}${hasLevelCap ? `/${String(slot.levelCap)}` : ''}`
            : `Gear level ${String(slot.enchant)}${hasLevelCap ? `/${String(slot.levelCap)}` : ''}`}
        </span>
        {slot.gild > 0 ? (
          <span className={`champion-roster-slot__gild champion-roster-slot__gild--${gildSuffix}`}>
            {slot.gild === 2
              ? (isZh ? '金装' : 'Golden')
              : (isZh ? '闪耀' : 'Shiny')}
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
            <span>{isZh ? '传奇等级' : 'Legendary level'}</span>
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
