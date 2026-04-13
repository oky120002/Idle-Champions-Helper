import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { parseArgs } from 'node:util'
import { pathToFileURL } from 'node:url'
import {
  buildChampionPortraitPath,
  collectChampionPortraitSources,
  isPlayableChampion,
} from './data/champion-portrait-helpers.mjs'
import { extractOfficialFormations, looksLikeVariant } from './data/formation-layout-helpers.mjs'

const DEFAULT_OUTPUT_DIR = 'public/data/v1'
const DEFAULT_VERSION_FILE = 'public/data/version.json'
const DEFAULT_MANUAL_OVERRIDES = 'scripts/data/manual-overrides.json'
const DEFAULT_CURRENT_VERSION = 'v1'
const ROLE_TAGS = new Set([
  'breaking',
  'control',
  'debuff',
  'dps',
  'gold',
  'healing',
  'speed',
  'support',
  'tank',
  'tanking',
])

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

function compareLocalizedText(left, right) {
  return left.display.localeCompare(right.display) || left.original.localeCompare(right.original)
}

function normalizeLocalizedText(originalValue, displayValue, fallbackValue = '') {
  const fallback = toText(fallbackValue) ?? ''
  const original = toText(originalValue) ?? toText(displayValue) ?? fallback
  const display = toText(displayValue) ?? original

  if (!original || !display) {
    return null
  }

  return {
    original,
    display,
  }
}

function normalizeLocalizedTextList(originalValues, displayValues) {
  const items = []
  const maxLength = Math.max(originalValues.length, displayValues.length)

  for (let index = 0; index < maxLength; index += 1) {
    const item = normalizeLocalizedText(originalValues[index], displayValues[index])

    if (item) {
      items.push(item)
    }
  }

  return uniqueLocalizedTexts(items)
}

function uniqueLocalizedTexts(values) {
  const unique = new Map()

  for (const value of values) {
    if (!value?.original || !value?.display) {
      continue
    }

    unique.set(`${value.original}\u0000${value.display}`, value)
  }

  return Array.from(unique.values())
}

function toLocalizedOverrideList(value) {
  if (Array.isArray(value)) {
    return value.flatMap((item) => toLocalizedOverrideList(item))
  }

  if (typeof value === 'string' || typeof value === 'number') {
    const text = toText(value)
    return text ? [{ original: text, display: text }] : []
  }

  if (typeof value === 'object' && value !== null) {
    const item = normalizeLocalizedText(value.original, value.display)
    return item ? [item] : []
  }

  return []
}

function getDefinitionName(definition = {}) {
  return definition.name ?? definition.label ?? definition.campaign_name
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, 'utf8'))
}

async function writeJson(filePath, value) {
  await mkdir(path.dirname(filePath), { recursive: true })
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
}

function uniqueStrings(values) {
  return Array.from(new Set(values.filter((value) => typeof value === 'string' && value.trim())))
}

function toStringList(value) {
  if (Array.isArray(value)) {
    return value.flatMap((item) => toStringList(item))
  }

  if (typeof value === 'string') {
    const trimmed = value.trim()

    if (!trimmed) {
      return []
    }

    if (trimmed.includes(',')) {
      return trimmed
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)
    }

    if (trimmed.includes('|')) {
      return trimmed
        .split('|')
        .map((item) => item.trim())
        .filter(Boolean)
    }

    return [trimmed]
  }

  if (typeof value === 'number') {
    return [String(value)]
  }

  return []
}

function toTextList(value) {
  if (Array.isArray(value)) {
    return value.flatMap((item) => toTextList(item))
  }

  if (typeof value === 'string') {
    const trimmed = value.trim()
    return trimmed ? [trimmed] : []
  }

  if (typeof value === 'number') {
    return [String(value)]
  }

  return []
}

function getUpdatedAt(rawDefinitions) {
  if (typeof rawDefinitions.current_time === 'number') {
    return new Date(rawDefinitions.current_time * 1000).toISOString().slice(0, 10)
  }

  return new Date().toISOString().slice(0, 10)
}

