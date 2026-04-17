import { FieldGroup } from '../../components/FieldGroup'
import { ActiveFilterChipBar } from '../../features/champion-filters/ActiveFilterChipBar'
import { FilterChipFieldGroup } from '../../features/champion-filters/FilterChipFieldGroup'
import { seatOptions } from '../../features/champion-filters/options'
import { formatSeatLabel, getPrimaryLocalizedText, getRoleLabel } from '../../domain/localizedText'
import type { IllustrationsPageModel, ViewFilter } from './types'

const SCOPE_OPTIONS: ReadonlyArray<{
  value: ViewFilter
  label: {
    zh: string
    en: string
  }
}> = [
  { value: 'all', label: { zh: '全部', en: 'All' } },
  { value: 'hero-base', label: { zh: '本体', en: 'Heroes' } },
  { value: 'skin', label: { zh: '皮肤', en: 'Skins' } },
]

type IllustrationsPrimaryFiltersProps = {
  model: IllustrationsPageModel
}

export function IllustrationsPrimaryFilters({ model }: IllustrationsPrimaryFiltersProps) {
  const { locale, t, filters, ui, options, activeFilterChips, hasActiveFilters, actions } = model

  return (
    <>
      <div className="champions-sidebar__header">
        <div>
          <h2 className="section-heading champions-sidebar__title">
            {t({ zh: '立绘筛选', en: 'Illustration filters' })}
          </h2>
          <p className="champions-sidebar__hint">
            {t({
              zh: '沿用英雄筛选页的主线：先用高频条件迅速缩小范围，再按需展开低频标签条件，避免一上来把整页立绘全砸出来。',
              en: 'This follows the champion filter flow: use the frequent controls first, then open the lower-frequency tag groups only when you need them.',
            })}
          </p>
        </div>
        <div className="champions-sidebar__status" role="group" aria-label={t({ zh: '筛选状态操作', en: 'Filter status actions' })}>
          <span className="champions-sidebar__badge">
            {activeFilterChips.length > 0
              ? t({ zh: `${activeFilterChips.length} 项已启用`, en: `${activeFilterChips.length} active` })
              : t({ zh: '未启用', en: 'Idle' })}
          </span>
          <button
            type="button"
            className={
              ui.shareLinkState === 'success'
                ? 'action-button action-button--ghost action-button--compact action-button--toggled'
                : 'action-button action-button--ghost action-button--compact'
            }
            onClick={() => {
              void actions.copyCurrentLink()
            }}
          >
            {ui.shareButtonLabel}
          </button>
          {hasActiveFilters ? (
            <button
              type="button"
              className="action-button action-button--secondary action-button--compact"
              onClick={actions.clearAllFilters}
            >
              {t({ zh: '清空全部', en: 'Clear all' })}
            </button>
          ) : null}
          <span className="illustrations-page__share-status" role="status" aria-live="polite">
            {ui.shareStatusMessage}
          </span>
        </div>
      </div>

      <p className="champions-sidebar__microcopy">
        {t({
          zh: '默认只渲染前一批结果卡片；只要你继续点“显示全部”，剩余立绘才会进入页面并触发图片加载。',
          en: 'Only the first batch of result cards is rendered by default; the remaining illustrations stay out of the DOM until you ask to reveal everything.',
        })}
      </p>

      <ActiveFilterChipBar
        chips={activeFilterChips}
        hint={t({
          zh: '点击任一条件即可单独回退对应维度；全量回退统一使用右上角的清空全部。',
          en: 'Click any chip to clear that dimension only, then use the reset action for a full rollback.',
        })}
        onClearChip={actions.clearActiveFilterChip}
      />

      <div className="champions-sidebar__section-label">{t({ zh: '高频条件', en: 'Frequent filters' })}</div>

      <div className="filter-panel filter-panel--sidebar">
        <FieldGroup
          label={t({ zh: '关键词', en: 'Keyword' })}
          hint={t({
            zh: '支持中英混搜，也会匹配皮肤名、联动队伍、角色标签和资源 graphic id。',
            en: 'Chinese and English queries both work here, and the search also covers skin names, affiliations, tags, and graphic ids.',
          })}
          as="label"
        >
          <input
            className="text-input"
            type="search"
            value={filters.search}
            placeholder={t({
              zh: '搜英雄名、皮肤名、标签或联动队伍',
              en: 'Search names, skins, tags, or affiliations',
            })}
            onChange={(event) => {
              actions.updateSearch(event.target.value)
            }}
          />
        </FieldGroup>

        <FieldGroup
          label={t({ zh: '范围', en: 'Scope' })}
          hint={t({
            zh: '本体与皮肤可以直接切开，先缩短图片瀑布流再细筛。',
            en: 'Split hero art from skins first when you want to shorten the image stream before filtering deeper.',
          })}
          className="filter-group"
        >
          <div className="segmented-control" role="group" aria-label={t({ zh: '立绘范围', en: 'Illustration scope' })}>
            {SCOPE_OPTIONS.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                className={
                  filters.scope === value
                    ? 'segmented-control__button segmented-control__button--active'
                    : 'segmented-control__button'
                }
                aria-pressed={filters.scope === value}
                onClick={() => actions.updateScope(value)}
              >
                {t(label)}
              </button>
            ))}
          </div>
        </FieldGroup>

        <FilterChipFieldGroup
          label={t({ zh: '座位', en: 'Seat' })}
          hint={t({
            zh: '支持多选；同一维度内按“或”匹配。',
            en: 'Multi-select is supported, and matches within this group use OR.',
          })}
          options={seatOptions.map((seat) => ({
            id: seat,
            label: formatSeatLabel(seat, locale),
          }))}
          selectedValues={filters.selectedSeats}
          allLabel={t({ zh: '全部', en: 'All' })}
          onReset={actions.resetSeats}
          onToggle={actions.toggleSeat}
        />

        <FilterChipFieldGroup
          label={t({ zh: '定位', en: 'Role' })}
          hint={t({
            zh: '按所属英雄的定位过滤，适合先把立绘缩到输出、辅助或坦克线。',
            en: 'Filter by the owning champion roles when you want to stay inside DPS, support, or tank lines first.',
          })}
          options={options.roleOptions.map((role) => ({
            id: role,
            label: getRoleLabel(role, locale),
          }))}
          selectedValues={filters.selectedRoles}
          allLabel={t({ zh: '全部', en: 'All' })}
          onReset={actions.resetRole}
          onToggle={actions.toggleRole}
        />

        <FilterChipFieldGroup
          label={t({ zh: '联动队伍', en: 'Affiliation' })}
          hint={t({
            zh: '仍然按英雄元数据多选过滤，方便快速切到固定队伍的皮肤资产。',
            en: 'The affiliation filter still works off champion metadata, which is handy for browsing one team’s skins together.',
          })}
          options={options.affiliationOptions.map((affiliation) => ({
            id: affiliation.original,
            label: getPrimaryLocalizedText(affiliation, locale),
          }))}
          selectedValues={filters.selectedAffiliations}
          allLabel={t({ zh: '全部', en: 'All' })}
          onReset={actions.resetAffiliation}
          onToggle={actions.toggleAffiliation}
        />
      </div>
    </>
  )
}
