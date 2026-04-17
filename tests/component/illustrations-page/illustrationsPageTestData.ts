import type { Champion, ChampionIllustration, DataCollection, LocalizedText } from '../../../src/domain/types'

export interface StringEnumGroup {
  id: string
  values: string[]
}

export interface LocalizedEnumGroup {
  id: string
  values: LocalizedText[]
}

export function localized(original: string, display: string): LocalizedText {
  return { original, display }
}

export function createIllustration(
  overrides: Partial<ChampionIllustration> & Pick<ChampionIllustration, 'id' | 'championId' | 'kind' | 'seat'>,
): ChampionIllustration {
  const championName = overrides.championName ?? localized('Bruenor', '布鲁诺')
  const illustrationName =
    overrides.illustrationName ??
    (overrides.kind === 'hero-base' ? localized('Bruenor', '布鲁诺') : localized('Pirate Bruenor', '海盗布鲁诺'))

  return {
    id: overrides.id,
    championId: overrides.championId,
    skinId: overrides.skinId ?? null,
    kind: overrides.kind,
    seat: overrides.seat,
    championName,
    illustrationName,
    portraitPath: overrides.portraitPath ?? 'v1/champion-portraits/default.png',
    sourceSlot: overrides.sourceSlot ?? (overrides.kind === 'hero-base' ? 'base' : 'large'),
    sourceGraphicId: overrides.sourceGraphicId ?? `graphic-${overrides.id}`,
    sourceGraphic: overrides.sourceGraphic ?? `Characters/${overrides.id}`,
    sourceVersion: overrides.sourceVersion ?? 1,
    manualOverride: overrides.manualOverride ?? null,
    render:
      overrides.render ??
      {
        pipeline: 'skelanim',
        sequenceIndex: 0,
        sequenceLength: 1,
        isStaticPose: true,
        frameIndex: 0,
        visiblePieceCount: 18,
        bounds: {
          minX: -32,
          minY: -12,
          maxX: 420,
          maxY: 960,
        },
      },
    image:
      overrides.image ??
      {
        path: `v1/champion-illustrations/${overrides.kind === 'hero-base' ? 'heroes' : 'skins'}/${overrides.id}.png`,
        width: 1024,
        height: 1024,
        bytes: 65760,
        format: 'png',
      },
  }
}

export const hall = localized('Companions of the Hall', '大厅伙伴团')
export const emerald = localized('Emerald Enclave', '翡翠飞地')

export const championsFixture: DataCollection<Champion> = {
  updatedAt: '2026-04-15',
  items: [
    {
      id: '1',
      name: localized('Bruenor', '布鲁诺'),
      seat: 1,
      roles: ['support'],
      affiliations: [hall],
      tags: ['dwarf', 'male', 'good', 'fighter', 'event', 'control_slow'],
    },
    {
      id: '2',
      name: localized('Tyril', '提里尔'),
      seat: 10,
      roles: ['tank'],
      affiliations: [emerald],
      tags: ['elf', 'male', 'good', 'druid', 'evergreen', 'positional'],
    },
  ],
}

export const enumsFixture: DataCollection<StringEnumGroup | LocalizedEnumGroup> = {
  updatedAt: '2026-04-15',
  items: [
    {
      id: 'roles',
      values: ['support', 'tank'],
    },
    {
      id: 'affiliations',
      values: [hall, emerald],
    },
  ],
}

export const illustrationFixture: DataCollection<ChampionIllustration> = {
  updatedAt: '2026-04-15',
  items: [
    createIllustration({
      id: 'hero-1',
      championId: '1',
      kind: 'hero-base',
      seat: 1,
      championName: localized('Bruenor', '布鲁诺'),
      illustrationName: localized('Bruenor', '布鲁诺'),
      sourceGraphicId: '8',
      sourceGraphic: 'Characters/Hero_Bruenor',
      sourceVersion: 7,
      image: {
        path: 'v1/champion-illustrations/heroes/1.png',
        width: 1024,
        height: 1024,
        bytes: 65760,
        format: 'png',
      },
    }),
    createIllustration({
      id: 'skin-3001',
      championId: '1',
      kind: 'skin',
      seat: 1,
      skinId: '3001',
      championName: localized('Bruenor', '布鲁诺'),
      illustrationName: localized('Pirate Bruenor', '海盗布鲁诺'),
      sourceGraphicId: '3004',
      sourceGraphic: 'Characters/Hero_BruenorPirate_2xup',
      sourceVersion: 3,
      image: {
        path: 'v1/champion-illustrations/skins/3001.png',
        width: 1024,
        height: 1024,
        bytes: 73640,
        format: 'png',
      },
    }),
    createIllustration({
      id: 'hero-2',
      championId: '2',
      kind: 'hero-base',
      seat: 10,
      championName: localized('Tyril', '提里尔'),
      illustrationName: localized('Tyril', '提里尔'),
      sourceGraphicId: '18',
      sourceGraphic: 'Characters/Hero_Tyril',
      sourceVersion: 5,
      image: {
        path: 'v1/champion-illustrations/heroes/2.png',
        width: 1024,
        height: 1024,
        bytes: 81234,
        format: 'png',
      },
    }),
  ],
}

export function buildBruenorOnlyChampionsFixture(updatedAt = '2026-04-16'): DataCollection<Champion> {
  return {
    updatedAt,
    items: [championsFixture.items[0]!],
  }
}

export function buildBruenorOnlyEnumsFixture(
  updatedAt = '2026-04-16',
): DataCollection<StringEnumGroup | LocalizedEnumGroup> {
  return {
    updatedAt,
    items: [enumsFixture.items[0]!, { id: 'affiliations', values: [hall] }],
  }
}

type CrowdedIllustrationFixtureOptions = {
  updatedAt?: string
  idPrefix: string
  englishNamePrefix: string
  chineseNamePrefix: string
  sourceGraphicPrefix: string
}

export function buildCrowdedIllustrationsFixture({
  updatedAt = '2026-04-16',
  idPrefix,
  englishNamePrefix,
  chineseNamePrefix,
  sourceGraphicPrefix,
}: CrowdedIllustrationFixtureOptions): DataCollection<ChampionIllustration> {
  return {
    updatedAt,
    items: Array.from({ length: 26 }, (_, index) =>
      createIllustration({
        id: `${idPrefix}-${index + 1}`,
        championId: '1',
        kind: 'skin',
        seat: 1,
        skinId: `${idPrefix}-skin-${index + 1}`,
        championName: localized('Bruenor', '布鲁诺'),
        illustrationName: localized(`${englishNamePrefix} ${index + 1}`, `${chineseNamePrefix} ${index + 1}`),
        sourceGraphicId: `${idPrefix}-g-${index + 1}`,
        sourceGraphic: `${sourceGraphicPrefix}_${index + 1}`,
      }),
    ),
  }
}

export type IllustrationsPageCollectionOverrides = {
  illustrations?: DataCollection<ChampionIllustration>
  champions?: DataCollection<Champion>
  enums?: DataCollection<StringEnumGroup | LocalizedEnumGroup>
}