function buildAffiliationMap(originalDefinitions = [], localizedDefinitions = []) {
  const originalByTag = new Map()
  const localizedByTag = new Map()

  for (const definition of originalDefinitions) {
    const tag = definition.affiliation_tag ?? definition.tag ?? definition.key

    if (!tag) {
      continue
    }

    originalByTag.set(String(tag), definition)
  }

  for (const definition of localizedDefinitions) {
    const tag = definition.affiliation_tag ?? definition.tag ?? definition.key

    if (!tag) {
      continue
    }

    localizedByTag.set(String(tag), definition)
  }

  const tags = Array.from(new Set([...originalByTag.keys(), ...localizedByTag.keys()]))

  return new Map(
    tags
      .map((tag) => {
        const originalDefinition = originalByTag.get(tag) ?? {}
        const localizedDefinition = localizedByTag.get(tag) ?? {}
        const name = normalizeLocalizedText(
          getDefinitionName(originalDefinition),
          getDefinitionName(localizedDefinition),
          tag,
        )

        if (!name) {
          return null
        }

        return [tag, name]
      })
      .filter(Boolean),
  )
}

function buildCampaignMap(originalDefinitions = [], localizedDefinitions = []) {
  const originalById = new Map()
  const localizedById = new Map()

  for (const definition of originalDefinitions) {
    const id = definition.id ?? definition.campaign_id

    if (id === undefined) {
      continue
    }

    originalById.set(String(id), definition)
  }

  for (const definition of localizedDefinitions) {
    const id = definition.id ?? definition.campaign_id

    if (id === undefined) {
      continue
    }

    localizedById.set(String(id), definition)
  }

  const ids = Array.from(new Set([...originalById.keys(), ...localizedById.keys()]))

  return new Map(
    ids
      .map((id) => {
        const originalDefinition = originalById.get(id) ?? {}
        const localizedDefinition = localizedById.get(id) ?? {}
        const name = normalizeLocalizedText(
          getDefinitionName(originalDefinition),
          getDefinitionName(localizedDefinition),
          `Campaign ${id}`,
        )

        if (!name) {
          return null
        }

        return [
          id,
          {
            id,
            ...name,
          },
        ]
      })
      .filter(Boolean),
  )
}

function getAffiliationTags(definition, affiliationMap) {
  return uniqueStrings([
    ...toStringList(definition.affiliation_tags),
    ...toStringList(definition.tags).filter((tag) => affiliationMap.has(tag)),
  ])
}

function normalizeChampion(
  originalDefinition,
  localizedDefinition,
  affiliationMap,
  currentVersion,
  portraitSource,
  override = {},
) {
  const originalName =
    originalDefinition.name ??
    originalDefinition.english_name ??
    originalDefinition.character_sheet_details?.full_name ??
    `Champion ${originalDefinition.id}`
  const displayName =
    override.displayName ??
    override.name ??
    localizedDefinition?.name ??
    localizedDefinition?.character_sheet_details?.full_name ??
    originalName
  const tags = uniqueStrings([
    ...toStringList(originalDefinition.tags),
    ...toStringList(override.tags),
  ]).sort((left, right) => left.localeCompare(right))

  const roles = uniqueStrings([
    ...tags.filter((tag) => ROLE_TAGS.has(tag)),
    ...toStringList(override.roles),
  ]).sort((left, right) => left.localeCompare(right))

  const affiliations = uniqueLocalizedTexts([
    ...getAffiliationTags(originalDefinition, affiliationMap)
      .map((tag) => affiliationMap.get(tag))
      .filter(Boolean),
    ...toLocalizedOverrideList(override.affiliations),
  ]).sort(compareLocalizedText)

  return {
    id: String(originalDefinition.id),
    name: normalizeLocalizedText(originalName, displayName, `Champion ${originalDefinition.id}`),
    seat: Number(originalDefinition.seat_id ?? originalDefinition.seat ?? 0),
    roles,
    affiliations,
    tags,
    portrait: portraitSource
      ? {
          path: buildChampionPortraitPath(currentVersion, String(originalDefinition.id)),
          sourceGraphic: portraitSource.graphic,
          sourceVersion: portraitSource.version,
        }
      : null,
  }
}

