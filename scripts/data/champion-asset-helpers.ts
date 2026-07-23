export const CHAMPION_PORTRAIT_DIR_NAME = 'champion-portraits'
export const CHAMPION_CONSOLE_PORTRAIT_DIR_NAME = 'champion-console-portraits'
export const DEFAULT_MASTER_API_URL = 'https://master.idlechampions.com/~idledragons/'

/** 把 raw 值兜底转为字符串（用于 key / 路径拼接；raw 来源不可信）。 */
function toStr(value: unknown): string {
  return String(value)
}

export function ensureTrailingSlash(value: string): string {
  return value.endsWith('/') ? value : `${value}/`
}

export function isPlayableChampion(definition: Record<string, unknown> = {}): boolean {
  const seat = Number(definition.seat_id ?? definition.seat ?? 0)
  return seat >= 1 && seat <= 12
}

export function buildGraphicMap(
  graphicDefines: readonly unknown[] = [],
): Map<string, Record<string, unknown>> {
  return new Map(
    graphicDefines
      .filter((definition): definition is Record<string, unknown> => {
        if (!definition || typeof definition !== 'object') {
          return false
        }
        const record = definition as Record<string, unknown>
        return record.id !== undefined && typeof record.graphic === 'string'
      })
      .map((definition) => [toStr(definition.id), definition]),
  )
}

export function toGraphicVersion(graphicDefinition: Record<string, unknown> = {}): number | null {
  if (
    graphicDefinition.v !== null &&
    graphicDefinition.v !== undefined &&
    Number.isFinite(Number(graphicDefinition.v))
  ) {
    return Number(graphicDefinition.v)
  }

  return null
}

export function getGraphicUses(graphicDefinition: Record<string, unknown> = {}): string[] {
  const uses = (graphicDefinition.export_params as Record<string, unknown> | undefined)?.uses
  if (!Array.isArray(uses)) {
    return []
  }

  return uses
    .map((value) => toStr(value).trim())
    .filter(Boolean)
}

export function encodeGraphicPath(graphicPath: string): string {
  return graphicPath
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/')
}

export function buildMobileAssetPath(graphicPath: string): string {
  return `mobile_assets/${encodeGraphicPath(graphicPath)}`
}

export function buildMobileAssetUrl(graphicPath: string, baseUrl: string = DEFAULT_MASTER_API_URL): string {
  return `${ensureTrailingSlash(baseUrl)}${buildMobileAssetPath(graphicPath)}`
}

export function inferGraphicDelivery(graphicDefinition: Record<string, unknown> = {}): string {
  const graphic = typeof graphicDefinition.graphic === 'string' ? graphicDefinition.graphic : ''
  const uses = getGraphicUses(graphicDefinition)

  if (uses.includes('portrait') || graphic.startsWith('Portraits/')) {
    return 'wrapped-png'
  }

  if (uses.includes('crusader') || graphic.startsWith('Characters/')) {
    return 'zlib-png'
  }

  return 'unknown'
}

export interface RemoteGraphicAsset {
  graphicId: string
  sourceGraphic: string
  sourceVersion: number | null
  remotePath: string
  remoteUrl: string
  delivery: string
  uses: string[]
}

export function buildRemoteGraphicAsset(
  graphicDefinition: Record<string, unknown>,
  baseUrl: string = DEFAULT_MASTER_API_URL,
): RemoteGraphicAsset | null {
  if (!graphicDefinition.graphic || graphicDefinition.id === undefined) {
    return null
  }

  const sourceGraphic =
    typeof graphicDefinition.graphic === 'string' ? graphicDefinition.graphic : toStr(graphicDefinition.graphic)

  return {
    graphicId: toStr(graphicDefinition.id),
    sourceGraphic,
    sourceVersion: toGraphicVersion(graphicDefinition),
    remotePath: buildMobileAssetPath(sourceGraphic),
    remoteUrl: buildMobileAssetUrl(sourceGraphic, baseUrl),
    delivery: inferGraphicDelivery(graphicDefinition),
    uses: getGraphicUses(graphicDefinition),
  }
}

