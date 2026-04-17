import { FieldGroup } from '../../components/FieldGroup'
import { getLocalizedTextPair } from '../../domain/localizedText'
import { ALL_CAMPAIGNS } from './constants'
import type { VariantsPageModel } from './types'

type VariantsFilterBarProps = {
  model: VariantsPageModel
}

export function VariantsFilterBar({ model }: VariantsFilterBarProps) {
  const { locale, t, state, search, selectedCampaign, updateSearch, updateSelectedCampaign } = model

  if (state.status !== 'ready') {
    return null
  }

  return (
    <div className="filter-panel filter-panel--compact">
      <FieldGroup
        label={t({ zh: '关键词', en: 'Keyword' })}
        hint={t({
          zh: '变体名、战役、限制文本和奖励文本都支持中英混搜。',
          en: 'Names, campaigns, restriction text, and rewards all support mixed Chinese and English search.',
        })}
        as="label"
      >
        <input
          className="text-input"
          type="text"
          placeholder={t({
            zh: '搜变体名、限制文本、奖励文本',
            en: 'Search names, restriction text, or rewards',
          })}
          value={search}
          onChange={(event) => updateSearch(event.target.value)}
        />
      </FieldGroup>

      <FieldGroup label={t({ zh: '战役', en: 'Campaign' })} as="label">
        <select className="text-input" value={selectedCampaign} onChange={(event) => updateSelectedCampaign(event.target.value)}>
          <option value={ALL_CAMPAIGNS}>{t({ zh: '全部战役', en: 'All campaigns' })}</option>
          {state.campaigns.map((campaign) => (
            <option key={campaign.id} value={campaign.original}>
              {getLocalizedTextPair(campaign, locale)}
            </option>
          ))}
        </select>
      </FieldGroup>
    </div>
  )
}
