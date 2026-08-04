import type { AppLocale } from '../../app/i18n'
import { getPrimaryLocalizedText } from '../../domain/localizedText'
import type { Pet, PetAcquisition } from '../../domain/types'

export function buildIllustrationAlt(pet: Pet, locale: AppLocale) {
  const name = getPrimaryLocalizedText(pet.name, locale)
  return locale === 'zh-CN' ? `${name}立绘` : `${name} illustration`
}

export function buildIconAlt(pet: Pet, locale: AppLocale) {
  const name = getPrimaryLocalizedText(pet.name, locale)
  return locale === 'zh-CN' ? `${name}图标` : `${name} icon`
}

export function buildAcquisitionLabel(acquisition: PetAcquisition, locale: AppLocale) {
  if (acquisition.kind === 'gems') {
    return locale === 'zh-CN' ? '宝石商店' : 'Gem shop'
  }

  if (acquisition.kind === 'patron') {
    return locale === 'zh-CN' ? '赞助商商店' : 'Patron shop'
  }

  if (acquisition.kind === 'not-yet-available') {
    return locale === 'zh-CN' ? '暂未开放' : 'Not yet available'
  }

  if (acquisition.kind === 'premium') {
    const premiumName = acquisition.premiumPackName?.original.toLowerCase() ?? ''

    if (acquisition.sourceType === 'dlc') {
      return locale === 'zh-CN' ? '购买 · DLC' : 'Purchase · DLC'
    }

    if (premiumName.includes('theme pack')) {
      return locale === 'zh-CN' ? '购买 · 主题包' : 'Purchase · Theme pack'
    }

    if (premiumName.includes('familiar pack')) {
      return locale === 'zh-CN' ? '购买 · 熟悉魔宠包' : 'Purchase · Familiar pack'
    }

    if (acquisition.sourceType === 'flash_sale') {
      return locale === 'zh-CN' ? '购买 · 限时闪促' : 'Purchase · Flash sale'
    }

    return locale === 'zh-CN' ? '购买 · 付费包' : 'Purchase · Premium pack'
  }

  return locale === 'zh-CN' ? '来源待确认' : 'Source unconfirmed'
}

function formatNumber(value: number, locale: AppLocale) {
  return new Intl.NumberFormat(locale).format(value)
}

export function buildAcquisitionDetail(acquisition: PetAcquisition, locale: AppLocale) {
  if (acquisition.kind === 'gems' && acquisition.gemCost !== null) {
    const amount = formatNumber(acquisition.gemCost, locale)
    return locale === 'zh-CN' ? `${amount} 宝石` : `${amount} gems`
  }

  if (acquisition.kind === 'patron' && acquisition.patronName && acquisition.patronCost !== null) {
    const patronName = getPrimaryLocalizedText(acquisition.patronName, locale)
    const currency = acquisition.patronCurrency
      ? getPrimaryLocalizedText(acquisition.patronCurrency, locale)
      : locale === 'zh-CN'
        ? '赞助商货币'
        : 'patron currency'
    const amount = formatNumber(acquisition.patronCost, locale)
    return `${patronName} · ${amount} ${currency}`
  }

  if (acquisition.premiumPackName) {
    return getPrimaryLocalizedText(acquisition.premiumPackName, locale)
  }

  if (acquisition.kind === 'not-yet-available') {
    return locale === 'zh-CN' ? '官方 definitions 当前标记为未开放' : 'Marked as not yet available in current definitions'
  }

  if (acquisition.kind === 'unknown' && acquisition.sourceType) {
    return `source=${acquisition.sourceType}`
  }

  return null
}

export function buildAcquisitionNotes(acquisition: PetAcquisition, locale: AppLocale): string[] {
  const notes: string[] = []

  if (acquisition.kind === 'patron' && acquisition.patronInfluence !== null) {
    const amount = formatNumber(acquisition.patronInfluence, locale)
    notes.push(locale === 'zh-CN' ? `需要 ${amount} 影响力解锁` : `Requires ${amount} influence to unlock`)
  }

  if (acquisition.kind === 'premium' && acquisition.premiumPackDescription) {
    notes.push(getPrimaryLocalizedText(acquisition.premiumPackDescription, locale))
  }

  if (acquisition.kind === 'gems' && acquisition.sourceType === 'shop') {
    notes.push(locale === 'zh-CN' ? '归类为常驻宝石商店条目。' : 'Classified as a permanent gem-shop entry.')
  }

  if (acquisition.kind === 'premium' && acquisition.sourceType === 'dlc') {
    notes.push(locale === 'zh-CN' ? '当前映射到固定 DLC / 付费包。' : 'Currently mapped to a fixed DLC or premium pack.')
  }

  if (acquisition.kind === 'premium' && acquisition.sourceType === 'flash_sale' && !acquisition.premiumPackName) {
    notes.push(
      locale === 'zh-CN'
        ? '当前 definitions 只标记为 flash_sale，未映射到固定礼包。'
        : 'Current definitions only mark this pet as flash_sale without a fixed pack mapping.',
    )
  }

  if (acquisition.kind === 'unknown' && !acquisition.sourceType) {
    notes.push(
      locale === 'zh-CN'
        ? '当前 definitions 里没有稳定来源标注。'
        : 'Current definitions do not include a stable source marker.',
    )
  }

  if (acquisition.sourceType && acquisition.kind !== 'gems' && acquisition.kind !== 'premium') {
    notes.push(
      locale === 'zh-CN'
        ? `来源标记：${acquisition.sourceType}`
        : `Source marker: ${acquisition.sourceType}`,
    )
  }

  return notes
}

export function buildStatusLabel(pet: Pet, locale: AppLocale) {
  return pet.isAvailable
    ? locale === 'zh-CN'
      ? 'definitions 已启用'
      : 'Definitions enabled'
    : locale === 'zh-CN'
      ? 'definitions 未启用'
      : 'Definitions disabled'
}
