import type { AppLocale } from '../../app/i18n'
import type { SearchBucket, SearchDocument } from './searchTypes'

export const BUCKET_LABELS_ZH: Record<SearchBucket, string> = {
  title: '名称',
  body: '描述',
  meta: '属性',
}

export interface SnippetSegment {
  text: string
  match: boolean
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// 选择能在其中命中词项的语言文本：优先用户 locale，未命中则回退另一语言，
// 保证英文词在中文 locale 下（或反之）仍能高亮。
export function pickBucketText(
  doc: SearchDocument,
  bucket: SearchBucket,
  terms: string[],
  locale: AppLocale,
): string {
  const primary = locale === 'zh-CN' ? doc[bucket].zh : doc[bucket].en
  const secondary = locale === 'zh-CN' ? doc[bucket].en : doc[bucket].zh
  const contains = (text: string) =>
    terms.some((term) => Boolean(term) && text.toLowerCase().includes(term.toLowerCase()))

  return contains(primary) ? primary : secondary
}

// 用命中词项在桶原文里定位首个命中位置，截取窗口并高亮窗口内所有命中词（大小写不敏感）。
// 词项来自 MiniSearch（已小写），原文保留大小写故做不敏感匹配。
export function buildHighlightedSnippet(
  bucketText: string,
  matchedTerms: string[],
  windowChars = 80,
): SnippetSegment[] {
  const terms = matchedTerms.filter(Boolean)
  const fallback = bucketText.slice(0, windowChars)

  if (!bucketText || terms.length === 0) {
    return [{ text: fallback, match: false }]
  }

  const lower = bucketText.toLowerCase()
  let earliest = -1
  for (const term of terms) {
    const idx = lower.indexOf(term.toLowerCase())
    if (idx !== -1 && (earliest === -1 || idx < earliest)) {
      earliest = idx
    }
  }

  if (earliest === -1) {
    return [{ text: fallback, match: false }]
  }

  const half = Math.floor(windowChars / 2)
  const start = Math.max(0, earliest - half)
  const end = Math.min(bucketText.length, start + windowChars)
  const window = bucketText.slice(start, end)
  const pattern = new RegExp(`(${terms.map(escapeRegExp).join('|')})`, 'giu')

  const segments: SnippetSegment[] = []
  if (start > 0) {
    segments.push({ text: '…', match: false })
  }

  let lastIndex = 0
  for (const match of window.matchAll(pattern)) {
    const index = match.index ?? 0
    if (index > lastIndex) {
      segments.push({ text: window.slice(lastIndex, index), match: false })
    }
    segments.push({ text: match[0], match: true })
    lastIndex = index + match[0].length
  }
  if (lastIndex < window.length) {
    segments.push({ text: window.slice(lastIndex), match: false })
  }

  if (end < bucketText.length) {
    segments.push({ text: '…', match: false })
  }

  return segments
}
