import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { parseArgs } from 'node:util'
import { pathToFileURL } from 'node:url'

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

function getUpdatedAt(rawDefinitions) {
  if (typeof rawDefinitions.current_time === 'number') {
    return new Date(rawDefinitions.current_time * 1000).toISOString().slice(0, 10)
  }

  return new Date().toISOString().slice(0, 10)
}

function buildAffiliationMap(affiliationDefinitions = []) {
  const entries = affiliationDefinitions
    .map((definition) => {
      const tag = definition.affiliation_tag ?? definition.tag ?? definition.key
      const name = definition.name ?? definition.label ?? tag

      if (!tag || !name) {
        return null
      }

      return [String(tag), String(name)]
    })
    .filter(Boolean)

  return new Map(entries)
}

function buildCampaignMap(campaignDefinitions = []) {
  const entries = campaignDefinitions
    .map((definition) => {
      const id = definition.id ?? definition.campaign_id
      const name = definition.name ?? definition.campaign_name ?? definition.label

      if (id === undefined || !name) {
        return null
      }

      return [String(id), String(name)]
    })
    .filter(Boolean)

  return new Map(entries)
}

function normalizeChampion(definition, affiliationMap, override = {}) {
  const tags = uniqueStrings([
    ...toStringList(definition.tags),
    ...toStringList(override.tags),
  ]).sort((left, right) => left.localeCompare(right))

  const roles = uniqueStrings([
    ...tags.filter((tag) => ROLE_TAGS.has(tag)),
    ...toStringList(override.roles),
  ]).sort((left, right) => left.localeCompare(right))

  const affiliations = uniqueStrings([
    ...toStringList(definition.affiliation_tags).map(
      (tag) => affiliationMap.get(tag) ?? tag,
    ),
    ...toStringList(override.affiliations),
  ]).sort((left, right) => left.localeCompare(right))

  return {
    id: String(definition.id),
    name:
      override.name ??
      definition.name ??
      definition.character_sheet_details?.full_name ??
      `Champion ${definition.id}`,
    seat: Number(definition.seat_id ?? definition.seat ?? 0),
    roles,
    affiliations,
    tags,
  }
}

function looksLikeVariant(definition) {
  return (
    definition.variant_adventure_id !== undefined ||
    definition.base_adventure_id !== undefined ||
    definition.variant_id !== undefined ||
    definition.adventure_variant_id !== undefined
  )
}

function normalizeVariant(definition, campaignMap) {
  return {
    id: String(definition.id),
    name: definition.name ?? `Variant ${definition.id}`,
    campaign: campaignMap.get(String(definition.campaign_id ?? '')) ?? String(definition.campaign_id ?? ''),
    restrictions: uniqueStrings([
      ...toStringList(definition.requirements_text),
      ...toStringList(definition.requirements_description),
      ...toStringList(definition.restrictions_text),
      ...toStringList(definition.restrictions),
    ]),
    rewards: uniqueStrings([
      ...toStringList(definition.reward_description),
      ...toStringList(definition.reward_descriptions),
      ...toStringList(definition.rewards_text),
      ...toStringList(definition.rewards),
    ]),
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
      restrictions: uniqueStrings([
        ...toStringList(merged.get(id)?.restrictions),
        ...toStringList(variant.restrictions),
      ]),
      rewards: uniqueStrings([
        ...toStringList(merged.get(id)?.rewards),
        ...toStringList(variant.rewards),
      ]),
    })
  }

  return Array.from(merged.values()).sort((left, right) => Number(left.id) - Number(right.id))
}

function normalizeFormations(formations = []) {
  return formations
    .map((formation) => ({
      id: String(formation.id),
      name: String(formation.name ?? formation.id),
      slots: Array.isArray(formation.slots)
        ? formation.slots.map((slot) => ({
            id: String(slot.id),
            row: Number(slot.row),
            column: Number(slot.column),
          }))
        : [],
    }))
    .sort((left, right) => left.name.localeCompare(right.name))
}

function normalizeEnums(champions, affiliationMap, campaignMap) {
  const campaigns = Array.from(campaignMap.entries())
    .map(([id, name]) => ({ id, name }))
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
      values: uniqueStrings(Array.from(affiliationMap.values())).sort((left, right) =>
        left.localeCompare(right),
      ),
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
  const manualOverrides = await readManualOverrides(manualOverridesFile)
  const updatedAt = getUpdatedAt(rawDefinitions)
  const affiliationMap = buildAffiliationMap(rawDefinitions.affiliation_defines)
  const campaignMap = buildCampaignMap(rawDefinitions.campaign_defines)

  const champions = (rawDefinitions.hero_defines ?? [])
    .map((definition) =>
      normalizeChampion(
        definition,
        affiliationMap,
        manualOverrides.championOverrides?.[String(definition.id)] ?? {},
      ),
    )
    .sort((left, right) => left.seat - right.seat || Number(left.id) - Number(right.id))

  const autoVariants = (rawDefinitions.adventure_defines ?? [])
    .filter((definition) => looksLikeVariant(definition))
    .map((definition) => normalizeVariant(definition, campaignMap))

  const variants = mergeVariants(autoVariants, manualOverrides.variants ?? [])
  const formations = normalizeFormations(manualOverrides.formations ?? [])
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
      '阵型布局、变体说明与中文补充建议通过 scripts/data/manual-overrides.json 维护。',
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
  --input <file>             原始 definitions 快照 JSON
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
