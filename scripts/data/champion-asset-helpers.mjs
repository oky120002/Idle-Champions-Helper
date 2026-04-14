export const CHAMPION_PORTRAIT_DIR_NAME = 'champion-portraits'
export const DEFAULT_MASTER_API_URL = 'https://master.idlechampions.com/~idledragons/'

export function ensureTrailingSlash(value) {
  return value.endsWith('/') ? value : `${value}/`
}

export function isPlayableChampion(definition = {}) {
  const seat = Number(definition.seat_id ?? definition.seat ?? 0)
  return seat >= 1 && seat <= 12
}

export function buildGraphicMap(graphicDefines = []) {
  return new Map(
    graphicDefines
      .filter((definition) => definition?.id !== undefined && typeof definition?.graphic === 'string')
      .map((definition) => [String(definition.id), definition]),
  )
}

export function toGraphicVersion(graphicDefinition = {}) {
  if (
    graphicDefinition.v !== null &&
    graphicDefinition.v !== undefined &&
    Number.isFinite(Number(graphicDefinition.v))
  ) {
    return Number(graphicDefinition.v)
  }

  return null
}

export function getGraphicUses(graphicDefinition = {}) {
  if (!Array.isArray(graphicDefinition.export_params?.uses)) {
    return []
  }

  return graphicDefinition.export_params.uses
    .map((value) => String(value).trim())
    .filter(Boolean)
}

export function encodeGraphicPath(graphicPath) {
  return String(graphicPath)
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/')
}

export function buildMobileAssetPath(graphicPath) {
  return `mobile_assets/${encodeGraphicPath(graphicPath)}`
}

export function buildMobileAssetUrl(graphicPath, baseUrl = DEFAULT_MASTER_API_URL) {
  return `${ensureTrailingSlash(baseUrl)}${buildMobileAssetPath(graphicPath)}`
}

export function inferGraphicDelivery(graphicDefinition = {}) {
  const graphic = String(graphicDefinition.graphic ?? '')
  const uses = getGraphicUses(graphicDefinition)

  if (uses.includes('portrait') || graphic.startsWith('Portraits/')) {
    return 'wrapped-png'
  }

  if (uses.includes('crusader') || graphic.startsWith('Characters/')) {
    return 'zlib-png'
  }

  return 'unknown'
}

export function buildRemoteGraphicAsset(graphicDefinition, baseUrl = DEFAULT_MASTER_API_URL) {
  if (!graphicDefinition?.graphic || graphicDefinition?.id === undefined) {
    return null
  }

  const sourceGraphic = String(graphicDefinition.graphic)

  return {
    graphicId: String(graphicDefinition.id),
    sourceGraphic,
    sourceVersion: toGraphicVersion(graphicDefinition),
    remotePath: buildMobileAssetPath(sourceGraphic),
    remoteUrl: buildMobileAssetUrl(sourceGraphic, baseUrl),
    delivery: inferGraphicDelivery(graphicDefinition),
    uses: getGraphicUses(graphicDefinition),
  }
}

export function resolveGraphicAssetById(graphicMap, graphicId, baseUrl = DEFAULT_MASTER_API_URL) {
  if (graphicId === undefined || graphicId === null || String(graphicId) === '0') {
    return null
  }

  return buildRemoteGraphicAsset(graphicMap.get(String(graphicId)), baseUrl)
}

export function collectChampionPortraitSources(rawDefinitions = {}, baseUrl = DEFAULT_MASTER_API_URL) {
  const graphicMap = buildGraphicMap(rawDefinitions.graphic_defines)

  return (rawDefinitions.hero_defines ?? [])
    .filter((definition) => isPlayableChampion(definition))
    .map((definition) => {
      const remote = resolveGraphicAssetById(graphicMap, definition.portrait_graphic_id, baseUrl)

      if (!remote) {
        return null
      }

      return {
        championId: String(definition.id),
        portraitGraphicId: String(definition.portrait_graphic_id),
        graphic: remote.sourceGraphic,
        version: remote.sourceVersion,
        remote,
      }
    })
    .filter(Boolean)
}

export function buildChampionPortraitPath(currentVersion, championId) {
  return `${currentVersion}/${CHAMPION_PORTRAIT_DIR_NAME}/${championId}.png`
}
