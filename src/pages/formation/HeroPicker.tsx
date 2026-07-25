import { useMemo, useState } from 'react'
import { ChampionAvatar } from '../../components/ChampionAvatar'
import { getPrimaryLocalizedText } from '../../domain/localizedText'
import { useI18n } from '../../app/i18n'
import type { Champion } from '../../domain/types'

export interface HeroPickerProps {
  champions: Champion[]
  value: string
  onChange: (heroId: string) => void
  /** 阶段 16.2：拖拽源用；HeroPicker 英雄卡 draggable 时透传该渲染标记。 */
  draggable?: boolean
  onDragStartHero?: (heroId: string) => void
}

/**
 * 英雄选择器（阶段 16.1）：搜索 + 按 seat 分组 + 头像，替代原生 select。
 * 16.2 起英雄卡 draggable（draggable=true + onDragStart 透传 heroId），供阵型槽位 drop 消费。
 */
export function HeroPicker({ champions, value, onChange, draggable = false, onDragStartHero }: HeroPickerProps) {
  const { locale, t } = useI18n()
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)

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

  const selected = value ? champions.find((champion) => champion.id === value) ?? null : null

  function commit(heroId: string) {
    onChange(heroId)
    setOpen(false)
  }

  return (
    <div className="hero-picker" data-testid="hero-picker">
      <button
        type="button"
        className="hero-picker__trigger"
        data-testid="hero-picker-trigger"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        {selected ? getPrimaryLocalizedText(selected.name, locale) : t({ zh: '选择英雄', en: 'Pick champion' })}
      </button>

      {open ? (
        <div className="hero-picker__panel" data-testid="hero-picker-panel">
          <input
            className="hero-picker__search"
            data-testid="hero-picker-search"
            type="search"
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
            <li>
              <button
                type="button"
                data-hero-id=""
                data-selected={value === ''}
                className={value === '' ? 'is-selected' : ''}
                onClick={() => commit('')}
              >
                {t({ zh: '未放置', en: 'Empty' })}
              </button>
            </li>

            {grouped.map(([seat, list]) => (
              <li key={seat} className="hero-picker__group">
                <span className="hero-picker__group-label">
                  {t({ zh: `Seat ${seat}`, en: `Seat ${seat}` })}
                </span>
                <ul>
                  {list.map((champion) => {
                    const isSelected = champion.id === value
                    return (
                      <li key={champion.id}>
                        <button
                          type="button"
                          data-hero-id={champion.id}
                          data-selected={isSelected}
                          draggable={draggable}
                          onDragStart={(event) => {
                            if (draggable) {
                              event.dataTransfer?.setData('text/plain', champion.id)
                              onDragStartHero?.(champion.id)
                            }
                          }}
                          className={['hero-picker__option', isSelected ? 'is-selected' : '']
                            .filter(Boolean)
                            .join(' ')}
                          onClick={() => commit(champion.id)}
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
