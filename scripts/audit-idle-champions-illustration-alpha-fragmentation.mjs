import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { parseArgs } from 'node:util'
import { pathToFileURL } from 'node:url'
import { DEFAULT_REVIEWED_SKIN_IDS } from './data/champion-illustration-audit-config.mjs'
import { analyzeIllustrationAlphaPngBuffer } from './data/illustration-alpha-analysis.mjs'

const DEFAULT_INPUT = 'public/data/v1/champion-illustrations.json'
const DEFAULT_OUTPUT_DIR = 'tmp/illustration-alpha-audit'
const DEFAULT_TOP = 12
const DEFAULT_RISK_THRESHOLD = 1.5
const FILL_RATIO_FACTOR = 0.82
const DETACHED_RATIO_FLOOR = 0.03
const SECOND_RATIO_FLOOR = 0.03
const DETACHED_RATIO_MARGIN = 0.02
const SECOND_RATIO_MARGIN = 0.02
const ISOLATION_MARGIN = 0.015
const SIGNIFICANT_COMPONENT_MARGIN = 2

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

  if (sorted.length === 0) {
    return 0
  }

  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle]
}

function formatRatio(value) {
  return Number(value.toFixed(4))
}

function readJson(filePath) {
  return readFile(filePath, 'utf8').then((content) => JSON.parse(content))
}

function classifyBucket(isReviewed, contributions) {
  if (isReviewed) {
    return 'reviewed-safe'
  }

  const detachedScore = contributions.detached + contributions.second + contributions.isolation

  if (detachedScore >= Math.max(contributions.fill, contributions.components)) {
    return detachedScore > 0 && contributions.fill > 0 ? 'mixed' : 'detached-fragment'
  }

  if (contributions.fill >= contributions.components) {
    return 'sparse-fill'
  }

  return 'mixed'
}

function buildRiskRecord(item, medians, reviewedSkinIds, riskThreshold) {
  const isReviewed = reviewedSkinIds.has(String(item.skinId))
  const metrics = item.alphaMetrics
  const reasons = []
  const contributions = {
    fill: 0,
    detached: 0,
    second: 0,
    components: 0,
    isolation: 0,
  }

  const fillThreshold = medians.fillRatio * FILL_RATIO_FACTOR
  if (metrics.fillRatio < fillThreshold && fillThreshold > 0) {
    contributions.fill = Math.min(1.5, Math.max(0, (fillThreshold - metrics.fillRatio) * 8))
    reasons.push(`主体填充率 ${formatRatio(metrics.fillRatio)}，低于同英雄中位数 ${formatRatio(medians.fillRatio)} 的 ${formatRatio(FILL_RATIO_FACTOR)}x`)
  }

  const detachedThreshold = Math.max(DETACHED_RATIO_FLOOR, medians.detachedSignificantAreaRatio + DETACHED_RATIO_MARGIN)
  if (metrics.detachedSignificantAreaRatio > detachedThreshold) {
    contributions.detached = Math.min(2.6, metrics.detachedSignificantAreaRatio * 10)
    reasons.push(`显著分离区域占比 ${formatRatio(metrics.detachedSignificantAreaRatio)}，高于组内阈值 ${formatRatio(detachedThreshold)}`)
  }

  const secondThreshold = Math.max(SECOND_RATIO_FLOOR, medians.secondComponentRatio + SECOND_RATIO_MARGIN)
  if (metrics.secondComponentRatio > secondThreshold) {
    contributions.second = Math.min(2, metrics.secondComponentRatio * 8)
    reasons.push(`第二连通域占比 ${formatRatio(metrics.secondComponentRatio)}，高于组内阈值 ${formatRatio(secondThreshold)}`)
  }

  const significantComponentThreshold = medians.significantComponentCount + SIGNIFICANT_COMPONENT_MARGIN
  if (metrics.significantComponentCount >= significantComponentThreshold) {
    contributions.components = Math.min(1.2, (metrics.significantComponentCount - significantComponentThreshold + 1) * 0.4)
    reasons.push(`显著连通域数量 ${metrics.significantComponentCount}，高于组内中位数 ${medians.significantComponentCount}`)
  }

  const isolationThreshold = medians.isolationScore + ISOLATION_MARGIN
  if (metrics.isolationScore > isolationThreshold) {
    contributions.isolation = Math.min(1.2, metrics.isolationScore * 12)
    reasons.push(`分离组件隔离分数 ${formatRatio(metrics.isolationScore)}，高于组内阈值 ${formatRatio(isolationThreshold)}`)
  }

  const risk =
    contributions.fill +
    contributions.detached +
    contributions.second +
    contributions.components +
    contributions.isolation

  if (!isReviewed && risk < riskThreshold) {
    return null
  }

  return {
    skinId: String(item.skinId),
    championId: String(item.championId),
    championName: item.championName.display,
    illustrationName: item.illustrationName.display,
    imagePath: item.image.path,
    image: item.image,
    sourceGraphic: item.sourceGraphic,
    render: item.render,
    alphaMetrics: {
      fillRatio: formatRatio(metrics.fillRatio),
      componentCount: metrics.componentCount,
      significantComponentCount: metrics.significantComponentCount,
      largestComponentRatio: formatRatio(metrics.largestComponentRatio),
      secondComponentRatio: formatRatio(metrics.secondComponentRatio),
      detachedSignificantAreaRatio: formatRatio(metrics.detachedSignificantAreaRatio),
      isolationScore: formatRatio(metrics.isolationScore),
      solidPixelCount: metrics.solidPixelCount,
    },
    medians: {
      fillRatio: formatRatio(medians.fillRatio),
      significantComponentCount: medians.significantComponentCount,
      secondComponentRatio: formatRatio(medians.secondComponentRatio),
      detachedSignificantAreaRatio: formatRatio(medians.detachedSignificantAreaRatio),
      isolationScore: formatRatio(medians.isolationScore),
    },
    risk: Number(risk.toFixed(3)),
    reasons,
    reviewed: isReviewed,
    bucket: classifyBucket(isReviewed, contributions),
  }
}

