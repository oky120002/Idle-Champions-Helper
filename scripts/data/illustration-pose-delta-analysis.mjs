function round(value) {
  return Number(value.toFixed(4))
}

export function analyzeIllustrationPoseDelta(currentMetrics, candidateMetrics) {
  const detachedImprovement = currentMetrics.detachedSignificantAreaRatio - candidateMetrics.detachedSignificantAreaRatio
  const secondImprovement = currentMetrics.secondComponentRatio - candidateMetrics.secondComponentRatio
  const fillImprovement = candidateMetrics.fillRatio - currentMetrics.fillRatio
  const componentImprovement = currentMetrics.significantComponentCount - candidateMetrics.significantComponentCount
  const isolationImprovement = currentMetrics.isolationScore - candidateMetrics.isolationScore
  const contributions = {
    detached: detachedImprovement * 10,
    second: secondImprovement * 8,
    fill: fillImprovement * 4,
    components: componentImprovement * 0.35,
    isolation: isolationImprovement * 12,
  }
  const score = contributions.detached + contributions.second + contributions.fill + contributions.components + contributions.isolation
  const reasons = []

  if (detachedImprovement > 0.01) {
    reasons.push(`显著分离区域下降 ${round(detachedImprovement)}`)
  }

  if (secondImprovement > 0.01) {
    reasons.push(`第二连通域占比下降 ${round(secondImprovement)}`)
  }

  if (fillImprovement > 0.01) {
    reasons.push(`主体填充率提升 ${round(fillImprovement)}`)
  }

  if (componentImprovement >= 1) {
    reasons.push(`显著连通域减少 ${componentImprovement}`)
  }

  if (isolationImprovement > 0.005) {
    reasons.push(`分离组件隔离分数下降 ${round(isolationImprovement)}`)
  }

  return {
    score: Number(score.toFixed(3)),
    improvements: {
      detached: round(detachedImprovement),
      second: round(secondImprovement),
      fill: round(fillImprovement),
      components: componentImprovement,
      isolation: round(isolationImprovement),
    },
    contributions: {
      detached: round(contributions.detached),
      second: round(contributions.second),
      fill: round(contributions.fill),
      components: round(contributions.components),
      isolation: round(contributions.isolation),
    },
    reasons,
  }
}

export function classifyIllustrationPoseDelta(score) {
  if (score >= 0.8) {
    return 'promising'
  }

  if (score >= 0.2) {
    return 'weak'
  }

  return 'negative'
}
