import { pickLocaleText, type AppLocale } from '../../app/i18n'
import { getPrimaryLocalizedText } from '../../domain/localizedText'
import type { ChampionSkinVisual, ChampionVisual, RemoteGraphicDelivery } from '../../domain/types'
import type { AssetOption } from './types'

export function getDeliveryLabel(delivery: RemoteGraphicDelivery, locale: AppLocale): string {
  if (delivery === 'wrapped-png') {
    return pickLocaleText(locale, { zh: '包装头 + PNG', en: 'Wrapped header + PNG' })
  }

  if (delivery === 'zlib-png') {
    return pickLocaleText(locale, { zh: 'zlib 解压 + PNG', en: 'zlib inflate + PNG' })
  }

  return pickLocaleText(locale, { zh: '未知传输格式', en: 'Unknown delivery' })
}

export function buildAssetOptions(
  visual: ChampionVisual | null,
  selectedSkin: ChampionSkinVisual | null,
  locale: AppLocale,
): AssetOption[] {
  return [
    {
      id: 'hero-base',
      label: pickLocaleText(locale, { zh: '本体立绘', en: 'Base art' }),
      hint: pickLocaleText(locale, { zh: '英雄本体立绘槽位', en: 'Champion base art slot' }),
      asset: visual?.base ?? null,
      stageVariant: 'art',
    },
    {
      id: 'hero-portrait',
      label: pickLocaleText(locale, { zh: '头像槽位', en: 'Portrait slot' }),
      hint: pickLocaleText(locale, { zh: '英雄头像资源槽位', en: 'Champion portrait asset slot' }),
      asset: visual?.portrait?.remote ?? null,
      stageVariant: 'portrait',
    },
    {
      id: 'skin-base',
      label: pickLocaleText(locale, { zh: '皮肤立绘', en: 'Skin art' }),
      hint: selectedSkin
        ? getPrimaryLocalizedText(selectedSkin.name, locale)
        : pickLocaleText(locale, { zh: '选择一套皮肤后可查看', en: 'Pick a skin to inspect this slot' }),
      asset: selectedSkin?.base ?? null,
      stageVariant: 'art',
    },
    {
      id: 'skin-large',
      label: pickLocaleText(locale, { zh: '皮肤 large', en: 'Skin large' }),
      hint: selectedSkin
        ? getPrimaryLocalizedText(selectedSkin.name, locale)
        : pickLocaleText(locale, { zh: '选择一套皮肤后可查看', en: 'Pick a skin to inspect this slot' }),
      asset: selectedSkin?.large ?? null,
      stageVariant: 'art',
    },
    {
      id: 'skin-xl',
      label: pickLocaleText(locale, { zh: '皮肤 xl', en: 'Skin xl' }),
      hint: selectedSkin
        ? getPrimaryLocalizedText(selectedSkin.name, locale)
        : pickLocaleText(locale, { zh: '选择一套皮肤后可查看', en: 'Pick a skin to inspect this slot' }),
      asset: selectedSkin?.xl ?? null,
      stageVariant: 'xl',
    },
    {
      id: 'skin-portrait',
      label: pickLocaleText(locale, { zh: '皮肤头像', en: 'Skin portrait' }),
      hint: selectedSkin
        ? getPrimaryLocalizedText(selectedSkin.name, locale)
        : pickLocaleText(locale, { zh: '选择一套皮肤后可查看', en: 'Pick a skin to inspect this slot' }),
      asset: selectedSkin?.portrait ?? null,
      stageVariant: 'portrait',
    },
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