function compareCandidates(left, right) {
  return (
    right.risk - left.risk ||
    right.alphaMetrics.detachedSignificantAreaRatio - left.alphaMetrics.detachedSignificantAreaRatio ||
    right.alphaMetrics.secondComponentRatio - left.alphaMetrics.secondComponentRatio ||
    left.skinId.localeCompare(right.skinId)
  )
}

async function buildReport(illustrations, inputPath, inputDir, reviewedSkinIds, top, riskThreshold) {
  const items = await Promise.all(
    illustrations.items.map(async (item) => {
      const buffer = await readFile(path.join(inputDir, item.image.path))
      return {
        ...item,
        alphaMetrics: analyzeIllustrationAlphaPngBuffer(buffer),
      }
    }),
  )
  const byChampion = new Map()

  for (const item of items) {
    const key = String(item.championId)

    if (!byChampion.has(key)) {
      byChampion.set(key, [])
    }

    byChampion.get(key).push(item)
  }

  const candidates = []

  for (const group of byChampion.values()) {
    const medians = {
      fillRatio: median(group.map((item) => item.alphaMetrics.fillRatio)),
      significantComponentCount: median(group.map((item) => item.alphaMetrics.significantComponentCount)),
      secondComponentRatio: median(group.map((item) => item.alphaMetrics.secondComponentRatio)),
      detachedSignificantAreaRatio: median(group.map((item) => item.alphaMetrics.detachedSignificantAreaRatio)),
      isolationScore: median(group.map((item) => item.alphaMetrics.isolationScore)),
    }

    for (const item of group.filter((entry) => entry.kind === 'skin')) {
      const record = buildRiskRecord(item, medians, reviewedSkinIds, riskThreshold)

      if (record) {
        candidates.push(record)
      }
    }
  }

  candidates.sort(compareCandidates)

  const sections = {
    'detached-fragment': candidates.filter((item) => item.bucket === 'detached-fragment').slice(0, top),
    'sparse-fill': candidates.filter((item) => item.bucket === 'sparse-fill').slice(0, top),
    mixed: candidates.filter((item) => item.bucket === 'mixed').slice(0, top),
    'reviewed-safe': candidates.filter((item) => item.bucket === 'reviewed-safe').slice(0, top),
  }

  return {
    generatedAt: new Date().toISOString(),
    source: {
      input: inputPath,
      updatedAt: illustrations.updatedAt,
      totalSkins: items.filter((item) => item.kind === 'skin').length,
      alphaThreshold: 128,
      riskThreshold,
    },
    heuristics: {
      reviewedSkinIds: Array.from(reviewedSkinIds),
      notes: [
        '这份审计直接读取仓库当前已经生成好的本地 PNG，使用 alpha 蒙版连通域分析来补抓“尺寸偏差”之外的问题。',
        '它更容易冒出“浮空武器 / 浮空伴生物 / 大型 detached prop / 画布内部留白过多”的样本，但会把部分主题化漂浮物一并抓出来。',
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
          <p>risk ${item.risk} · fill ${item.alphaMetrics.fillRatio} · detached ${item.alphaMetrics.detachedSignificantAreaRatio}</p>
          <p>components ${item.alphaMetrics.significantComponentCount} · second ${item.alphaMetrics.secondComponentRatio} · isolation ${item.alphaMetrics.isolationScore}</p>
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
  <title>立绘 alpha 审计</title>
  <style>
    :root { color-scheme: light; --bg: #eef1f7; --card: #fdfefe; --ink: #101722; --muted: #5f6a7a; --line: #d4dceb; }
    * { box-sizing: border-box; }
    body { margin: 0; padding: 24px; font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif; background: linear-gradient(180deg, #f5f7fb 0%, #e7edf7 100%); color: var(--ink); }
    h1, h2, h3, p { margin: 0; }
    .hero { margin-bottom: 24px; padding: 20px; background: rgba(255,255,255,0.82); border: 1px solid var(--line); border-radius: 16px; }
    .hero p + p { margin-top: 8px; color: var(--muted); }
    section { margin-top: 24px; }
    section > p { margin-top: 8px; color: var(--muted); }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(290px, 1fr)); gap: 16px; margin-top: 16px; }
    .card { display: grid; grid-template-columns: 132px 1fr; gap: 12px; padding: 12px; background: var(--card); border: 1px solid var(--line); border-radius: 16px; align-items: start; }
    .card img { width: 132px; height: 132px; object-fit: contain; background: radial-gradient(circle at top, #f8fbff, #e9eef7); border-radius: 12px; border: 1px solid #dce4f0; }
    .meta { display: grid; gap: 6px; font-size: 13px; }
    code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px; word-break: break-all; }
  </style>
</head>
<body>
  <div class="hero">
    <h1>立绘 alpha 审计</h1>
    <p>生成时间：${report.generatedAt}</p>
    <p>数据更新时间：${report.source.updatedAt}；皮肤数：${report.source.totalSkins}；alpha 阈值：${report.source.alphaThreshold}；risk 阈值：${report.source.riskThreshold}</p>
  </div>
  ${renderSection('高优先级：疑似 detached prop / fragment', '更容易抓出浮空武器、漂浮伴生物、被拉开的次级主体，但其中也会混入本来就故意漂浮的主题道具。', report.sections['detached-fragment'])}
  ${renderSection('高优先级：主体填充率异常偏低', '这批更接近“画布内部空域过多”的情况，可能对应过于外展的 pose 或主体过小。', report.sections['sparse-fill'])}
  ${renderSection('混合型样本', '同时存在 detached fragment 与 fill 异常，但往往也更容易混入复杂主题特效。', report.sections.mixed)}
  ${renderSection('已人工复核的参考样本', '这些样本在 alpha 审计里依然显眼，但已经有人眼结论，可以作为噪音样本参考。', report.sections['reviewed-safe'])}
</body>
</html>`
}

async function main() {
  const { values } = parseArgs({
    options: {
      input: { type: 'string' },
      outputDir: { type: 'string' },
      top: { type: 'string' },
      reviewedSkinIds: { type: 'string' },
      riskThreshold: { type: 'string' },
      help: { type: 'boolean' },
    },
  })

  if (values.help) {
    console.log(`用法：
  node scripts/audit-idle-champions-illustration-alpha-fragmentation.mjs [--input <champion-illustrations.json>] [--outputDir <dir>] [--top <count>] [--reviewedSkinIds <ids>] [--riskThreshold <value>]

说明：
  基于当前已经生成好的本地 PNG 做 alpha 蒙版连通域审计，补抓 detached prop / fragment 与主体填充率异常样本。
`)
    return
  }

  const input = path.resolve(values.input ?? DEFAULT_INPUT)
  const outputDir = path.resolve(values.outputDir ?? DEFAULT_OUTPUT_DIR)
  const top = Math.max(1, Number(values.top ?? DEFAULT_TOP))
  const riskThreshold = Math.max(0, Number(values.riskThreshold ?? DEFAULT_RISK_THRESHOLD))
  const reviewedSkinIds = parseIdList(values.reviewedSkinIds ?? DEFAULT_REVIEWED_SKIN_IDS.join(','))
  const illustrations = await readJson(input)
  const report = await buildReport(illustrations, input, path.join(path.dirname(input), '..'), reviewedSkinIds, top, riskThreshold)

  await mkdir(outputDir, { recursive: true })
  await writeFile(path.join(outputDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8')
  await writeFile(path.join(outputDir, 'index.html'), `${buildHtml(report)}\n`, 'utf8')

  console.log('立绘 alpha 审计完成：')
  console.log(`- input: ${input}`)
  console.log(`- output dir: ${outputDir}`)
  console.log(`- detached-fragment: ${report.counts['detached-fragment']}`)
  console.log(`- sparse-fill: ${report.counts['sparse-fill']}`)
  console.log(`- mixed: ${report.counts.mixed}`)
  console.log(`- reviewed-safe: ${report.counts['reviewed-safe']}`)
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(`立绘 alpha 审计失败：${error.message}`)
    process.exitCode = 1
  })
}
