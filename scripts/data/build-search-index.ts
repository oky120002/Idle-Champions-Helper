import path from 'node:path'
import { mkdir, writeFile } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'
import { readJson, writeJson } from './io-utils.ts'

const DEFAULT_VERSION_DIR = 'public/data/v1'

// 代码型字段：opcode/目标过滤器/函数表达式，从不出现在人类描述里，遍历时整体跳过。
const CODE_DENYLIST = new Set<string>([
  'effect_string',
  'effectReference',
  'for_time',
  'targets',
  'target_filters',
  'filter_targets',
  'amount_func',
  'stack_func',
  'amount_expr',
  'stack_func_data',
  'func',
  'requirements',
])

// 顶层镜像/重复子树：raw 是上游原始快照、summary 与 champions.json 同源，整体跳过避免双倍索引。
const SKIP_SUBTREES = new Set<string>(['raw', 'summary'])

// 长正文字段：归入 body 桶（boost 较低，靠语义命中）。
const BODY_LEAVES = new Set<string>([
  'backstory',
  'desc',
  'pre',
  'post',
  'tipText',
  'specializationDescription',
  'override_key_desc',
  'spec_option_post_apply_info',
  'description',
  'longDescription',
])

type Lang = 'en' | 'zh'
type Bucket = 'title' | 'body' | 'meta'
type LangCtx = Lang | null

interface SearchBucketText {
  en: string
  zh: string
}

interface ChampionName {
  original: string
  display: string
}

interface SearchDocument {
  championId: string
  name: ChampionName
  seat: unknown
  portrait: unknown
  title: SearchBucketText
  body: SearchBucketText
  meta: SearchBucketText
}

interface BuildSearchIndexOptions {
  versionDir?: string
}

interface BuildSearchIndexResult {
  versionDir: string
  updatedAt: string
  heroCount: number
  totalChars: number
}

// ponytail: 不为 raw champion/detail 形状过度声明 interface；readJson 返回 unknown，这里用
// Record<string, unknown> 收窄 + 局部 typeof/Array.isArray 防御。
type RawRecord = Record<string, unknown>

// 业界 char-filter 做法：分词前把模板占位符剥成空格。替换值运行时才确定（stacks/area/BUD/buff 多层放大），
// 静态数据拿不到，故不求值替换，只剥除。$# 是脏话字面量、非占位符，保留。
export function cleanText(input: string): string {
  if (input === '') {
    return ''
  }

  return input
    .replace(/\$（[^）]*）/g, ' ') // 全角括号中文残留 $（奖金）
    .replace(/\$[一-鿿぀-ヿ]+/g, ' ') // CJK 裸形残留 $阈值
    .replace(/\$\([^)]*\)/g, ' ') // 主力：$(name)/$(func arg)/$(if|else|fi)/中文函数名
    .replace(/\$[A-Za-z_]\w*/g, ' ') // 裸形 $amount $target
    .replace(/\$[%0-9]+/g, ' ') // 数据 bug $% $10
    .replace(/\^\^/g, ' ') // 游戏内换行 markup
    .replace(/\s+/g, ' ')
    .trim()
}

// 判定 {original, display} 信封形态：'leaf'（值为字符串/null）、'container'（值为对象，即 snapshots）、null（非信封）。
function classifyLocalized(value: unknown): 'leaf' | 'container' | null {
  if (value === null || value === undefined || typeof value !== 'object' || Array.isArray(value)) {
    return null
  }
  const record = value as RawRecord
  if (!('original' in record) || !('display' in record)) {
    return null
  }
  const originalIsObject = record.original !== null && typeof record.original === 'object'
  const displayIsObject = record.display !== null && typeof record.display === 'object'
  if (!originalIsObject && !displayIsObject) {
    return 'leaf'
  }
  if (originalIsObject && displayIsObject) {
    return 'container'
  }
  return null
}

function classifyBucket(pathParts: readonly string[], leafKey: string): Bucket {
  if (pathParts.length >= 2 && `${pathParts[pathParts.length - 2] ?? ''}.${leafKey}` === 'characterSheet.fullName') {
    return 'title'
  }
  if (BODY_LEAVES.has(leafKey)) {
    return 'body'
  }
  return 'meta'
}