function normalizeVariant(originalDefinition, localizedDefinition, campaignMap) {
  const originalRestrictions = uniqueStrings([
    ...toTextList(originalDefinition.requirements_text),
    ...toTextList(originalDefinition.requirements_description),
    ...toTextList(originalDefinition.restrictions_text),
    ...toTextList(originalDefinition.restrictions),
  ])
  const displayRestrictions = uniqueStrings([
    ...toTextList(localizedDefinition?.requirements_text),
    ...toTextList(localizedDefinition?.requirements_description),
    ...toTextList(localizedDefinition?.restrictions_text),
    ...toTextList(localizedDefinition?.restrictions),
  ])
  const originalRewards = uniqueStrings([
    ...toTextList(originalDefinition.reward_description),
    ...toTextList(originalDefinition.reward_descriptions),
    ...toTextList(originalDefinition.rewards_text),
    ...toTextList(originalDefinition.rewards),
  ])
  const displayRewards = uniqueStrings([
    ...toTextList(localizedDefinition?.reward_description),
    ...toTextList(localizedDefinition?.reward_descriptions),
    ...toTextList(localizedDefinition?.rewards_text),
    ...toTextList(localizedDefinition?.rewards),
  ])
  const campaign =
    campaignMap.get(String(originalDefinition.campaign_id ?? '')) ?? {
      id: String(originalDefinition.campaign_id ?? ''),
      original: String(originalDefinition.campaign_id ?? ''),
      display: String(originalDefinition.campaign_id ?? ''),
    }

  return {
    id: String(originalDefinition.id),
    name: normalizeLocalizedText(
      originalDefinition.name,
      localizedDefinition?.name,
      `Variant ${originalDefinition.id}`,
    ),
    campaign,
    restrictions: normalizeLocalizedTextList(originalRestrictions, displayRestrictions),
    rewards: normalizeLocalizedTextList(originalRewards, displayRewards),
  }
}

function mergeVariants(autoVariants, manualVariants) {
  const merged = new Map(autoVariants.map((variant) => [variant.id, variant]))

  for (const variant of manualVariants) {
    const id = String(variant.id)
    merged.set(id, {
      ...merged.get(id),
      ...variant,
      id,
      restrictions: uniqueLocalizedTexts([
        ...(merged.get(id)?.restrictions ?? []),
        ...toLocalizedOverrideList(variant.restrictions),
      ]),
      rewards: uniqueLocalizedTexts([
        ...(merged.get(id)?.rewards ?? []),
        ...toLocalizedOverrideList(variant.rewards),
      ]),
    })
  }

  return Array.from(merged.values()).sort((left, right) => Number(left.id) - Number(right.id))
}

function normalizeManualFormations(formations = []) {
  return formations
    .map((formation) => {
      const name =
        typeof formation.name === 'object' && formation.name !== null
          ? normalizeLocalizedText(
              formation.name.original,
              formation.name.display,
              formation.id,
            )
          : normalizeLocalizedText(formation.name, formation.name, formation.id)

      return {
        id: String(formation.id),
        name,
        notes:
          typeof formation.notes === 'object' && formation.notes !== null
            ? normalizeLocalizedText(formation.notes.original, formation.notes.display)
            : normalizeLocalizedText(formation.notes, formation.notes),
        slots: Array.isArray(formation.slots)
          ? formation.slots.map((slot) => ({
              id: String(slot.id),
              row: Number(slot.row),
              column: Number(slot.column),
              x: Number.isFinite(Number(slot.x)) ? Number(slot.x) : undefined,
              y: Number.isFinite(Number(slot.y)) ? Number(slot.y) : undefined,
              adjacentSlotIds: Array.isArray(slot.adjacentSlotIds)
                ? slot.adjacentSlotIds.map((value) => String(value))
                : undefined,
            }))
          : [],
        applicableContexts: Array.isArray(formation.applicableContexts)
          ? formation.applicableContexts
              .filter((context) => context?.kind && context?.id !== undefined)
              .map((context) => ({
                kind: String(context.kind),
                id: String(context.id),
              }))
          : undefined,
        sourceContexts: Array.isArray(formation.sourceContexts)
          ? formation.sourceContexts
              .filter((context) => context?.kind && context?.id !== undefined && context?.name)
              .map((context) => {
                const contextName = normalizeLocalizedText(
                  context.name.original,
                  context.name.display,
                  `${context.kind}-${context.id}`,
                )

                if (!contextName) {
                  return null
                }

                return {
                  kind: String(context.kind),
                  id: String(context.id),
                  name: contextName,
                  campaignId:
                    context.campaignId !== undefined ? String(context.campaignId) : undefined,
                  variantAdventureId:
                    context.variantAdventureId !== undefined
                      ? String(context.variantAdventureId)
                      : undefined,
                }
              })
              .filter(Boolean)
          : undefined,
      }
    })
    .filter((formation) => formation.name)
    .sort((left, right) => compareLocalizedText(left.name, right.name))
}

