import type { AppLocale } from '../../app/i18n'
import { getPrimaryLocalizedText } from '../../domain/localizedText'
import type { LocalizedText, Pet, PetAcquisition } from '../../domain/types'

export function buildIllustrationAlt(pet: Pet, locale: AppLocale) {
  const name = getPrimaryLocalizedText(pet.name, locale)
  return locale === 'zh-CN' ? `${name}立绘` : `${name} illustration`
}

export function buildIconAlt(pet: Pet, locale: AppLocale) {
  const name = getPrimaryLocalizedText(pet.name, locale)
  return locale === 'zh-CN' ? `${name}图标` : `${name} icon`
}

export function buildAcquisitionLabel(acquisition: PetAcquisition, locale: AppLocale) {
  const zh = locale === 'zh-CN'

  switch (acquisition.kind) {
    case 'gems':
      return zh ? '宝石商店' : 'Gem shop'
    case 'patron':
      return zh ? '赞助商商店' : 'Patron shop'
    case 'not-yet-available':
      return zh ? '暂未开放' : 'Not yet available'
    case 'premium':
      return buildPremiumAcquisitionLabel(acquisition, zh)
    case 'unknown':
      return zh ? '来源待确认' : 'Source unconfirmed'
  }
}

function buildPremiumAcquisitionLabel(acquisition: PetAcquisition, zh: boolean) {
  const premiumName = acquisition.premiumPackName?.original.toLowerCase() ?? ''

  if (acquisition.sourceType === 'dlc') {
    return zh ? '购买 · DLC' : 'Purchase · DLC'
  }
  if (premiumName.includes('theme pack')) {
    return zh ? '购买 · 主题包' : 'Purchase · Theme pack'
  }
  if (premiumName.includes('familiar pack')) {
    return zh ? '购买 · 熟悉魔宠包' : 'Purchase · Familiar pack'
  }
  if (acquisition.sourceType === 'flash_sale') {
    return zh ? '购买 · 限时闪促' : 'Purchase · Flash sale'
  }
  return zh ? '购买 · 付费包' : 'Purchase · Premium pack'
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
    return formatPatronAcquisitionDetail(acquisition.patronName, acquisition.patronCurrency, acquisition.patronCost, locale)
  }

  if (acquisition.premiumPackName) {
    return getPrimaryLocalizedText(acquisition.premiumPackName, locale)
  }

  if (acquisition.kind === 'not-yet-available') {
    return locale === 'zh-CN' ? '官方 definitions 当前标记为未开放' : 'Marked as not yet available in current definitions'
  }

  if (acquisition.kind === 'unknown' && acquisition.sourceType != null && acquisition.sourceType !== '') {
    return `source=${acquisition.sourceType}`
  }

  return null
}

function formatPatronAcquisitionDetail(
  patronName: LocalizedText,
  patronCurrency: LocalizedText | null,
  patronCost: number,
  locale: AppLocale,
): string {
  const name = getPrimaryLocalizedText(patronName, locale)
  const fallbackCurrency = locale === 'zh-CN' ? '赞助商货币' : 'patron currency'
  const currency = patronCurrency ? getPrimaryLocalizedText(patronCurrency, locale) : fallbackCurrency
  const amount = formatNumber(patronCost, locale)
  return `${name} · ${amount} ${currency}`
}

export function buildAcquisitionNotes(acquisition: PetAcquisition, locale: AppLocale): string[] {
  const notes: string[] = []

  switch (acquisition.kind) {
    case 'patron':
      appendPatronNotes(notes, acquisition, locale)
      break
    case 'premium':
      appendPremiumNotes(notes, acquisition, locale)
      break
    case 'gems':
      appendGemsNotes(notes, acquisition, locale)
      break
    case 'unknown':
      appendUnknownNotes(notes, acquisition, locale)
      break
    case 'not-yet-available':
      break
  }

  if (
    acquisition.sourceType != null &&
    acquisition.sourceType !== '' &&
    acquisition.kind !== 'gems' &&
    acquisition.kind !== 'premium'
  ) {
    notes.push(
      locale === 'zh-CN'
        ? `来源标记：${acquisition.sourceType}`
        : `Source marker: ${acquisition.sourceType}`,
    )
  }

  return notes
}

function appendPatronNotes(notes: string[], acquisition: PetAcquisition, locale: AppLocale) {
  if (acquisition.patronInfluence !== null) {
    const amount = formatNumber(acquisition.patronInfluence, locale)
    notes.push(locale === 'zh-CN' ? `需要 ${amount} 影响力解锁` : `Requires ${amount} influence to unlock`)
  }
}

function appendPremiumNotes(notes: string[], acquisition: PetAcquisition, locale: AppLocale) {
  if (acquisition.premiumPackDescription) {
    notes.push(getPrimaryLocalizedText(acquisition.premiumPackDescription, locale))
  }
  if (acquisition.sourceType === 'dlc') {
    notes.push(locale === 'zh-CN' ? '当前映射到固定 DLC / 付费包。' : 'Currently mapped to a fixed DLC or premium pack.')
  }
  if (acquisition.sourceType === 'flash_sale' && acquisition.premiumPackName === null) {
    notes.push(
      locale === 'zh-CN'
        ? '当前 definitions 只标记为 flash_sale，未映射到固定礼包。'
        : 'Current definitions only mark this pet as flash_sale without a fixed pack mapping.',
    )
  }
}

function appendGemsNotes(notes: string[], acquisition: PetAcquisition, locale: AppLocale) {
  if (acquisition.sourceType === 'shop') {
    notes.push(locale === 'zh-CN' ? '归类为常驻宝石商店条目。' : 'Classified as a permanent gem-shop entry.')
  }
}

function appendUnknownNotes(notes: string[], acquisition: PetAcquisition, locale: AppLocale) {
  if (acquisition.sourceType === null || acquisition.sourceType === '') {
    notes.push(
      locale === 'zh-CN'
        ? '当前 definitions 里没有稳定来源标注。'
        : 'Current definitions do not include a stable source marker.',
    )
  }
}

export function buildStatusLabel(pet: Pet, locale: AppLocale) {
  const zh = locale === 'zh-CN'
  if (pet.isAvailable) {
    return zh ? 'definitions 已启用' : 'Definitions enabled'
  }
  return zh ? 'definitions 未启用' : 'Definitions disabled'
}
