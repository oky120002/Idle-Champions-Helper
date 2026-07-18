import MiniSearch from 'minisearch'
import { loadSearchDocuments } from '../../data/client'
import { tokenize } from './searchTokenizer'
import type { SearchBucket, SearchDocument, SearchDocumentCollection, SearchHit } from './searchTypes'

// 桶权重：英雄名 > 关键字标签 > 长正文。命中桶优先级同序，用于决定 snippet 来源。
const BOOST: Record<SearchBucket, number> = { title: 3, meta: 2, body: 1.5 }
const BUCKET_PRIORITY: SearchBucket[] = ['title', 'meta', 'body']

interface IndexedDocument {
  championId: string
  title: string
  body: string
  meta: string
}

export interface SearchEngine {
  search(query: string, limit: number): SearchHit[]
}

function toIndexedDocument(doc: SearchDocument): IndexedDocument {
  return {
    championId: doc.championId,
    title: `${doc.title.en} ${doc.title.zh}`,
    body: `${doc.body.en} ${doc.body.zh}`,
    meta: `${doc.meta.en} ${doc.meta.zh}`,
  }
}

export function buildEngine(collection: SearchDocumentCollection): SearchEngine {
  const byId = new Map<string, SearchDocument>()
  for (const doc of collection.items) {
    byId.set(doc.championId, doc)
  }

  const mini = new MiniSearch<IndexedDocument>({
    idField: 'championId',
    fields: ['title', 'body', 'meta'],
    processTerm: (term) => term,
    tokenize,
    searchOptions: { prefix: true, fuzzy: 0.2, boost: BOOST },
  })
  mini.addAll(collection.items.map(toIndexedDocument))

  return {
    search(query: string, limit: number): SearchHit[] {
      const trimmed = query.trim()
      if (!trimmed) {
        return []
      }

      const results = mini.search(trimmed)
      const hits: SearchHit[] = []
      for (const result of results) {
        const doc = byId.get(result.id)
        if (!doc) {
          continue
        }
        // MiniSearch 的 match 形如 { term: [field, ...] }（词项 → 命中字段），反转得到命中字段集。
        const match = (result.match ?? {}) as Record<string, string[]>
        const matchedBuckets = new Set<SearchBucket>()
        for (const fields of Object.values(match)) {
          for (const field of fields ?? []) {
            if (field === 'title' || field === 'body' || field === 'meta') {
              matchedBuckets.add(field)
            }
          }
        }
        const bucket = BUCKET_PRIORITY.find((candidate) => matchedBuckets.has(candidate)) ?? 'body'
        hits.push({ doc, score: result.score, bucket, terms: result.terms ?? [] })
      }

      return hits.slice(0, limit)
    },
  }
}

let enginePromise: Promise<SearchEngine | null> | null = null

// 模块级单例：首次调用才加载文档并建索引，之后复用。失败时重置以便重试。
export function getSearchEngine(): Promise<SearchEngine | null> {
  if (!enginePromise) {
    enginePromise = loadSearchDocuments()
      .then((collection) => buildEngine(collection))
      .catch((error) => {
        console.error('加载搜索索引失败', error)
        enginePromise = null
        return null
      })
  }
  return enginePromise
}