export function resolveGraphicAssetById(
  graphicMap: Map<string, Record<string, unknown>>,
  graphicId: unknown,
  baseUrl: string = DEFAULT_MASTER_API_URL,
): RemoteGraphicAsset | null {
  if (graphicId === undefined || graphicId === null || toStr(graphicId) === '0') {
    return null
  }

  return buildRemoteGraphicAsset(graphicMap.get(toStr(graphicId)) ?? {}, baseUrl)
}

export interface ChampionPortraitSource {
  championId: string
  portraitGraphicId: string
  graphic: string
  version: number | null
  remote: RemoteGraphicAsset
}

export function collectChampionPortraitSources(
  rawDefinitions: Record<string, unknown> = {},
  baseUrl: string = DEFAULT_MASTER_API_URL,
): ChampionPortraitSource[] {
  const graphicDefines = Array.isArray(rawDefinitions.graphic_defines) ? rawDefinitions.graphic_defines : []
  const graphicMap = buildGraphicMap(graphicDefines)
  const heroDefines = Array.isArray(rawDefinitions.hero_defines) ? rawDefinitions.hero_defines : []

  return heroDefines
    .filter((definition): definition is Record<string, unknown> => Boolean(definition) && typeof definition === 'object')
    .filter((definition) => isPlayableChampion(definition))
    .map((definition) => {
      const remote = resolveGraphicAssetById(graphicMap, definition.portrait_graphic_id, baseUrl)

      if (!remote) {
        return null
      }

      return {
        championId: toStr(definition.id),
        portraitGraphicId: toStr(definition.portrait_graphic_id),
        graphic: remote.sourceGraphic,
        version: remote.sourceVersion,
        remote,
      }
    })
    .filter((value): value is ChampionPortraitSource => value !== null)
}

export interface ChampionConsolePortraitSource {
  championId: string
  consolePortraitGraphicId: string
  graphic: string
  version: number | null
  remote: RemoteGraphicAsset
}

export function collectChampionConsolePortraitSources(
  rawDefinitions: Record<string, unknown> = {},
  baseUrl: string = DEFAULT_MASTER_API_URL,
): ChampionConsolePortraitSource[] {
  const graphicDefines = Array.isArray(rawDefinitions.graphic_defines) ? rawDefinitions.graphic_defines : []
  const graphicMap = buildGraphicMap(graphicDefines)
  const heroDefines = Array.isArray(rawDefinitions.hero_defines) ? rawDefinitions.hero_defines : []

  return heroDefines
    .filter((definition): definition is Record<string, unknown> => Boolean(definition) && typeof definition === 'object')
    .filter((definition) => isPlayableChampion(definition))
    .map((definition) => {
      const properties = definition.properties as Record<string, unknown> | undefined
      const consolePortraitGraphicId = definition.console_portrait ?? properties?.console_portrait
      const remote = resolveGraphicAssetById(graphicMap, consolePortraitGraphicId, baseUrl)

      if (!remote) {
        return null
      }

      return {
        championId: toStr(definition.id),
        consolePortraitGraphicId: toStr(consolePortraitGraphicId),
        graphic: remote.sourceGraphic,
        version: remote.sourceVersion,
        remote,
      }
    })
    .filter((value): value is ChampionConsolePortraitSource => value !== null)
}

export function buildChampionPortraitPath(currentVersion: string, championId: string): string {
  return `${currentVersion}/${CHAMPION_PORTRAIT_DIR_NAME}/${championId}.png`
}

export function buildChampionConsolePortraitPath(currentVersion: string, championId: string): string {
  return `${currentVersion}/${CHAMPION_CONSOLE_PORTRAIT_DIR_NAME}/${championId}.png`
}
