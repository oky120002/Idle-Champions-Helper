import { LocalizedText } from '../../components/LocalizedText'
import {
  ChampionPrimaryFilterSections,
  type ChampionPrimaryFilterCopy,
} from '../../features/champion-filters/ChampionPrimaryFilterSections'
import type { ChampionsPageModel } from './types'

interface ChampionsPrimaryFiltersProps {
  readonly model: ChampionsPageModel
}

const championsPrimaryFilterCopy: ChampionPrimaryFilterCopy = {
  searchHint: { key: '支持中英混搜；切换界面语言时，当前关键词和筛选不会被清空。' },
  searchPlaceholder: { key: '搜英雄名、标签、联动队伍' },
  seatHint: { key: '支持多选；同一维度按“或”命中。' },
  roleHint: { key: '支持多选；会匹配任一已选定位。' },
  affiliationHint: { key: '支持多选；适合同时看多个联动队伍候选。' },
  patronHint: { key: '按赞助人合约筛选——只显示该赞助人允许上场的英雄。' },
  activeChipHint: { key: '点击任一条件即可单独清空对应维度；全量回退统一用上方的清空全部。' },
}

export function ChampionsPrimaryFilters({ model }: ChampionsPrimaryFiltersProps) {
  const {
    locale,
    t,
    search,
    selectedSeats,
    selectedRoles,
    selectedAffiliations,
    selectedPatrons,
    roles,
    affiliations,
    patrons,
    activeFilterChips,
    updateSearch,
    clearActiveFilterChip,
    resetSeats,
    toggleSeat,
    resetRole,
    toggleRole,
    resetAffiliation,
    toggleAffiliation,
    resetPatron,
    togglePatron,
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
        selectedPatrons,
      }}
      options={{
        roleOptions: roles,
        affiliationOptions: affiliations,
        patronOptions: patrons,
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
        resetPatron,
        togglePatron,
      }}
      buildLocalizedLabel={(text) => <LocalizedText text={text} mode="primary" />}
      searchType="text"
    />
  )
}