function mergeFormations(autoFormations, manualFormations) {
  const merged = new Map(autoFormations.map((formation) => [formation.id, formation]))

  for (const formation of manualFormations) {
    const existing = merged.get(formation.id)

    merged.set(formation.id, {
      ...existing,
      ...formation,
      id: formation.id,
      slots: formation.slots.length > 0 ? formation.slots : (existing?.slots ?? []),
      applicableContexts: formation.applicableContexts ?? existing?.applicableContexts,
      sourceContexts: formation.sourceContexts ?? existing?.sourceContexts,
    })
  }

  return Array.from(merged.values())
}

function normalizeEnums(champions, affiliationMap, campaignMap) {
  const campaigns = Array.from(campaignMap.entries())
    .map(([, value]) => value)
    .sort((left, right) => Number(left.id) - Number(right.id))

  return [
    {
      id: 'roles',
      values: uniqueStrings(champions.flatMap((champion) => champion.roles)).sort((left, right) =>
        left.localeCompare(right),
      ),
    },
    {
      id: 'affiliations',
      values: uniqueLocalizedTexts(Array.from(affiliationMap.values())).sort(compareLocalizedText),
    },
    {
      id: 'campaigns',
      values: campaigns,
    },
  ]
}

async function readManualOverrides(filePath) {
  try {
    return await readJson(filePath)
  } catch {
    return {
      championOverrides: {},
      variants: [],
      formations: [],
    }
  }
}

