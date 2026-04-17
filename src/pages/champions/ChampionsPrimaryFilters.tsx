import { FieldGroup } from '../../components/FieldGroup'
import { LocalizedText } from '../../components/LocalizedText'
import { ActiveFilterChipBar } from '../../features/champion-filters/ActiveFilterChipBar'
import { FilterChipFieldGroup } from '../../features/champion-filters/FilterChipFieldGroup'
import { seatOptions } from '../../features/champion-filters/options'
import { formatSeatLabel, getRoleLabel } from '../../domain/localizedText'
import type { ChampionsPageModel } from './types'

interface ChampionsPrimaryFiltersProps {
  model: ChampionsPageModel
}

export function ChampionsPrimaryFilters({ model }: ChampionsPrimaryFiltersProps) {
  const {
    locale,
    t,
    search,
    selectedSeats,
    selectedRoles,
    selectedAffiliations,
    roles,
    affiliations,
    activeFilterChips,
    hasActiveFilters,
    updateSearch,
    clearAllFilters,
    clearActiveFilterChip,
    resetSeats,
    toggleSeat,
    resetRole,
    toggleRole,
    resetAffiliation,
    toggleAffiliation,
  } = model

  return (
    <>
      <div className="champions-sidebar__header">
        <div>
          <h3 className="section-heading champions-sidebar__title">{t({ zh: '筛选条件', en: 'Filter controls' })}</h3>
          <p className="champions-sidebar__hint">
            {t({
              zh: '往下浏览卡片时，筛选区会稳稳留在视线附近；所有回退动作都收束到一个入口，减少反复找按钮。',
              en: 'The filters stay close while you browse deeper results, with one clear reset entry instead of scattered actions.',
            })}
          </p>
        </div>
        <div className="champions-sidebar__status" role="group" aria-label={t({ zh: '筛选状态操作', en: 'Filter status actions' })}>
          <span className="champions-sidebar__badge">
            {activeFilterChips.length > 0
              ? t({ zh: `${activeFilterChips.length} 项已启用`, en: `${activeFilterChips.length} active` })
              : t({ zh: '未启用', en: 'Idle' })}
          </span>
          {hasActiveFilters ? (
            <button
              type="button"
              className="action-button action-button--secondary action-button--compact"
              onClick={clearAllFilters}
            >
              {t({ zh: '清空全部', en: 'Clear all' })}
            </button>
          ) : null}
        </div>
      </div>

      <p className="champions-sidebar__microcopy">
        {t({
          zh: '关键词、座位、定位和联动队伍始终直接可见；低频标签型条件会分层收纳，减少大屏浏览时的视觉来回跳。',
          en: 'Keyword, seat, role, and affiliation stay visible while lower-frequency tag filters are folded into calmer sections.',
        })}
      </p>

      <ActiveFilterChipBar
        chips={activeFilterChips}
        hint={t({
          zh: '点击任一条件即可单独清空对应维度；全量回退统一用上方的清空全部。',
          en: 'Click any filter chip to clear that dimension only, then use the reset button above when you want a full reset.',
        })}
        onClearChip={clearActiveFilterChip}
      />

      <div className="champions-sidebar__section-label">{t({ zh: '高频条件', en: 'Frequent filters' })}</div>

      <div className="filter-panel filter-panel--sidebar">
        <FieldGroup
          label={t({ zh: '关键词', en: 'Keyword' })}
          hint={t({
            zh: '支持中英混搜；切换界面语言时，当前关键词和筛选不会被清空。',
            en: 'Chinese and English queries both work here, and switching UI language keeps the current filters.',
          })}
          as="label"
        >
          <input
            className="text-input"
            type="text"
            placeholder={t({ zh: '搜英雄名、标签、联动队伍', en: 'Search names, tags, or affiliations' })}
            value={search}
            onChange={(event) => updateSearch(event.target.value)}
          />
        </FieldGroup>

        <FilterChipFieldGroup
          label={t({ zh: '座位', en: 'Seat' })}
          hint={t({ zh: '支持多选；同一维度按“或”命中。', en: 'Multi-select is supported, and matches within this group use OR.' })}
          options={seatOptions.map((seat) => ({ id: seat, label: formatSeatLabel(seat, locale) }))}
          selectedValues={selectedSeats}
          allLabel={t({ zh: '全部', en: 'All' })}
          onReset={resetSeats}
          onToggle={toggleSeat}
        />

        <FilterChipFieldGroup
          label={t({ zh: '定位', en: 'Role' })}
          hint={t({ zh: '支持多选；会匹配任一已选定位。', en: 'Multi-select is supported, and champions can match any selected role.' })}
          options={roles.map((role) => ({ id: role, label: getRoleLabel(role, locale) }))}
          selectedValues={selectedRoles}
          allLabel={t({ zh: '全部', en: 'All' })}
          onReset={resetRole}
          onToggle={toggleRole}
        />

        <FilterChipFieldGroup
          label={t({ zh: '联动队伍', en: 'Affiliation' })}
          hint={t({ zh: '支持多选；适合同时看多个联动队伍候选。', en: 'Multi-select is supported for comparing multiple affiliations at once.' })}
          options={affiliations.map((affiliation) => ({
            id: affiliation.original,
            label: <LocalizedText text={affiliation} mode="primary" />,
          }))}
          selectedValues={selectedAffiliations}
          allLabel={t({ zh: '全部', en: 'All' })}
          onReset={resetAffiliation}
          onToggle={toggleAffiliation}
        />
      </div>
    </>
  )
}

