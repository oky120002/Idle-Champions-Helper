// 检索文档与命中类型。文档由 scripts/data/build-search-index.ts 产出，
// 三桶（title/body/meta）各自带 en/zh 两份清洗后文本，MiniSearch 索引时合并以兼容双语检索。

export type SearchBucket = 'title' | 'body' | 'meta'

export interface SearchDocumentName {
  original: string
  display: string
}

export interface SearchBucketText {
  en: string
  zh: string
}

export interface SearchDocument {
  championId: string
  name: SearchDocumentName
  seat: number | null
  portrait: { path: string } | null
  title: SearchBucketText
  body: SearchBucketText
  meta: SearchBucketText
}

export interface SearchDocumentCollection {
  items: SearchDocument[]
  updatedAt: string
}

export interface SearchHit {
  doc: SearchDocument
  score: number
  /** 首个（按 boost 优先级）命中桶，决定 snippet 来源与标签。 */
  bucket: SearchBucket
  /** 命中的索引词项，用于在 snippet 中高亮。 */
  terms: string[]
}
