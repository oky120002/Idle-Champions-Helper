import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { parseArgs } from 'node:util'
import { pathToFileURL } from 'node:url'
import { DEFAULT_REVIEWED_SKIN_IDS } from './data/champion-illustration-audit-config.mjs'

const DEFAULT_INPUT = 'public/data/v1/champion-illustrations.json'
const DEFAULT_OUTPUT_DIR = 'tmp/illustration-override-audit'
const DEFAULT_TOP = 12
const SMALL_THEME_KEYWORDS = [
  '毛绒',
  '宝宝',
  '玩偶',
  '手办',
  '小熊猫',
  '变形',
  'plush',
  'chibi',
  'baby',
  'action figure',
]
const EXPANDED_THEME_KEYWORDS = [
  '魔冢',
  '飞升',
  '夺心魔',
  '巨人',
  '宇宙梦魇',
  '神裔',
  '龙枪',
  '星运',
  '女巫之光',
  '古代',
  '堕影冥界',
  '原始',
  '死亡',
  '夜行者',
  '守护者',
]

function toText(value) {
  if (typeof value === 'string') {
    const trimmed = value.trim()
    return trimmed || null
  }

  if (typeof value === 'number') {
    return String(value)
  }

  return null
}

function parseIdList(rawValue) {
  if (!rawValue) {
    return new Set()
  }

  return new Set(
    rawValue
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean),
  )
}

function median(values) {
  const sorted = [...values].sort((left, right) => left - right)
  return sorted[Math.floor(sorted.length / 2)]
}

function formatRatio(value) {
  return Number(value.toFixed(2))
}

function matchesAnyKeyword(text, keywords) {
  const normalized = text.toLowerCase()
  return keywords.some((keyword) => normalized.includes(keyword.toLowerCase()))
}

function buildNameText(item) {
  return `${item.illustrationName?.display ?? ''} ${item.illustrationName?.original ?? ''}`.trim()
}

function computeRiskScore(item, medians) {
  const ratioWidth = item.image.width / medians.width
  const ratioHeight = item.image.height / medians.height
  const ratioArea = (item.image.width * item.image.height) / medians.area
  let risk = 0

  if (ratioArea >= 1.5 || ratioArea <= 0.67) {
    risk += 2
  }

  if (ratioWidth >= 1.45 || ratioWidth <= 0.72) {
    risk += 2
  }

  if (ratioHeight >= 1.4 || ratioHeight <= 0.72) {
    risk += 1
  }

  if ((item.render?.visiblePieceCount ?? 0) >= 40) {
    risk += 1
  }

  if (item.image.width >= 220 || item.image.height >= 230) {
    risk += 1
  }

  return {
    ratioWidth,
    ratioHeight,
    ratioArea,
    risk,
  }
}

function buildRiskReason(metric, ratioWidth, ratioHeight, ratioArea) {
  const reasons = []

  if (ratioArea >= 1.5) {
    reasons.push(`面积为同英雄中位数的 ${formatRatio(ratioArea)}x`)
  } else if (ratioArea <= 0.67) {
    reasons.push(`面积仅为同英雄中位数的 ${formatRatio(ratioArea)}x`)
  }

  if (ratioWidth >= 1.45) {
    reasons.push(`宽度为同英雄中位数的 ${formatRatio(ratioWidth)}x`)
  } else if (ratioWidth <= 0.72) {
    reasons.push(`宽度仅为同英雄中位数的 ${formatRatio(ratioWidth)}x`)
  }

  if (ratioHeight >= 1.4) {
    reasons.push(`高度为同英雄中位数的 ${formatRatio(ratioHeight)}x`)
  } else if (ratioHeight <= 0.72) {
    reasons.push(`高度仅为同英雄中位数的 ${formatRatio(ratioHeight)}x`)
  }

  if ((metric.render?.visiblePieceCount ?? 0) >= 40) {
    reasons.push(`可见分件数 ${metric.render.visiblePieceCount}`)
  }

  if (metric.image.width >= 220 || metric.image.height >= 230) {
    reasons.push(`成图尺寸 ${metric.image.width}x${metric.image.height}`)
  }

  return reasons
}

function classifyBucket(item, isReviewed) {
  if (isReviewed) {
    return 'reviewed-safe'
  }

  if (item.flags.smallTheme) {
    return 'theme-small'
  }

  if (item.flags.expandedTheme) {
    return 'theme-expanded'
  }

  return 'non-obvious'
}

function compareRisk(left, right) {
  return (
    right.risk - left.risk ||
    Math.max(Math.abs(right.ratios.area - 1), Math.abs(right.ratios.width - 1), Math.abs(right.ratios.height - 1)) -
      Math.max(Math.abs(left.ratios.area - 1), Math.abs(left.ratios.width - 1), Math.abs(left.ratios.height - 1)) ||
    (right.render.visiblePieceCount ?? 0) - (left.render.visiblePieceCount ?? 0) ||
    left.skinId.localeCompare(right.skinId)
  )
}

