import { useEffect, useMemo, useRef, useState } from 'react'
import { ChampionAvatar } from '../../components/ChampionAvatar'
import { formatSeatLabel, getPrimaryLocalizedText } from '../../domain/localizedText'
import { useI18n } from '../../app/i18n'
import type { Champion } from '../../domain/types'

export interface HeroPickerProps {
  champions: Champion[]
  /** 当前选中英雄 id；仅 picker 模式（传 onChange）有意义。 */
  value?: string
  /** 传入即启用 picker 模式（点击选择 + 未放置 + 选中态）；省略则作纯拖拽源面板。 */
  onChange?: (heroId: string) => void
  /** 为 true 时英雄卡 draggable=true 并写 dataTransfer（heroId），供槽位 drop 消费。 */
  draggable?: boolean
  className?: string
}

const PANEL_ID = 'hero-picker-panel'

/**
 * 英雄选择器（阶段 16.1）：搜索 + 按 seat 分组 + 头像。
 * - picker 模式（传 onChange）：点击选择 + 未放置 + 选中态，供移动端 MobileEditor 使用。
 * - 拖拽源模式（省略 onChange）：英雄卡 draggable 写 dataTransfer，供桌面槽位 drop 消费。
 * seat 标签复用 formatSeatLabel，与 FormationMobileEditor 等消费方一致。
 */
export function HeroPicker({ champions, value = '', onChange, draggable = false, className }: HeroPickerProps) {
  const { locale, t } = useI18n()
  const hasPicker = onChange !== undefined
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // 复用 ChampionRosterFlyout 的外击 + Esc 关闭模式：面板打开时才挂监听。
  useEffect(() => {
    if (!open) {
      return
    }
    function handlePointerDown(event: PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false)
      }
    }
    window.addEventListener('pointerdown', handlePointerDown)
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('pointerdown', handlePointerDown)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  const filtered = useMemo(() => {
    const keyword = query.trim().toLowerCase()
    const sorted = [...champions].sort((left, right) => left.seat - right.seat || left.id.localeCompare(right.id))
    if (!keyword) {
      return sorted
    }
    return sorted.filter(
      (champion) =>
        getPrimaryLocalizedText(champion.name, locale).toLowerCase().includes(keyword)
        || champion.id.toLowerCase().includes(keyword),
    )
  }, [champions, query, locale])

  const grouped = useMemo(() => {
    const bySeat = new Map<number, Champion[]>()
    for (const champion of filtered) {
      const list = bySeat.get(champion.seat) ?? []
      list.push(champion)
      bySeat.set(champion.seat, list)
    }
    return [...bySeat.entries()].sort((left, right) => left[0] - right[0])
  }, [filtered])

  const selected = hasPicker && value ? champions.find((champion) => champion.id === value) ?? null : null

  function commit(heroId: string) {
    onChange?.(heroId)
    setOpen(false)
  }

  const triggerLabel = selected
    ? getPrimaryLocalizedText(selected.name, locale)
    : hasPicker
      ? t({ zh: '选择英雄', en: 'Pick champion' })
      : t({ zh: '拖拽英雄到槽位', en: 'Drag champion to a slot' })

  return (
    <div className={['hero-picker', className].filter(Boolean).join(' ')} data-testid="hero-picker" ref={containerRef}>
      <button
        type="button"
        className="hero-picker__trigger"
        data-testid="hero-picker-trigger"
        aria-expanded={open}
        aria-controls={open ? PANEL_ID : undefined}
        onClick={() => setOpen((current) => !current)}
      >
        {triggerLabel}
      </button>

      {open ? (
        <div
          className="hero-picker__panel"
          data-testid="hero-picker-panel"
          id={PANEL_ID}
          role="group"
          aria-label={t({ zh: '英雄选择', en: 'Champion picker' })}
        >
          <input
            className="hero-picker__search"
            data-testid="hero-picker-search"
            type="search"
            aria-label={t({ zh: '搜索英雄', en: 'Search champions' })}
            placeholder={t({ zh: '搜索英雄', en: 'Search champions' })}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />

          {filtered.length === 0 ? (
            <p className="hero-picker__empty" data-testid="hero-picker-empty">
              {t({ zh: '没有匹配的英雄', en: 'No matching champions' })}
            </p>
          ) : null}

          <ul className="hero-picker__list">
            {hasPicker ? (
              <li>
                <button
                  type="button"
                  data-hero-id=""
                  aria-pressed={value === ''}
                  className={value === '' ? 'is-selected' : ''}
                  onClick={() => commit('')}
                >
                  {t({ zh: '未放置', en: 'Empty' })}
                </button>
              </li>
            ) : null}

            {grouped.map(([seat, list]) => (
              <li key={seat} className="hero-picker__group">
                <span className="hero-picker__group-label">{formatSeatLabel(seat, locale)}</span>
                <ul>
                  {list.map((champion) => {
                    const isSelected = hasPicker && champion.id === value
                    return (
                      <li key={champion.id}>
                        <button
                          type="button"
                          data-hero-id={champion.id}
                          aria-pressed={hasPicker ? isSelected : undefined}
                          draggable={draggable}
                          onDragStart={(event) => {
                            if (draggable) {
                              event.dataTransfer?.setData('text/plain', champion.id)
                            }
                          }}
                          className={['hero-picker__option', isSelected ? 'is-selected' : '']
                            .filter(Boolean)
                            .join(' ')}
                          onClick={hasPicker ? () => commit(champion.id) : undefined}
                        >
                          <ChampionAvatar champion={champion} locale={locale} className="champion-avatar--slot-mini" />
                          <span>{getPrimaryLocalizedText(champion.name, locale)}</span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  )
}
