import path from 'node:path'
import { mkdir, writeFile } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'
import { readJson, writeJson } from './io-utils.ts'

const DEFAULT_VERSION_DIR = 'public/data/v1'

// 代码型字段：opcode/目标过滤器/函数表达式，从不出现在人类描述里，遍历时整体跳过。
const CODE_DENYLIST = new Set([
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
const SKIP_SUBTREES = new Set(['raw', 'summary'])

// 长正文字段：归入 body 桶（boost 较低，靠语义命中）。
const BODY_LEAVES = new Set([
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

// 业界 char-filter 做法：分词前把模板占位符剥成空格。替换值运行时才确定（stacks/area/BUD/buff 多层放大），
// 静态数据拿不到，故不求值替换，只剥除（见计划"决策二"）。$# 是脏话字面量、非占位符，保留。
export function cleanText(input) {
  if (!input) {
    return ''
  }

  return input
    .replace(/\$\（[^）]*）/g, ' ') // 全角括号中文残留 $（奖金）
    .replace(/\$[一-鿿぀-ヿ]+/g, ' ') // CJK 裸形残留 $阈值
    .replace(/\$\([^)]*\)/g, ' ') // 主力：$(name)/$(func arg)/$(if|else|fi)/中文函数名
    .replace(/\$[A-Za-z_][A-Za-z0-9_]*/g, ' ') // 裸形 $amount $target
    .replace(/\$[%0-9]+/g, ' ') // 数据 bug $% $10
    .replace(/\^\^/g, ' ') // 游戏内换行 markup
    .replace(/\s+/g, ' ')
    .trim()
}

// 判定 {original, display} 信封形态：'leaf'（值为字符串/null）、'container'（值为对象，即 snapshots）、null（非信封）。
function classifyLocalized(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null
  }
  if (!('original' in value) || !('display' in value)) {
    return null
  }
  const originalIsObject = value.original !== null && typeof value.original === 'object'
  const displayIsObject = value.display !== null && typeof value.display === 'object'
  if (!originalIsObject && !displayIsObject) {
    return 'leaf'
  }
  if (originalIsObject && displayIsObject) {
    return 'container'
  }
  return null
}

function classifyBucket(pathParts, leafKey) {
  if (pathParts.length >= 2 && `${pathParts[pathParts.length - 2]}.${leafKey}` === 'characterSheet.fullName') {
    return 'title'
  }
  if (BODY_LEAVES.has(leafKey)) {
    return 'body'
  }
  return 'meta'
}

function pushText(doc, lang, bucket, text) {
  const cleaned = cleanText(text)
  if (!cleaned) {
    return
  }
  doc[bucket][lang] = doc[bucket][lang] ? `${doc[bucket][lang]} ${cleaned}` : cleaned
}

function walk(node, pathParts, langCtx, doc) {
  if (node === null || node === undefined) {
    return
  }
  if (pathParts.length > 0 && SKIP_SUBTREES.has(pathParts[0])) {
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
    if (kind === 'leaf') {
      const bucket = classifyBucket(pathParts, pathParts[pathParts.length - 1])
      if (typeof node.original === 'string') {
        pushText(doc, 'en', bucket, node.original)
      }
      if (typeof node.display === 'string') {
        pushText(doc, 'zh', bucket, node.display)
      }
      return
    }
    if (kind === 'container') {
      walk(node.original, [...pathParts, 'original'], 'en', doc)
      walk(node.display, [...pathParts, 'display'], 'zh', doc)
      return
    }
    for (const key of Object.keys(node)) {
      if (CODE_DENYLIST.has(key)) {
        continue
      }
      walk(node[key], [...pathParts, key], langCtx, doc)
    }
    return
  }

  if (typeof node === 'string' && langCtx) {
    pushText(doc, langCtx, classifyBucket(pathParts, pathParts[pathParts.length - 1]), node)
  }
}

// 非信封补抓：传奇装备效果描述（normalizer 未本地化，纯英文，见 normalizer 1247-1258 行）。
function collectLegendaryEffects(detail, doc) {
  for (const group of detail?.legendaryEffects ?? []) {
    for (const effect of group?.effects ?? []) {
      if (typeof effect?.description === 'string') {
        pushText(doc, 'en', 'body', effect.description)
      }
    }
  }
}

function buildSearchDocument(champion, detail) {
  const doc = {
    championId: String(champion.id),
    name: champion.name ?? { original: '', display: '' },
    seat: champion.seat ?? null,
    portrait: champion.portrait ?? null,
    title: { en: '', zh: '' },
    body: { en: '', zh: '' },
    meta: { en: '', zh: '' },
  }

  // 英雄名（列表层权威）→ title
  if (champion.name) {
    if (typeof champion.name.original === 'string') {
      pushText(doc, 'en', 'title', champion.name.original)
    }
    if (typeof champion.name.display === 'string') {
      pushText(doc, 'zh', 'title', champion.name.display)
    }
  }
  // 关键字短标签：tags/roles 语言中立，进 en+zh 双桶提升召回
  for (const tag of champion.tags ?? []) {
    pushText(doc, 'en', 'meta', tag)
    pushText(doc, 'zh', 'meta', tag)
  }
  for (const role of champion.roles ?? []) {
    pushText(doc, 'en', 'meta', role)
    pushText(doc, 'zh', 'meta', role)
  }
  for (const affiliation of champion.affiliations ?? []) {
    if (classifyLocalized(affiliation) === 'leaf') {
      if (typeof affiliation.original === 'string') {
        pushText(doc, 'en', 'meta', affiliation.original)
      }
      if (typeof affiliation.display === 'string') {
        pushText(doc, 'zh', 'meta', affiliation.display)
      }
    }
  }

  // 详情树通用遍历（自动跳过 raw/summary 镜像与代码字段）
  walk(detail, [], null, doc)
  collectLegendaryEffects(detail, doc)

  return doc
}

export async function buildSearchIndex(options = {}) {
  const versionDir = path.resolve(options.versionDir ?? DEFAULT_VERSION_DIR)
  const champions = await readJson(path.join(versionDir, 'champions.json'))
  const updatedAt = champions.updatedAt ?? ''

  const items = []
  let totalChars = 0
  for (const champion of champions.items ?? []) {
    const detail = await readJson(path.join(versionDir, 'champion-details', `${champion.id}.json`))
    const doc = buildSearchDocument(champion, detail)
    for (const bucket of ['title', 'body', 'meta']) {
      totalChars += doc[bucket].en.length + doc[bucket].zh.length
    }
    items.push(doc)
  }

  await writeJson(path.join(versionDir, 'search', 'search-documents.json'), { items, updatedAt })

  return { versionDir, updatedAt, heroCount: items.length, totalChars }
}

// 调试出口：把每英雄抽取明细写到 tmp/search-extract-dump.txt，便于人工核对召回/噪声。
async function dumpExtract() {
  const versionDir = path.resolve(DEFAULT_VERSION_DIR)
  const champions = await readJson(path.join(versionDir, 'champions.json'))
  const lines = []
  for (const champion of champions.items ?? []) {
    const detail = await readJson(path.join(versionDir, 'champion-details', `${champion.id}.json`))
    const doc = buildSearchDocument(champion, detail)
    lines.push(`# ${doc.championId} ${doc.name.display ?? ''} / ${doc.name.original ?? ''}`)
    for (const bucket of ['title', 'body', 'meta']) {
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

async function main() {
  if (process.argv.slice(2).includes('--dump')) {
    await dumpExtract()
    return
  }

  const result = await buildSearchIndex()
  console.log('search index 构建完成：')
  console.log(`- version dir: ${result.versionDir}`)
  console.log(`- updatedAt: ${result.updatedAt}`)
  console.log(`- heroes: ${result.heroCount}`)
  console.log(`- total chars: ${result.totalChars}`)
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(`构建 search index 失败：${error.message}`)
    process.exitCode = 1
  })
}