function buildCandidateRecord(item, medians, reviewedSkinIds) {
  const metrics = computeRiskScore(item, medians)
  const nameText = buildNameText(item)
  const isReviewed = reviewedSkinIds.has(String(item.skinId))
  const flags = {
    smallTheme: matchesAnyKeyword(nameText, SMALL_THEME_KEYWORDS),
    expandedTheme: matchesAnyKeyword(nameText, EXPANDED_THEME_KEYWORDS),
    reviewed: isReviewed,
  }

  return {
    skinId: String(item.skinId),
    championId: String(item.championId),
    championName: item.championName.display,
    illustrationName: item.illustrationName.display,
    imagePath: item.image.path,
    sourceGraphic: item.sourceGraphic,
    render: item.render,
    image: item.image,
    medians,
    ratios: {
      width: formatRatio(metrics.ratioWidth),
      height: formatRatio(metrics.ratioHeight),
      area: formatRatio(metrics.ratioArea),
    },
    risk: metrics.risk,
    flags,
    bucket: classifyBucket({ flags }, isReviewed),
    reasons: buildRiskReason(item, metrics.ratioWidth, metrics.ratioHeight, metrics.ratioArea),
  }
}

function buildReport(illustrations, reviewedSkinIds, top) {
  const skins = illustrations.items.filter((item) => item.kind === 'skin')
  const byChampion = new Map()

  for (const item of illustrations.items) {
    const key = String(item.championId)

    if (!byChampion.has(key)) {
      byChampion.set(key, [])
    }

    byChampion.get(key).push(item)
  }

  const candidates = []

  for (const [championId, items] of byChampion.entries()) {
    if (items.length < 3) {
      continue
    }

    const medians = {
      width: median(items.map((item) => item.image.width)),
      height: median(items.map((item) => item.image.height)),
      area: median(items.map((item) => item.image.width * item.image.height)),
    }

    for (const item of items.filter((entry) => entry.kind === 'skin')) {
      const candidate = buildCandidateRecord(item, medians, reviewedSkinIds)

      if (candidate.risk >= 4) {
        candidates.push(candidate)
      }
    }
  }

  candidates.sort(compareRisk)

  const sections = {
    'non-obvious': candidates.filter((item) => item.bucket === 'non-obvious').slice(0, top),
    'theme-expanded': candidates.filter((item) => item.bucket === 'theme-expanded').slice(0, top),
    'theme-small': candidates.filter((item) => item.bucket === 'theme-small').slice(0, top),
    'reviewed-safe': candidates.filter((item) => item.bucket === 'reviewed-safe').slice(0, top),
  }

  return {
    generatedAt: new Date().toISOString(),
    source: {
      input: DEFAULT_INPUT,
      updatedAt: illustrations.updatedAt,
      totalSkins: skins.length,
      allSkinsUseXl: skins.every((item) => item.sourceSlot === 'xl'),
      allSkinsUseSequence0: skins.every((item) => item.render.sequenceIndex === 0),
      allSkinsUseFrame0: skins.every((item) => item.render.frameIndex === 0),
    },
    heuristics: {
      reviewedSkinIds: Array.from(reviewedSkinIds),
      smallThemeKeywords: SMALL_THEME_KEYWORDS,
      expandedThemeKeywords: EXPANDED_THEME_KEYWORDS,
      riskThreshold: 4,
      notes: [
        '当前 672 个皮肤立绘的清单元数据都还是 xl + sequence 0 + frame 0，因此这里只能先用结构偏差做候选抽样，不能直接自动断言“这张一定需要 override”。',
        '同英雄内部以宽度 / 高度 / 面积中位数做基线，优先抓结构极端偏离的样本。',
      ],
    },
    counts: Object.fromEntries(Object.entries(sections).map(([key, value]) => [key, value.length])),
    sections,
  }
}

function renderSection(title, description, items) {
  if (items.length === 0) {
    return `<section><h2>${title}</h2><p>${description}</p><p>当前无样本。</p></section>`
  }

  const cards = items
    .map(
      (item) => `
      <article class="card">
        <img src="../../${item.imagePath}" alt="${item.illustrationName}">
        <div class="meta">
          <h3>${item.skinId} · ${item.illustrationName}</h3>
          <p>${item.championName}</p>
          <p>risk ${item.risk} · ${item.image.width}x${item.image.height} · pieces ${item.render.visiblePieceCount ?? '-'}</p>
          <p>ratio A/W/H: ${item.ratios.area} / ${item.ratios.width} / ${item.ratios.height}</p>
          <p>${item.reasons.join('；')}</p>
          <p><code>${item.sourceGraphic}</code></p>
        </div>
      </article>`,
    )
    .join('\n')

  return `<section><h2>${title}</h2><p>${description}</p><div class="grid">${cards}</div></section>`
}

