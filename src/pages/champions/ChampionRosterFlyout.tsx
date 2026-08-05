/* eslint-disable max-lines -- 装备浮层是内聚的单文件组件：数据加载、定位、事件、JSX 紧耦合 */
import { type ReactNode, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { loadChampionDetail, loadCollection } from '../../data/client'
import { getPrimaryLocalizedText, getRoleLabel } from '../../domain/localizedText'
import type { Champion, ChampionDetail, ChampionEquipmentIcon } from '../../domain/types'
import type { OwnedHero } from '../../domain/user-profile/types'
import { ChampionAvatar } from '../../components/ChampionAvatar'
import { buildChampionEquipmentSlots } from './championRoster'
import { calculateChampionRosterFlyoutPosition } from './championRosterFlyoutPosition'
import { ChampionRosterSlot } from './ChampionRosterSlot'

interface ChampionRosterFlyoutProps {
  readonly champion: Champion
  readonly ownedHero: OwnedHero | null
  readonly legendaryLevelCap: number
  readonly locale: 'zh-CN' | 'en-US'
  readonly locationSearch: string
  readonly navigationTo?: string
  readonly returnToPath?: string
  readonly returnLabel?: {
    zh: string
    en: string
  }
  readonly anchorRect: DOMRect
  readonly onClose: () => void
  readonly onNavigate: () => void
}

const FLYOUT_VIEWPORT_GUTTER = 14
const FLYOUT_MAX_WIDTH = 420
const FLYOUT_FALLBACK_HEIGHT = 520

interface FlyoutPosition {
  top: number
  left: number
  width: number
  maxHeight: number
  ready: boolean
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
  const [prevChampionId, setPrevChampionId] = useState(champion.id)
  const [equipmentIconsById, setEquipmentIconsById] = useState<Map<string, ChampionEquipmentIcon>>(new Map())
  const flyoutRef = useRef<HTMLDivElement | null>(null)
  const [position, setPosition] = useState<FlyoutPosition>({
    top: Math.max(FLYOUT_VIEWPORT_GUTTER, anchorRect.top),
    left: Math.max(FLYOUT_VIEWPORT_GUTTER, anchorRect.left),
    width: FLYOUT_MAX_WIDTH,
    maxHeight: FLYOUT_FALLBACK_HEIGHT,
    ready: false,
  })

  // champion.id 变化时在渲染期重置为 loading，避免 effect 内同步 setState。
  if (prevChampionId !== champion.id) {
    setPrevChampionId(champion.id)
    setStatus('loading')
    setDetail(null)
  }

  useEffect(() => {
    let active = true

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
    let disposed = false

    loadCollection<ChampionEquipmentIcon>('champion-equipment-icons')
      .then((collection) => {
        if (disposed) {
          return
        }

        setEquipmentIconsById(new Map(collection.items.map((item) => [item.graphicId, item])))
      })
      .catch(() => {
        if (disposed) {
          return
        }

        setEquipmentIconsById(new Map())
      })

    return () => {
      disposed = true
    }
  }, [])

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
  const primaryName = getPrimaryLocalizedText(champion.name, locale)

  useLayoutEffect(() => {
    if (typeof window === 'undefined') {
      return undefined
    }

    const updatePosition = () => {
      const element = flyoutRef.current

      if (!element) {
        return
      }

      const viewportWidth = window.innerWidth
      const viewportHeight = window.innerHeight
      const isCompactViewport = viewportWidth <= 980
      const maxWidth = Math.max(280, viewportWidth - FLYOUT_VIEWPORT_GUTTER * 2)
      const width = isCompactViewport
        ? maxWidth
        : Math.min(FLYOUT_MAX_WIDTH, maxWidth)
      const rectHeight = element.getBoundingClientRect().height
      const measuredHeight = rectHeight > 0 ? rectHeight : FLYOUT_FALLBACK_HEIGHT
      const nextPosition = calculateChampionRosterFlyoutPosition({
        anchorRect,
        viewportWidth,
        viewportHeight,
        flyoutWidth: width,
        flyoutHeight: measuredHeight,
        viewportGutter: FLYOUT_VIEWPORT_GUTTER,
      })

      setPosition({
        width,
        top: nextPosition.top,
        left: nextPosition.left,
        maxHeight: nextPosition.maxHeight,
        ready: true,
      })
    }

    updatePosition()
    window.addEventListener('resize', updatePosition)

    return () => {
      window.removeEventListener('resize', updatePosition)
    }
  }, [anchorRect, slots.length, status])

  const style = {
    top: position.top,
    left: position.left,
    width: position.width,
    maxHeight: position.maxHeight,
    opacity: position.ready ? 1 : 0,
  }

  let rosterContent: ReactNode
  if (ownedHero === null) {
    rosterContent = (
      <div className="champion-roster-flyout__empty">
        当前账号还没有拥有这名英雄，所以这里只保留跳转入口；同步账号后会显示装备、传奇和槽位进度。
      </div>
    )
  } else if (status === 'error') {
    rosterContent = (
      <div className="champion-roster-flyout__empty">
        读取这名英雄的装备定义失败，稍后重试即可。
      </div>
    )
  } else if (status === 'loading') {
    rosterContent = (
      <div className="champion-roster-flyout__empty">
        正在读取装备槽位定义…
      </div>
    )
  } else {
    rosterContent = (
      <div className="champion-roster-flyout__slot-grid">
        {slots.map((slot) => {
          const equipmentIcon = slot.graphicId != null && slot.graphicId !== '' ? equipmentIconsById.get(slot.graphicId) ?? null : null
          return <ChampionRosterSlot key={slot.slotId} slot={slot} equipmentIcon={equipmentIcon} />
        })}
      </div>
    )
  }

  const flyoutContent = (
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

      {rosterContent}
    </div>
  )

  if (typeof document === 'undefined') {
    return flyoutContent
  }

  return createPortal(flyoutContent, document.body)
}
