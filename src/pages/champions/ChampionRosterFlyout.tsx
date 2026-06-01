import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { loadChampionDetail } from '../../data/client'
import { getPrimaryLocalizedText, getRoleLabel } from '../../domain/localizedText'
import type { Champion, ChampionDetail } from '../../domain/types'
import type { OwnedHero } from '../../domain/user-profile/types'
import { ChampionAvatar } from '../../components/ChampionAvatar'
import { buildChampionEquipmentSlots } from './championRoster'

interface ChampionRosterFlyoutProps {
  champion: Champion
  ownedHero: OwnedHero | null
  legendaryLevelCap: number
  locale: 'zh-CN' | 'en-US'
  locationSearch: string
  navigationTo?: string
  returnToPath?: string
  returnLabel?: {
    zh: string
    en: string
  }
  anchorRect: DOMRect
  onClose: () => void
  onNavigate: () => void
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

export function ChampionRosterFlyout({
  champion,
  ownedHero,
  legendaryLevelCap,
  locale,
  locationSearch,
  navigationTo = '/champions',
  returnToPath = '/champions',
  returnLabel = { zh: '返回英雄筛选', en: 'Back to champions' },
  anchorRect,
  onClose,
  onNavigate,
}: ChampionRosterFlyoutProps) {
  const [detail, setDetail] = useState<ChampionDetail | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const flyoutRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    let active = true
    setStatus('loading')
    setDetail(null)

    loadChampionDetail(champion.id)
      .then((nextDetail) => {
        if (!active) {
          return
        }

        setDetail(nextDetail)
        setStatus('ready')
      })
      .catch(() => {
        if (!active) {
          return
        }

        setStatus('error')
      })

    return () => {
      active = false
    }
  }, [champion.id])

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (flyoutRef.current && !flyoutRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('pointerdown', handlePointerDown)
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('pointerdown', handlePointerDown)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [onClose])

  const slots = useMemo(
    () => buildChampionEquipmentSlots(detail, ownedHero, legendaryLevelCap),
    [detail, legendaryLevelCap, ownedHero],
  )
  const panelWidth = 420
  const left = anchorRect.right + 18 + panelWidth <= window.innerWidth - 20
    ? anchorRect.right + 18
    : anchorRect.left - panelWidth - 18
  const style = {
    top: clamp(anchorRect.top - 6, 18, Math.max(18, window.innerHeight - 520)),
    left: clamp(left, 18, Math.max(18, window.innerWidth - panelWidth - 18)),
    width: panelWidth,
  }
  const primaryName = getPrimaryLocalizedText(champion.name, locale)

  return (
    <div
      ref={flyoutRef}
      className="champion-roster-flyout"
      style={style}
      role="dialog"
      aria-modal="false"
      aria-label={`${primaryName} 装备浮层`}
    >
      <div className="champion-roster-flyout__header">
        <Link
          className="champion-roster-flyout__identity"
          to={{ pathname: `/champions/${champion.id}`, search: locationSearch }}
          state={{
            activeNavigationTo: navigationTo,
            returnTo: {
              pathname: returnToPath,
              search: locationSearch,
            },
            returnLabel,
          }}
          onClick={onNavigate}
        >
          <ChampionAvatar champion={champion} locale={locale} className="champion-avatar--slot" loading="eager" />
          <div className="champion-roster-flyout__identity-copy">
            <span className="champion-roster-flyout__eyebrow">Seat {champion.seat}</span>
            <strong>{primaryName}</strong>
            <span>{champion.roles.map((role) => getRoleLabel(role, locale)).join(' / ')}</span>
          </div>
        </Link>
        <button type="button" className="champion-roster-flyout__close" onClick={onClose} aria-label="关闭装备浮层">
          关闭
        </button>
      </div>

      {!ownedHero ? (
        <div className="champion-roster-flyout__empty">
          当前账号还没有拥有这名英雄，所以这里只保留跳转入口；同步账号后会显示装备、传奇和槽位进度。
        </div>
      ) : status === 'error' ? (
        <div className="champion-roster-flyout__empty">
          读取这名英雄的装备定义失败，稍后重试即可。
        </div>
      ) : status === 'loading' ? (
        <div className="champion-roster-flyout__empty">
          正在读取装备槽位定义…
        </div>
      ) : (
        <div className="champion-roster-flyout__slot-grid">
          {slots.map((slot) => {
            const rarityPercent = slot.rarity > 0 ? (slot.rarity / 4) * 100 : 0
            const legendaryPercent = slot.legendaryCap > 0 ? (slot.legendaryLevel / slot.legendaryCap) * 100 : 0

            return (
              <article
                key={slot.slotId}
                className={`champion-roster-slot champion-roster-slot--gild-${slot.gild}`}
              >
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
                  <span>装备等级 {slot.enchant}</span>
                  <span>
                    {slot.gild === 2 ? '金装' : slot.gild === 1 ? '闪耀' : '普通边框'}
                  </span>
                </div>
                <div className="champion-roster-slot__meter" aria-hidden="true">
                  <span className="champion-roster-slot__meter-fill" style={{ width: `${rarityPercent}%` }} />
                </div>
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
          })}
        </div>
      )}
    </div>
  )
}