export async function normalizeDefinitionsSnapshot(options = {}) {
  if (!options.input) {
    throw new Error('缺少 --input，无法归一化原始 definitions 快照')
  }

  const input = path.resolve(options.input)
  const outputDir = path.resolve(options.outputDir ?? DEFAULT_OUTPUT_DIR)
  const versionFile = path.resolve(options.versionFile ?? DEFAULT_VERSION_FILE)
  const currentVersion = options.currentVersion ?? DEFAULT_CURRENT_VERSION
  const manualOverridesFile = path.resolve(
    options.manualOverrides ?? DEFAULT_MANUAL_OVERRIDES,
  )

  const rawDefinitions = await readJson(input)
  const localizedDefinitions = options.localizedInput
    ? await readJson(path.resolve(options.localizedInput))
    : rawDefinitions
  const manualOverrides = await readManualOverrides(manualOverridesFile)
  const updatedAt = getUpdatedAt(rawDefinitions)
  const affiliationMap = buildAffiliationMap(
    rawDefinitions.affiliation_defines,
    localizedDefinitions.affiliation_defines,
  )
  const campaignMap = buildCampaignMap(
    rawDefinitions.campaign_defines,
    localizedDefinitions.campaign_defines,
  )
  const localizedChampionsById = new Map(
    (localizedDefinitions.hero_defines ?? []).map((definition) => [String(definition.id), definition]),
  )
  const localizedVariantsById = new Map(
    (localizedDefinitions.adventure_defines ?? []).map((definition) => [String(definition.id), definition]),
  )
  const portraitSourcesByChampionId = new Map(
    collectChampionPortraitSources(rawDefinitions).map((source) => [source.championId, source]),
  )

  const champions = (rawDefinitions.hero_defines ?? [])
    .filter((definition) => isPlayableChampion(definition))
    .map((definition) =>
      normalizeChampion(
        definition,
        localizedChampionsById.get(String(definition.id)),
        affiliationMap,
        currentVersion,
        portraitSourcesByChampionId.get(String(definition.id)) ?? null,
        manualOverrides.championOverrides?.[String(definition.id)] ?? {},
      ),
    )
    .sort(
      (left, right) =>
        left.seat - right.seat ||
        left.name.display.localeCompare(right.name.display) ||
        Number(left.id) - Number(right.id),
    )

  const autoVariants = (rawDefinitions.adventure_defines ?? [])
    .filter((definition) => looksLikeVariant(definition))
    .map((definition) =>
      normalizeVariant(definition, localizedVariantsById.get(String(definition.id)), campaignMap),
    )

  const variants = mergeVariants(autoVariants, manualOverrides.variants ?? [])
  const officialFormations = extractOfficialFormations(rawDefinitions, localizedDefinitions)
  const formations = mergeFormations(
    officialFormations,
    normalizeManualFormations(manualOverrides.formations ?? []),
  )
  const enums = normalizeEnums(champions, affiliationMap, campaignMap)

  await writeJson(path.join(outputDir, 'champions.json'), {
    items: champions,
    updatedAt,
  })
  await writeJson(path.join(outputDir, 'variants.json'), {
    items: variants,
    updatedAt,
  })
  await writeJson(path.join(outputDir, 'formations.json'), {
    items: formations,
    updatedAt,
  })
  await writeJson(path.join(outputDir, 'enums.json'), {
    items: enums,
    updatedAt,
  })
  await writeJson(versionFile, {
    current: currentVersion,
    updatedAt,
    notes: [
      '公共数据来源：Idle Champions 官方客户端 definitions 接口。',
      '名称展示层同时保留官方原文与 language_id=7 返回的中文展示名。',
      '英雄头像资源来自官方 mobile_assets，并按数据版本写入 public/data/<version>/champion-portraits/。',
      '阵型布局已从官方 definitions 的 campaign / adventure game_changes 自动提取；手工补充层只用于必要覆写。',
    ],
  })

  return {
    outputDir,
    versionFile,
    updatedAt,
    counts: {
      champions: champions.length,
      variants: variants.length,
      formations: formations.length,
      enums: enums.length,
    },
  }
}

function printUsage() {
  console.log(`用法：
  node scripts/normalize-idle-champions-definitions.mjs --input <raw-json>

可选参数：
  --input <file>             官方原文 definitions 快照 JSON
  --localizedInput <file>    中文 definitions 快照 JSON；缺省时回退到 --input
  --outputDir <dir>          归一化集合输出目录，默认 ${DEFAULT_OUTPUT_DIR}
  --versionFile <file>       version.json 输出位置，默认 ${DEFAULT_VERSION_FILE}
  --currentVersion <name>    version.json 中的 current 字段，默认 ${DEFAULT_CURRENT_VERSION}
  --manualOverrides <file>   手工补充层 JSON，默认 ${DEFAULT_MANUAL_OVERRIDES}
  --help                     显示帮助
`)
}

async function main() {
  const { values } = parseArgs({
    options: {
      input: { type: 'string' },
      localizedInput: { type: 'string' },
      outputDir: { type: 'string' },
      versionFile: { type: 'string' },
      currentVersion: { type: 'string' },
      manualOverrides: { type: 'string' },
      help: { type: 'boolean' },
    },
  })

  if (values.help) {
    printUsage()
    return
  }

  const result = await normalizeDefinitionsSnapshot(values)

  console.log(`归一化完成：`)
  console.log(`- 输出目录: ${result.outputDir}`)
  console.log(`- version.json: ${result.versionFile}`)
  console.log(`- updatedAt: ${result.updatedAt}`)
  console.log(
    `- counts: champions=${result.counts.champions}, variants=${result.counts.variants}, formations=${result.counts.formations}, enums=${result.counts.enums}`,
  )
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(`归一化 definitions 失败：${error.message}`)
    process.exitCode = 1
  })
}
