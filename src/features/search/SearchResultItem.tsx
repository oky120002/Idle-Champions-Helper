import type { AppLocale } from '../../app/i18n'
import { resolveDataUrl } from '../../data/client'
import { BUCKET_LABELS_ZH, buildHighlightedSnippet, pickBucketText } from './searchHighlight'
import type { SearchHit } from './searchTypes'

const BUCKET_LABELS_EN: Record<string, string> = {
  title: 'Name',
  body: 'Description',
  meta: 'Attributes',
}

interface SearchResultItemProps {
  readonly hit: SearchHit
  readonly locale: AppLocale
  readonly variant: 'compact' | 'full'
}

function pickName(hit: SearchHit, locale: AppLocale): string {
  const { original, display } = hit.doc.name
  return locale === 'zh-CN' ? display || original : original || display
}

function HighlightedSnippet({ hit, locale }: { readonly hit: SearchHit; readonly locale: AppLocale }) {
  const text = pickBucketText(hit.doc, hit.bucket, hit.terms, locale)
  if (!text) {
    return null
  }
  const segments = buildHighlightedSnippet(text, hit.terms)
  return (
    <p className="search-result__snippet">
      {segments.map((segment, index) =>
        segment.match ? (
          <mark key={index}>{segment.text}</mark>
        ) : (
          <span key={index}>{segment.text}</span>
        ),
      )}
    </p>
  )
}

export function SearchResultItem({ hit, locale, variant }: SearchResultItemProps) {
  const name = pickName(hit, locale)
  const bucketLabel =
    locale === 'zh-CN' ? BUCKET_LABELS_ZH[hit.bucket] : (BUCKET_LABELS_EN[hit.bucket] ?? hit.bucket)
  const portraitPath = hit.doc.portrait?.path
  const hasPortrait = portraitPath !== undefined && portraitPath !== ''

  return (
    <div className="search-result">
      {hasPortrait ? (
        <img className="search-result__avatar" src={resolveDataUrl(portraitPath)} alt="" loading="lazy" />
      ) : (
        <span className="search-result__avatar search-result__avatar--fallback" aria-hidden="true">
          {name.slice(0, 1)}
        </span>
      )}
      <div className="search-result__body">
        <div className="search-result__heading">
          <span className="search-result__name">{name}</span>
          {hit.doc.seat !== null && <span className="search-result__seat">#{hit.doc.seat}</span>}
          <span className="search-result__bucket">{bucketLabel}</span>
        </div>
        {variant === 'full' && <HighlightedSnippet hit={hit} locale={locale} />}
      </div>
    </div>
  )
}
