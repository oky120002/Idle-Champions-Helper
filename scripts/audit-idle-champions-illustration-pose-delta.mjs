import { mkdir, writeFile, readFile } from 'node:fs/promises'
import path from 'node:path'
import { parseArgs } from 'node:util'
import { pathToFileURL } from 'node:url'
import { loadIllustrationPoseReviewBase, buildIllustrationPoseReview } from './data/illustration-pose-review.mjs'
import {
  analyzeIllustrationPoseDelta,
  classifyIllustrationPoseDelta,
} from './data/illustration-pose-delta-analysis.mjs'

const DEFAULT_OUTPUT_DIR = 'tmp/illustration-pose-delta-audit'
const DEFAULT_ALPHA_REPORT = 'tmp/illustration-alpha-audit/report.json'
const DEFAULT_RENDER_LIMIT = 8

function parseIdList(rawValue) {
  if (!rawValue) {
    return []
  }

  return rawValue
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, 'utf8'))
}

function collectSkinIdsFromAlphaReport(report) {
  return [
    ...(report.sections?.['detached-fragment'] ?? []),
    ...(report.sections?.['sparse-fill'] ?? []),
    ...(report.sections?.mixed ?? []),
  ]
    .filter((item) => !item.reviewed)
    .map((item) => String(item.skinId))
}

function stripBytes(review) {
  return review.renderedTargets.map(({ bytes, ...target }) => target)
}

async function writeRenderedTargets(outputDir, review) {
  const reviewDir = path.join(outputDir, review.skinId)
  await mkdir(reviewDir, { recursive: true })

  for (const target of review.renderedTargets) {
    await writeFile(path.join(reviewDir, `${target.label}-s${target.sequenceIndex}-f${target.frameIndex}.png`), target.bytes)
  }
}

function summarizeReview(review) {
  const currentTarget = review.renderedTargets.find((target) => target.label === 'current')
  const candidateResults = review.renderedTargets
    .filter((target) => target.label !== 'current')
    .map((target) => {
      const delta = analyzeIllustrationPoseDelta(currentTarget.alphaMetrics, target.alphaMetrics)

      return {
        label: target.label,
        sequenceIndex: target.sequenceIndex,
        frameIndex: target.frameIndex,
        width: target.width,
        height: target.height,
        alphaMetrics: target.alphaMetrics,
        delta,
        classification: classifyIllustrationPoseDelta(delta.score),
      }
    })
    .sort(
      (left, right) =>
        right.delta.score - left.delta.score ||
        left.sequenceIndex - right.sequenceIndex ||
        left.frameIndex - right.frameIndex,
    )
  const bestCandidate = candidateResults[0] ?? null

  return {
    skinId: review.skinId,
    championId: review.championId,
    championName: review.championName,
    skinName: review.skinName,
    sourceGraphic: review.sourceGraphic,
    existingOverride: review.existingOverride,
    current: {
      ...review.current,
      imagePath: `${review.skinId}/current-s${review.current.sequenceIndex}-f${review.current.frameIndex}.png`,
    },
    bestCandidate:
      bestCandidate == null
        ? null
        : {
            ...bestCandidate,
            imagePath: `${review.skinId}/${bestCandidate.label}-s${bestCandidate.sequenceIndex}-f${bestCandidate.frameIndex}.png`,
          },
    candidates: candidateResults,
    renderedTargets: stripBytes(review),
    status: bestCandidate ? classifyIllustrationPoseDelta(bestCandidate.delta.score) : 'negative',
  }
}

function buildSections(items) {
  return {
    promising: items.filter((item) => item.status === 'promising'),
    weak: items.filter((item) => item.status === 'weak'),
    negative: items.filter((item) => item.status === 'negative'),
  }
}

function renderSection(title, description, items) {
  if (items.length === 0) {
    return `<section><h2>${title}</h2><p>${description}</p><p>当前无样本。</p></section>`
  }

  const cards = items
    .map((item) => {
      const best = item.bestCandidate
      const bestText = best
        ? `best: s${best.sequenceIndex} / f${best.frameIndex} · score ${best.delta.score}`
        : 'best: none'

      return `
      <article class="card">
        <img src="./${item.current.imagePath}" alt="${item.skinName} current">
        <div class="meta">
          <h3>${item.skinId} · ${item.skinName}</h3>
          <p>${item.championName}</p>
          <p>${bestText}</p>
          ${best ? `<p>${best.delta.reasons.join('；') || '当前没有明显更优候选。'}</p>` : '<p>当前没有候选。</p>'}
          <p><code>${item.sourceGraphic}</code></p>
        </div>
      </article>`
    })
    .join('\n')

  return `<section><h2>${title}</h2><p>${description}</p><div class="grid">${cards}</div></section>`
}

