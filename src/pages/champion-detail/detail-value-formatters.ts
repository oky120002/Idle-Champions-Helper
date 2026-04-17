import type { AppLocale } from '../../app/i18n'

export function buildNotAvailableLabel(locale: AppLocale): string {
  return locale === 'zh-CN' ? '暂无' : 'Not available'
}

export function formatDigitString(value: string | null, locale: AppLocale): string {
  if (!value) {
    return buildNotAvailableLabel(locale)
  }

  if (/^-?\d+$/.test(value)) {
    return BigInt(value).toLocaleString(locale)
  }

  return value
}

export function formatNumber(value: number | null, locale: AppLocale): string {
  if (value === null || Number.isNaN(value)) {
    return buildNotAvailableLabel(locale)
  }

  return new Intl.NumberFormat(locale).format(value)
}

export function formatBoolean(value: boolean, locale: AppLocale): string {
  return value ? (locale === 'zh-CN' ? '是' : 'Yes') : locale === 'zh-CN' ? '否' : 'No'
}

export function formatTimestamp(value: number | null, locale: AppLocale): string {
  if (value === null || value <= 0) {
    return locale === 'zh-CN' ? '未安排' : 'Not scheduled'
  }

  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value * 1000))
}

export function formatNullableText(value: string | null, locale: AppLocale): string {
  return value?.trim() || buildNotAvailableLabel(locale)
}

export function formatNumberishToken(value: string | null, locale: AppLocale): string {
  if (!value) {
    return buildNotAvailableLabel(locale)
  }

  const numeric = Number(value)

  if (Number.isFinite(numeric)) {
    return new Intl.NumberFormat(locale, {
      maximumFractionDigits: 4,
    }).format(numeric)
  }

  return value
}

export function formatMultiplierValue(value: string | null, locale: AppLocale): string | null {
  if (!value) {
    return null
  }

  const numeric = Number(value)

  if (!Number.isFinite(numeric)) {
    return value
  }

  if (numeric > 0 && numeric < 10) {
    const delta = numeric >= 1 ? (numeric - 1) * 100 : null
    const prefix = `x${new Intl.NumberFormat(locale, {
      maximumFractionDigits: 4,
    }).format(numeric)}`

    if (delta !== null) {
      return `${prefix} (${new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(delta)}%)`
    }

    return prefix
  }

  return `${new Intl.NumberFormat(locale, {
    maximumFractionDigits: 4,
  }).format(numeric)}%`
}

export function isNumberishToken(value: string): boolean {
  return /^-?\d+(?:\.\d+)?$/.test(value)
}