function pushText(doc: SearchDocument, lang: Lang, bucket: Bucket, text: string): void {
  const cleaned = cleanText(text)
  if (cleaned === '') {
    return
  }
  const target = doc[bucket][lang]
  doc[bucket][lang] = target !== '' ? `${target} ${cleaned}` : cleaned
}

function walk(node: unknown, pathParts: string[], langCtx: LangCtx, doc: SearchDocument): void {
  if (node === null || node === undefined) {
    return
  }
  if (pathParts.length > 0 && SKIP_SUBTREES.has(pathParts[0] ?? '')) {
    return
  }

  if (Array.isArray(node)) {
    for (const item of node) {
      walk(item, pathParts, langCtx, doc)
    }
    return
  }

  if (typeof node === 'object') {
    const kind = classifyLocalized(node)
    const record = node as RawRecord
    if (kind === 'leaf') {
      const bucket = classifyBucket(pathParts, pathParts[pathParts.length - 1] ?? '')
      if (typeof record.original === 'string') {
        pushText(doc, 'en', bucket, record.original)
      }
      if (typeof record.display === 'string') {
        pushText(doc, 'zh', bucket, record.display)
      }
      return
    }
    if (kind === 'container') {
      walk(record.original, [...pathParts, 'original'], 'en', doc)
      walk(record.display, [...pathParts, 'display'], 'zh', doc)
      return
    }
    for (const key of Object.keys(record)) {
      if (CODE_DENYLIST.has(key)) {
        continue
      }
      walk(record[key], [...pathParts, key], langCtx, doc)
    }
    return
  }

  if (typeof node === 'string' && langCtx !== null) {
    pushText(doc, langCtx, classifyBucket(pathParts, pathParts[pathParts.length - 1] ?? ''), node)
  }
}

// 非信封补抓：传奇装备效果描述（normalizer 未本地化，纯英文，见 normalizer 1247-1258 行）。
function collectLegendaryEffects(detail: unknown, doc: SearchDocument): void {
  if (detail === null || detail === undefined || typeof detail !== 'object') {
    return
  }
  const detailRecord = detail as RawRecord
  const legendaryEffects = Array.isArray(detailRecord.legendaryEffects) ? detailRecord.legendaryEffects : []
  for (const group of legendaryEffects) {
    if (group === null || group === undefined || typeof group !== 'object') {
      continue
    }
    const groupRecord = group as RawRecord
    const effects = Array.isArray(groupRecord.effects) ? groupRecord.effects : []
    for (const effect of effects) {
      if (effect === null || effect === undefined || typeof effect !== 'object') {
        continue
      }
      const effectRecord = effect as RawRecord
      if (typeof effectRecord.description === 'string') {
        pushText(doc, 'en', 'body', effectRecord.description)
      }
    }
  }
}

function coerceChampionName(value: unknown): ChampionName {
  if (value === null || value === undefined || typeof value !== 'object' || Array.isArray(value)) {
    return { original: '', display: '' }
  }
  const record = value as RawRecord
  return {
    original: typeof record.original === 'string' ? record.original : '',
    display: typeof record.display === 'string' ? record.display : '',
  }
}

function buildSearchDocument(champion: RawRecord, detail: unknown): SearchDocument {
  const nameValue = champion.name
  const doc: SearchDocument = {
    championId: String(champion.id),
    name: nameValue === null || nameValue === undefined ? { original: '', display: '' } : coerceChampionName(nameValue),
    seat: champion.seat ?? null,
    portrait: champion.portrait ?? null,
    title: { en: '', zh: '' },
    body: { en: '', zh: '' },
    meta: { en: '', zh: '' },
  }

  // 英雄名（列表层权威）→ title
  const nameRaw = champion.name
  if (nameRaw !== null && nameRaw !== undefined) {
    const nameRecord = coerceChampionName(nameRaw)
    if (nameRecord.original !== '') {
      pushText(doc, 'en', 'title', nameRecord.original)
    }
    if (nameRecord.display !== '') {
      pushText(doc, 'zh', 'title', nameRecord.display)
    }
  }
  // 关键字短标签：tags/roles 语言中立，进 en+zh 双桶提升召回
  const tags = Array.isArray(champion.tags) ? champion.tags : []
  for (const tag of tags) {
    if (typeof tag === 'string') {
      pushText(doc, 'en', 'meta', tag)
      pushText(doc, 'zh', 'meta', tag)
    }
  }
  const roles = Array.isArray(champion.roles) ? champion.roles : []
  for (const role of roles) {
    if (typeof role === 'string') {
      pushText(doc, 'en', 'meta', role)
      pushText(doc, 'zh', 'meta', role)
    }
  }
  const affiliations = Array.isArray(champion.affiliations) ? champion.affiliations : []
  for (const affiliation of affiliations) {
    if (classifyLocalized(affiliation) !== 'leaf') {
      continue
    }
    const record = affiliation as RawRecord
    if (typeof record.original === 'string') {
      pushText(doc, 'en', 'meta', record.original)
    }
    if (typeof record.display === 'string') {
      pushText(doc, 'zh', 'meta', record.display)
    }
  }

  // 详情树通用遍历（自动跳过 raw/summary 镜像与代码字段）
  walk(detail, [], null, doc)
  collectLegendaryEffects(detail, doc)

  return doc
}

