import { t, type AppLocale } from '../../app/i18n-messages'
import { getPrimaryLocalizedText } from '../../domain/localizedText'
import type { ChampionSkinVisual, ChampionVisual, RemoteGraphicDelivery } from '../../domain/types'
import type { AssetOption } from './types'

export function getDeliveryLabel(delivery: RemoteGraphicDelivery, locale: AppLocale): string {
  if (delivery === 'wrapped-png') {
    return t(locale, '包装头 + PNG')
  }

  if (delivery === 'zlib-png') {
    return t(locale, 'zlib 解压 + PNG')
  }

  return t(locale, '未知传输格式')
}

export function buildAssetOptions(
  visual: ChampionVisual | null,
  selectedSkin: ChampionSkinVisual | null,
  locale: AppLocale,
): AssetOption[] {
  const skinHint = selectedSkin != null
    ? getPrimaryLocalizedText(selectedSkin.name, locale)
    : t(locale, '选择一套皮肤后可查看')

  return [
    {
      id: 'hero-base',
      label: t(locale, '本体立绘'),
      hint: t(locale, '英雄本体立绘槽位'),
      asset: visual?.base ?? null,
      stageVariant: 'art',
    },
    {
      id: 'hero-portrait',
      label: t(locale, '头像槽位'),
      hint: t(locale, '英雄头像资源槽位'),
      asset: visual?.portrait?.remote ?? null,
      stageVariant: 'portrait',
    },
    { id: 'skin-base', label: t(locale, '皮肤立绘'), hint: skinHint, asset: selectedSkin?.base ?? null, stageVariant: 'art' },
    { id: 'skin-large', label: t(locale, '皮肤 large'), hint: skinHint, asset: selectedSkin?.large ?? null, stageVariant: 'art' },
    { id: 'skin-xl', label: t(locale, '皮肤 xl'), hint: skinHint, asset: selectedSkin?.xl ?? null, stageVariant: 'xl' },
    { id: 'skin-portrait', label: t(locale, '皮肤头像'), hint: skinHint, asset: selectedSkin?.portrait ?? null, stageVariant: 'portrait' },
  ]
}

export function countVisualSlots(visual: ChampionVisual | null): number {
  if (!visual) {
    return 0
  }

  const heroSlots = Number(Boolean(visual.base)) + Number(Boolean(visual.portrait?.remote))
  const skinSlots = visual.skins.reduce((total, skin) => {
    return total + Number(Boolean(skin.portrait)) + Number(Boolean(skin.base)) + Number(Boolean(skin.large)) + Number(Boolean(skin.xl))
  }, 0)

  return heroSlots + skinSlots
}

export function getPreviewStageClassName(option: AssetOption | null): string {
  if (!option) {
    return 'visual-workbench__stage'
  }

  return `visual-workbench__stage visual-workbench__stage--${option.stageVariant}`
}
