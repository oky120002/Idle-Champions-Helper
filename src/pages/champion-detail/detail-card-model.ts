import type { AppLocale } from '../../app/i18n'
import { resolveDataUrl } from '../../data/client'
import { getPrimaryLocalizedText } from '../../domain/localizedText'
import type {
  ChampionDetail,
  ChampionIllustration,
  ChampionSkinDetail,
  JsonValue,
} from '../../domain/types'
import { isJsonObject } from './shared'
import type { SkinArtworkIds } from './types'

export function buildRarityLabel(value: string | null, locale: AppLocale): string {
  if (!value) {
    return locale === 'zh-CN' ? '未标注' : 'Unlabeled'
  }

  return locale === 'zh-CN' ? `稀有度 ${value}` : `Rarity ${value}`
}

export function readGraphicId(value: JsonValue, key: string): string | null {
  if (!isJsonObject(value)) {
    return null
  }

  const candidate = value[key]

  if (candidate === null || candidate === undefined) {
    return null
  }

  if (typeof candidate !== 'string' && typeof candidate !== 'number' && typeof candidate !== 'boolean') {
    return null
  }

  const normalized = `${candidate}`.trim()
  return normalized.length > 0 ? normalized : null
}

export function getSkinArtworkIds(skin: ChampionSkinDetail): SkinArtworkIds {
  return {
    baseGraphicId: readGraphicId(skin.details, 'base_graphic_id'),
    largeGraphicId: readGraphicId(skin.details, 'large_graphic_id'),
    xlGraphicId: readGraphicId(skin.details, 'xl_graphic_id'),
    portraitGraphicId: readGraphicId(skin.details, 'portrait_graphic_id'),
  }
}

export function buildSkinPreviewAlt(skin: ChampionSkinDetail, locale: AppLocale): string {
  const primaryName = getPrimaryLocalizedText(skin.name, locale)
  return locale === 'zh-CN' ? `${primaryName}皮肤预览` : `${primaryName} skin preview`
}

export function resolveSkinPreviewUrl(
  skinIllustration: ChampionIllustration | null,
  champion: ChampionDetail['summary'],
): string | null {
  if (skinIllustration) {
    return resolveDataUrl(skinIllustration.image.path)
  }

  return champion.portrait?.path ? resolveDataUrl(champion.portrait.path) : null
}
