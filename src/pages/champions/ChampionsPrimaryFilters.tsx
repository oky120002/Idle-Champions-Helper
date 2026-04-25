import { LocalizedText } from '../../components/LocalizedText'
import {
  ChampionPrimaryFilterSections,
  type ChampionPrimaryFilterCopy,
} from '../../features/champion-filters/ChampionPrimaryFilterSections'
import type { ChampionsPageModel } from './types'

interface ChampionsPrimaryFiltersProps {
  model: ChampionsPageModel
}

const championsPrimaryFilterCopy: ChampionPrimaryFilterCopy = {
  searchHint: {
    zh: '支持中英混搜；切换界面语言时，当前关键词和筛选不会被清空。',
    en: 'Chinese and English queries both work here, and switching UI language keeps the current filters.',
  },
  searchPlaceholder: {
    zh: '搜英雄名、标签、联动队伍',
    en: 'Search names, tags, or affiliations',
  },
  seatHint: {
    zh: '支持多选；同一维度按“或”命中。',
    en: 'Multi-select is supported, and matches within this group use OR.',
  },
  roleHint: {
    zh: '支持多选；会匹配任一已选定位。',
    en: 'Multi-select is supported, and champions can match any selected role.',
  },
  affiliationHint: {
    zh: '支持多选；适合同时看多个联动队伍候选。',
    en: 'Multi-select is supported for comparing multiple affiliations at once.',
  },
  activeChipHint: {
    zh: '点击任一条件即可单独清空对应维度；全量回退统一用上方的清空全部。',
    en: 'Click any filter chip to clear that dimension only, then use the reset button above when you want a full reset.',
  },
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
    updateSearch,
    clearActiveFilterChip,
    resetSeats,
    toggleSeat,
    resetRole,
    toggleRole,
    resetAffiliation,
    toggleAffiliation,
  } = model

  return (
    <ChampionPrimaryFilterSections
      locale={locale}
      t={t}
      copy={championsPrimaryFilterCopy}
      values={{
        search,
        selectedSeats,
        selectedRoles,
        selectedAffiliations,
      }}
      options={{
        roleOptions: roles,
        affiliationOptions: affiliations,
      }}
      activeFilterChips={activeFilterChips}
      actions={{
        updateSearch,
        clearActiveFilterChip,
        resetSeats,
        toggleSeat,
        resetRole,
        toggleRole,
        resetAffiliation,
        toggleAffiliation,
      }}
      buildAffiliationLabel={(affiliation) => <LocalizedText text={affiliation} mode="primary" />}
      searchType="text"
    />
  )
}
