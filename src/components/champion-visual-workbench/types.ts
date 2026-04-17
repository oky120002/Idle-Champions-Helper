import type { AppLocale } from '../../app/i18n'
import type { Champion, ChampionSkinVisual, ChampionVisual, RemoteGraphicAsset } from '../../domain/types'

export type AssetSelection =
  | 'hero-base'
  | 'hero-portrait'
  | 'skin-base'
  | 'skin-large'
  | 'skin-xl'
  | 'skin-portrait'

export type AssetOption = {
  id: AssetSelection
  label: string
  hint: string
  asset: RemoteGraphicAsset | null
  stageVariant: 'art' | 'portrait' | 'xl'
}

export type ChampionVisualWorkbenchProps = {
  champion: Champion
  visual: ChampionVisual | null
  locale: AppLocale
  onClose: () => void
}

export type ChampionVisualWorkbenchModel = {
  locale: AppLocale
  champion: Champion
  visual: ChampionVisual | null
  primaryName: string
  secondaryName: string | null
  selectedSkin: ChampionSkinVisual | null
  selectedAssetId: AssetSelection
  selectedAssetOption: AssetOption | null
  selectedAsset: RemoteGraphicAsset | null
  assetOptions: AssetOption[]
  skinCount: number
  visualSlotCount: number
  setSelectedSkinId: (skinId: string) => void
  setSelectedAssetId: (assetId: AssetSelection) => void
}
