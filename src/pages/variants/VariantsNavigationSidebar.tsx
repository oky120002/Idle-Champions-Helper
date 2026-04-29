import { useMemo, useState } from 'react'
import { getLocalizedTextPair } from '../../domain/localizedText'
import type { VariantsPageModel } from './types'
import {
  buildVariantNavigationSearchGroups,
  normalizeVariantSearch,
} from './variants-navigation-model'

type VariantsNavigationSidebarProps = {
  model: VariantsPageModel
}

export function VariantsNavigationSidebar({ model }: VariantsNavigationSidebarProps) {
  const {
    locale,
    t,
    state,
    allCampaignGroups,
    selectedCampaignGroup,
    selectedAdventureGroup,
    selectCampaign,
    selectAdventure,
    selectAdventureTarget,
  } = model
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const normalizedQuery = normalizeVariantSearch(query)
  const searchGroups = useMemo(
    () => buildVariantNavigationSearchGroups(allCampaignGroups, normalizedQuery),
    [allCampaignGroups, normalizedQuery],
  )

  if (state.status !== 'ready') {
    return null
  }

  const selectedCampaignLabel = selectedCampaignGroup
    ? getLocalizedTextPair(selectedCampaignGroup.campaign, locale)
    : t({ zh: '选择地图', en: 'Choose campaign' })

  return (
    <div className="variants-nav-sidebar">
      <div
        className="variants-campaign-combobox"
        onBlur={() => {
          window.setTimeout(() => setIsOpen(false), 120)
        }}
      >
        <label className="variants-campaign-combobox__label" htmlFor="variants-campaign-search">
          {t({ zh: '地图 / 关卡', en: 'Campaign / adventure' })}
        </label>
        <input
          id="variants-campaign-search"
          className="text-input variants-campaign-combobox__input"
          type="search"
          value={query}
          placeholder={selectedCampaignLabel}
          onChange={(event) => {
            setQuery(event.target.value)
            setIsOpen(true)
          }}
          onFocus={() => setIsOpen(true)}
        />
        <p className="variants-campaign-combobox__current">
          {t({ zh: `当前地图：${selectedCampaignLabel}`, en: `Current: ${selectedCampaignLabel}` })}
        </p>

        {isOpen ? (
          <div className="variants-campaign-combobox__menu" role="listbox">
            {searchGroups.length > 0 ? (
              searchGroups.map((group) => (
                <section key={group.campaign.id} className="variants-campaign-combobox__group">
                  <button
                    type="button"
                    className="variants-campaign-combobox__campaign"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => {
                      selectCampaign(group.campaign.id)
                      setQuery('')
                      setIsOpen(false)
                    }}
                  >
                    <span>{getLocalizedTextPair(group.campaign.campaign, locale)}</span>
                    <small>
                      {locale === 'zh-CN'
                        ? `${group.campaign.adventures.length} 个关卡`
                        : `${group.campaign.adventures.length} adventures`}
                    </small>
                  </button>

                  {group.adventures.map((adventure) => (
                    <button
                      key={adventure.id}
                      type="button"
                      className="variants-campaign-combobox__adventure"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => {
                        selectAdventureTarget({
                          campaignId: group.campaign.id,
                          adventureId: adventure.adventureId,
                        })
                        setQuery('')
                        setIsOpen(false)
                      }}
                    >
                      <span>{getLocalizedTextPair(adventure.adventure, locale)}</span>
                      <small>
                        {locale === 'zh-CN'
                          ? `${adventure.variants.length} 个变体`
                          : `${adventure.variants.length} variants`}
                      </small>
                    </button>
                  ))}
                </section>
              ))
            ) : (
              <p className="variants-campaign-combobox__empty">
                {t({ zh: '没有匹配的地图或关卡', en: 'No matching campaign or adventure' })}
              </p>
            )}
          </div>
        ) : null}
      </div>

      <div className="variants-adventure-list">
        <div className="variants-adventure-list__header">
          <span>{t({ zh: '关卡', en: 'Adventures' })}</span>
          <strong>{selectedCampaignGroup?.adventures.length ?? 0}</strong>
        </div>
        <div className="variants-adventure-list__items">
          {selectedCampaignGroup?.adventures.map((adventure) => (
            <button
              key={adventure.id}
              type="button"
              className={
                selectedAdventureGroup?.adventureId === adventure.adventureId
                  ? 'variants-adventure-list__item variants-adventure-list__item--active'
                  : 'variants-adventure-list__item'
              }
              onClick={() => selectAdventure(adventure.adventureId)}
            >
              <span>{getLocalizedTextPair(adventure.adventure, locale)}</span>
              <small>
                {locale === 'zh-CN'
                  ? `${adventure.variants.length} 变体`
                  : `${adventure.variants.length} variants`}
              </small>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
