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

export function collectChampionPortraitSources(rawDefinitions = {}) {
  const graphicMap = buildGraphicMap(rawDefinitions.graphic_defines)

  return (rawDefinitions.hero_defines ?? [])
    .filter((definition) => isPlayableChampion(definition))
    .map((definition) => {
      const graphicDefinition = graphicMap.get(String(definition.portrait_graphic_id))

      if (!graphicDefinition?.graphic) {
        return null
      }

      const version =
        Number.isFinite(Number(graphicDefinition.v)) && graphicDefinition.v !== null
          ? Number(graphicDefinition.v)
          : null

      return {
        championId: String(definition.id),
        portraitGraphicId: String(definition.portrait_graphic_id),
        graphic: String(graphicDefinition.graphic),
        version,
      }
    })
    .filter(Boolean)
}

export function buildChampionPortraitPath(currentVersion, championId) {
  return `${currentVersion}/${CHAMPION_PORTRAIT_DIR_NAME}/${championId}.png`
}

export function encodeGraphicPath(graphicPath) {
  return String(graphicPath)
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/')
}