export async function buildSearchIndex(options: BuildSearchIndexOptions = {}): Promise<BuildSearchIndexResult> {
  const versionDir = path.resolve(options.versionDir ?? DEFAULT_VERSION_DIR)
  const champions = (await readJson(path.join(versionDir, 'champions.json'))) as RawRecord
  const updatedAt = typeof champions.updatedAt === 'string' ? champions.updatedAt : ''
  const championItems = Array.isArray(champions.items) ? (champions.items as RawRecord[]) : []

  const items: SearchDocument[] = []
  let totalChars = 0
  for (const champion of championItems) {
    const detail = await readJson(path.join(versionDir, 'champion-details', `${String(champion.id)}.json`))
    const doc = buildSearchDocument(champion, detail)
    for (const bucket of ['title', 'body', 'meta'] as const) {
      totalChars += doc[bucket].en.length + doc[bucket].zh.length
    }
    items.push(doc)
  }

  await writeJson(path.join(versionDir, 'search', 'search-documents.json'), { items, updatedAt })

  return { versionDir, updatedAt, totalChars, heroCount: items.length }
}

// 调试出口：把每英雄抽取明细写到 tmp/search-extract-dump.txt，便于人工核对召回/噪声。
async function dumpExtract(): Promise<void> {
  const versionDir = path.resolve(DEFAULT_VERSION_DIR)
  const champions = (await readJson(path.join(versionDir, 'champions.json'))) as RawRecord
  const championItems = Array.isArray(champions.items) ? (champions.items as RawRecord[]) : []
  const lines: string[] = []
  for (const champion of championItems) {
    const detail = await readJson(path.join(versionDir, 'champion-details', `${String(champion.id)}.json`))
    const doc = buildSearchDocument(champion, detail)
    lines.push(`# ${doc.championId} ${doc.name.display} / ${doc.name.original}`)
    for (const bucket of ['title', 'body', 'meta'] as const) {
      lines.push(`  [${bucket}/en] ${doc[bucket].en}`)
      lines.push(`  [${bucket}/zh] ${doc[bucket].zh}`)
    }
    lines.push('')
  }
  const outPath = path.resolve('tmp/search-extract-dump.txt')
  await mkdir(path.dirname(outPath), { recursive: true })
  await writeFile(outPath, lines.join('\n'), 'utf8')
  console.log(`dump → ${outPath}`)
}

async function main(): Promise<void> {
  // eslint-disable-next-line sonarjs/no-reference-error -- process 是 Node.js 全局变量，运行时存在；sonarjs 静态分析误报
  if (process.argv.slice(2).includes('--dump')) {
    await dumpExtract()
    return
  }

  const result = await buildSearchIndex()
  console.log('search index 构建完成：')
  console.log(`- version dir: ${result.versionDir}`)
  console.log(`- updatedAt: ${result.updatedAt}`)
  console.log(`- heroes: ${String(result.heroCount)}`)
  console.log(`- total chars: ${String(result.totalChars)}`)
}

if (process.argv[1] != null && process.argv[1] !== '' && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error)
    console.error(`构建 search index 失败：${message}`)
    process.exitCode = 1
  })
}