function buildHtml(report) {
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <title>立绘 pose delta 审计</title>
  <style>
    :root { color-scheme: light; --bg: #eef5f0; --card: #ffffff; --ink: #112019; --muted: #607266; --line: #d2e2d8; }
    * { box-sizing: border-box; }
    body { margin: 0; padding: 24px; font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif; background: linear-gradient(180deg, #f7fbf8 0%, #e8f0ea 100%); color: var(--ink); }
    h1, h2, h3, p { margin: 0; }
    .hero { margin-bottom: 24px; padding: 20px; background: rgba(255,255,255,0.84); border: 1px solid var(--line); border-radius: 16px; }
    .hero p + p { margin-top: 8px; color: var(--muted); }
    section { margin-top: 24px; }
    section > p { margin-top: 8px; color: var(--muted); }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 16px; margin-top: 16px; }
    .card { display: grid; grid-template-columns: 148px 1fr; gap: 12px; padding: 12px; background: var(--card); border: 1px solid var(--line); border-radius: 16px; align-items: start; }
    .card img { width: 148px; height: 148px; object-fit: contain; background: radial-gradient(circle at top, #f7fcf7, #e8efe9); border-radius: 12px; border: 1px solid #dde9e0; }
    .meta { display: grid; gap: 6px; font-size: 13px; }
    code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px; word-break: break-all; }
  </style>
</head>
<body>
  <div class="hero">
    <h1>立绘 pose delta 审计</h1>
    <p>生成时间：${report.generatedAt}</p>
    <p>样本数：${report.total}; promising / weak / negative：${report.counts.promising} / ${report.counts.weak} / ${report.counts.negative}</p>
  </div>
  ${renderSection('优先复核：候选 pose 确实更连贯', '这批至少存在一个候选，在 detached / fill / 连通域指标上对 current 有明确正向改进。', report.sections.promising)}
  ${renderSection('次级复核：有轻微改善，但证据不够强', '这批可以作为后续补看对象，但当前不建议直接写 override。', report.sections.weak)}
  ${renderSection('负向或无收益样本', '候选 pose 并没有明显优于 current，通常更像主题本意或变化很小。', report.sections.negative)}
</body>
</html>`
}

async function main() {
  const { values } = parseArgs({
    options: {
      skinIds: { type: 'string' },
      alphaReport: { type: 'string' },
      outputDir: { type: 'string' },
      renderLimit: { type: 'string' },
      help: { type: 'boolean' },
    },
  })

  if (values.help) {
    console.log(`用法：
  node scripts/audit-idle-champions-illustration-pose-delta.mjs [--skinIds <id,id,...>] [--alphaReport <report.json>] [--outputDir <dir>] [--renderLimit <count>]

说明：
  对 current pose 和候选 pose 做连通域指标对比，筛出“候选是否真的比 current 更连贯”的样本。
`)
    return
  }

  const rootDir = process.cwd()
  const outputDir = path.resolve(values.outputDir ?? DEFAULT_OUTPUT_DIR)
  const alphaReportPath = path.resolve(values.alphaReport ?? DEFAULT_ALPHA_REPORT)
  const requestedSkinIds = parseIdList(values.skinIds ?? '')
  const skinIds =
    requestedSkinIds.length > 0 ? requestedSkinIds : collectSkinIdsFromAlphaReport(await readJson(alphaReportPath))

  if (skinIds.length === 0) {
    console.log('立绘 pose delta 审计完成：')
    console.log('- 当前没有可处理的 skinIds')
    return
  }

  const base = await loadIllustrationPoseReviewBase(rootDir)
  const reviews = []

  await mkdir(outputDir, { recursive: true })

  for (const skinId of skinIds) {
    const review = await buildIllustrationPoseReview(base, skinId, {
      renderLimit: Number(values.renderLimit ?? DEFAULT_RENDER_LIMIT),
    })
    await writeRenderedTargets(outputDir, review)
    reviews.push(summarizeReview(review))
  }

  const sections = buildSections(reviews)
  const report = {
    generatedAt: new Date().toISOString(),
    total: reviews.length,
    counts: Object.fromEntries(Object.entries(sections).map(([key, value]) => [key, value.length])),
    sections,
  }

  await writeFile(path.join(outputDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8')
  await writeFile(path.join(outputDir, 'index.html'), `${buildHtml(report)}\n`, 'utf8')

  console.log('立绘 pose delta 审计完成：')
  console.log(`- output dir: ${outputDir}`)
  console.log(`- promising: ${report.counts.promising}`)
  console.log(`- weak: ${report.counts.weak}`)
  console.log(`- negative: ${report.counts.negative}`)
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(`立绘 pose delta 审计失败：${error.message}`)
    process.exitCode = 1
  })
}
