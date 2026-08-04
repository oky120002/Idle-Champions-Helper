import { useMemo, useState } from 'react'
import { getPrimaryLocalizedText, getSecondaryLocalizedText } from '../../domain/localizedText'
import { buildAssetOptions, countVisualSlots } from './asset-model'
import type { AssetSelection, ChampionVisualWorkbenchModel, ChampionVisualWorkbenchProps } from './types'

export function useChampionVisualWorkbenchModel({ champion, visual, locale }: ChampionVisualWorkbenchProps): ChampionVisualWorkbenchModel {
  const primaryName = getPrimaryLocalizedText(champion.name, locale)
  const secondaryName = getSecondaryLocalizedText(champion.name, locale)
  const [selectedSkinId, setSelectedSkinId] = useState<string | null>(visual?.skins[0]?.id ?? null)
  const [selectedAssetId, setSelectedAssetId] = useState<AssetSelection>('hero-base')

  const selectedSkin = useMemo(() => {
    if (!visual?.skins.length || !selectedSkinId) {
      return null
    }

    return visual.skins.find((skin) => skin.id === selectedSkinId) ?? visual.skins[0] ?? null
  }, [selectedSkinId, visual])

  const assetOptions = useMemo(() => buildAssetOptions(visual, selectedSkin, locale), [visual, selectedSkin, locale])
  const availableAssetOptions = useMemo(() => assetOptions.filter((option) => option.asset), [assetOptions])
  const selectedAssetOption = availableAssetOptions.find((option) => option.id === selectedAssetId) ?? availableAssetOptions[0] ?? null
  const selectedAsset = selectedAssetOption?.asset ?? null

  return {
    locale,
    champion,
    visual,
    primaryName,
    secondaryName,
    selectedSkin,
    selectedAssetId,
    selectedAssetOption,
    selectedAsset,
    assetOptions,
    skinCount: visual?.skins.length ?? 0,
    visualSlotCount: countVisualSlots(visual),
    setSelectedSkinId,
    setSelectedAssetId,
  }
}