function buildHtml(report) {
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <title>立绘 override 抽样审计</title>
  <style>
    :root { color-scheme: light; --bg: #f4efe7; --card: #fffaf3; --ink: #1f1a17; --muted: #6d6259; --line: #d8cfc4; }
    * { box-sizing: border-box; }
    body { margin: 0; padding: 24px; font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif; background: linear-gradient(180deg, #f8f3eb 0%, #efe5d6 100%); color: var(--ink); }
    h1, h2, h3, p { margin: 0; }
    .hero { margin-bottom: 24px; padding: 20px; background: rgba(255,255,255,0.72); border: 1px solid var(--line); border-radius: 16px; backdrop-filter: blur(8px); }
    .hero p + p { margin-top: 8px; color: var(--muted); }
    section { margin-top: 24px; }
    section > p { margin-top: 8px; color: var(--muted); }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px; margin-top: 16px; }
    .card { display: grid; grid-template-columns: 120px 1fr; gap: 12px; padding: 12px; background: var(--card); border: 1px solid var(--line); border-radius: 16px; align-items: start; }
    .card img { width: 120px; height: 120px; object-fit: contain; background: radial-gradient(circle at top, #f9f0de, #efe2d3); border-radius: 12px; border: 1px solid #e2d6c7; }
    .meta { display: grid; gap: 6px; font-size: 13px; }
    code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px; word-break: break-all; }
  </style>
</head>
<body>
  <div class="hero">
    <h1>立绘 override 抽样审计</h1>
    <p>生成时间：${report.generatedAt}</p>
    <p>数据更新时间：${report.source.updatedAt}；皮肤数：${report.source.totalSkins}；当前清单是否全为 xl / sequence 0 / frame 0：${report.source.allSkinsUseXl} / ${report.source.allSkinsUseSequence0} / ${report.source.allSkinsUseFrame0}</p>
  </div>
  ${renderSection('高优先级：非显式主题异常', '优先看这些。它们在同英雄皮肤组里偏差大，但名称上又不是明显的毛绒 / 巨人 / 飞升类主题。', report.sections['non-obvious'])}
  ${renderSection('次优先级：可能是扩展主题造成的尺寸偏差', '这批常见于魔冢、飞升、夺心魔、神裔等主题，结构偏差明显，但不一定代表 pose 选错。', report.sections['theme-expanded'])}
  ${renderSection('低优先级：明显缩小主题', '这批通常是毛绒、宝宝、玩偶等，偏小更像主题本意。除非肉眼确认不对，否则不建议优先写 override。', report.sections['theme-small'])}
  ${renderSection('已人工复核过的样例', '这些样例曾经被重点看过，可用来避免重复排查。', report.sections['reviewed-safe'])}
</body>
</html>`
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, 'utf8'))
}

async function main() {
  const { values } = parseArgs({
    options: {
      input: { type: 'string' },
      outputDir: { type: 'string' },
      top: { type: 'string' },
      reviewedSkinIds: { type: 'string' },
      help: { type: 'boolean' },
    },
  })

  if (values.help) {
    console.log(`用法：
  node scripts/audit-idle-champions-illustration-overrides.mjs [--input <champion-illustrations.json>] [--outputDir <dir>] [--top <count>] [--reviewedSkinIds <ids>]

说明：
  基于当前 champion-illustrations.json 做“需要 override 的皮肤”系统抽样，输出 JSON 报告与本地 HTML 审计页。
`)
    return
  }

  const input = path.resolve(values.input ?? DEFAULT_INPUT)
  const outputDir = path.resolve(values.outputDir ?? DEFAULT_OUTPUT_DIR)
  const top = Math.max(1, Number(values.top ?? DEFAULT_TOP))
  const reviewedSkinIds = parseIdList(values.reviewedSkinIds ?? DEFAULT_REVIEWED_SKIN_IDS.join(','))
  const illustrations = await readJson(input)
  const report = buildReport(illustrations, reviewedSkinIds, top)

  await mkdir(outputDir, { recursive: true })
  await writeFile(path.join(outputDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8')
  await writeFile(path.join(outputDir, 'index.html'), `${buildHtml(report)}\n`, 'utf8')

  console.log(`立绘 override 抽样审计完成：`)
  console.log(`- input: ${input}`)
  console.log(`- output dir: ${outputDir}`)
  console.log(`- non-obvious: ${report.counts['non-obvious']}`)
  console.log(`- theme-expanded: ${report.counts['theme-expanded']}`)
  console.log(`- theme-small: ${report.counts['theme-small']}`)
  console.log(`- reviewed-safe: ${report.counts['reviewed-safe']}`)
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(`立绘 override 抽样审计失败：${error.message}`)
    process.exitCode = 1
  })
}
