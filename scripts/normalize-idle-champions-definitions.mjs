import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import { parseArgs } from 'node:util'
import { pathToFileURL } from 'node:url'
import { readJson, readJsonIfExists, writeJson } from './data/io-utils.ts'
import {
  compareLocalizedText,
  normalizeJsonValue,
  normalizeLocalizedText,
  normalizeLocalizedTextList,
  normalizeNumber,
  normalizeNumberList,
  normalizeOptionalLocalizedText,
  toLocalizedOverrideList,
  toText,
  toTextList,
  toStringList,
  uniqueLocalizedTexts,
  uniqueNumbers,
  uniqueStrings,
} from './data/normalize-text-utils.ts'
import {
  normalizeChampion,
  normalizeChampionDetail,
  normalizeChampionVisual,
  normalizeChampionVisualSkin,
} from './data/normalize-champions.mjs'
import {
  buildAdventureMap,
  buildAffiliationMap,
  buildCampaignMap,
  buildIdMap,
  buildMonsterCatalog,
  buildSceneMap,
  buildVariantMetadataMap,
  mergeVariants,
  normalizeAdventure,
  normalizeManualFormations,
  normalizePatrons,
  normalizeVariant,
} from './data/normalize-adventures.mjs'
import {
  DEFAULT_MASTER_API_URL,
  buildChampionPortraitPath,
  buildGraphicMap,
  collectChampionPortraitSources,
  isPlayableChampion,
  resolveGraphicAssetById,
} from './data/champion-asset-helpers.ts'
import { extractOfficialFormations, looksLikeVariant } from './data/formation-layout-helpers.mjs'
import {
  buildChampionPatronEligibility,
  buildScenarioModeTags,
  buildScenarioRuleContextId,
  normalizeOfficialBuffDefinition,
  normalizeOfficialEffectKeyDefinition,
  normalizeOfficialGameRuleDefinition,
  normalizeOfficialStatDefinition,
  normalizePatronPerkDefinition,
  normalizePatronDefinition,
  normalizePatronPerkTierDefinition,
  normalizePatronObjectiveTiers,
  normalizeTrialsDifficultyDefinition,
  normalizeTrialsRoleDefinition,
} from './data/official-rule-helpers.mjs'

const DEFAULT_OUTPUT_DIR = 'public/data/v1'
const DEFAULT_VERSION_FILE = 'public/data/version.json'
const DEFAULT_MANUAL_OVERRIDES = 'scripts/data/manual-overrides.json'
const DEFAULT_CURRENT_VERSION = 'v1'

/**
 * 归一化 upgrade.effect 到标准 effect 引用串。
 *
 * CNE 数据源格式特性（非 bug，见 AGENTS.md 1.3）：upgrade_defines.effect 有时是
 * JSON 对象串（'{"effect_string":"buff_upgrade,...","description":"..."}'），序列化
 * 不稳定——357 条对象串中 19 条 effect_string 行末缺逗号为伪 JSON。内部 effect_string
 * 才是真正的 effect 定义；在归一化层统一提取，让下游消费方永远拿到干净的标准串
 * （'buff_upgrade,...'），不必各自处理伪 JSON。description / data 等元信息丢弃
 * （当前无下游消费）。
 */


function getUpdatedAt(rawDefinitions) {
  if (typeof rawDefinitions.current_time === 'number') {
    return new Date(rawDefinitions.current_time * 1000).toISOString().slice(0, 10)
  }

  return new Date().toISOString().slice(0, 10)
}


/**
 * 从 game_changes 提取英雄限制（阶段 9.2）：
 * - force_use_heroes（{hero_ids:[N]}）→ forcedHeroIds
 * - only_allow_crusaders（{by_ids:{ids:[...]}, by_tags:{tags:"a|b"}}）→ allowedHeroIds + allowedTags（| 为 OR）
 * allowedHeroIds/allowedTags 仅在该变体含 only_allow_crusaders 时非空（hasAllowed 语义）。
 */


function groupDefinitionsByHeroId(definitions = []) {
  const result = new Map()

  for (const definition of definitions) {
    const heroId = definition?.hero_id

    if (heroId === undefined) {
      continue
    }

    const key = String(heroId)
    const existing = result.get(key) ?? []
    existing.push(definition)
    result.set(key, existing)
  }

  return result
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

function normalizeEnums(champions, affiliationMap, campaignMap, patrons, adventures, variants) {
  const campaigns = Array.from(campaignMap.entries())
    .map(([, value]) => value)
    .sort((left, right) => Number(left.id) - Number(right.id))
  const modes = uniqueStrings([
    ...adventures.flatMap((adventure) => adventure.modeTags ?? []),
    ...variants.flatMap((variant) => variant.modeTags ?? []),
  ]).sort((left, right) => left.localeCompare(right))

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
    {
      id: 'patrons',
      values: patrons.map((patron) => ({
        id: patron.id,
        original: patron.name.original,
        display: patron.name.display,
      })),
    },
    {
      id: 'modes',
      values: modes,
    },
  ]
}

async function readManualOverrides(filePath) {
  // 文件可选：缺失（ENOENT）返回空默认；但 JSON 损坏必须抛错，避免静默丢失手工 override。
  const overrides = await readJsonIfExists(filePath)
  return overrides ?? { championOverrides: {}, variants: [], formations: [] }
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
  const masterApiUrl = options.masterApiUrl ?? DEFAULT_MASTER_API_URL
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
  const adventureMap = buildAdventureMap(
    rawDefinitions.adventure_defines ?? [],
    localizedDefinitions.adventure_defines ?? [],
    campaignMap,
  )
  const sceneMap = buildSceneMap(adventureMap)
  const localizedChampionsById = new Map(
    (localizedDefinitions.hero_defines ?? []).map((definition) => [String(definition.id), definition]),
  )
  const localizedVariantsById = new Map(
    (localizedDefinitions.adventure_defines ?? []).map((definition) => [String(definition.id), definition]),
  )
  const patrons = normalizePatrons(
    rawDefinitions.patron_defines ?? [],
    localizedDefinitions.patron_defines ?? [],
  )
  const localizedPatronPerksById = buildIdMap(localizedDefinitions.patron_perk_defines)
  const localizedTrialsRolesById = buildIdMap(localizedDefinitions.trials_role_defines)
  const localizedTrialsDifficultiesById = buildIdMap(localizedDefinitions.trials_difficulty_defines)
  const localizedBuffsById = buildIdMap(localizedDefinitions.buff_defines)
  const localizedEffectKeysById = buildIdMap(localizedDefinitions.effect_key_defines)
  const attackDefinitionsById = buildIdMap(rawDefinitions.attack_defines)
  const localizedAttackDefinitionsById = buildIdMap(localizedDefinitions.attack_defines)
  const upgradesByHeroId = groupDefinitionsByHeroId(rawDefinitions.upgrade_defines)
  const localizedUpgradesById = buildIdMap(localizedDefinitions.upgrade_defines)
  const effectDefinitionsById = buildIdMap(rawDefinitions.effect_defines)
  const localizedEffectDefinitionsById = buildIdMap(localizedDefinitions.effect_defines)
  const featsByHeroId = groupDefinitionsByHeroId(rawDefinitions.hero_feat_defines)
  const localizedFeatsById = buildIdMap(localizedDefinitions.hero_feat_defines)
  const skinsByHeroId = groupDefinitionsByHeroId(rawDefinitions.hero_skin_defines)
  const localizedSkinsById = buildIdMap(localizedDefinitions.hero_skin_defines)
  const lootByHeroId = groupDefinitionsByHeroId(rawDefinitions.loot_defines)
  const localizedLootById = buildIdMap(localizedDefinitions.loot_defines)
  const legendaryEffectDefinitionsById = buildIdMap(rawDefinitions.legendary_effect_defines)
  const localizedLegendaryEffectDefinitionsById = buildIdMap(localizedDefinitions.legendary_effect_defines)
  const monsterCatalog = buildMonsterCatalog(rawDefinitions, attackDefinitionsById)
  const variantMetadataById = buildVariantMetadataMap(
    rawDefinitions.adventure_defines ?? [],
    localizedDefinitions.adventure_defines ?? [],
    campaignMap,
    monsterCatalog,
  )
  const graphicMap = buildGraphicMap(rawDefinitions.graphic_defines)
  const portraitSourcesByChampionId = new Map(
    collectChampionPortraitSources(rawDefinitions, masterApiUrl).map((source) => [source.championId, source]),
  )
  const playableChampionDefinitions = (rawDefinitions.hero_defines ?? []).filter((definition) =>
    isPlayableChampion(definition),
  )
  const patronEligibilityByChampionId = new Map(
    playableChampionDefinitions.map((definition) => [
      String(definition.id),
      buildChampionPatronEligibility(definition, patrons, updatedAt),
    ]),
  )
  const gameRules = (rawDefinitions.game_rule_defines ?? [])
    .map((definition) => normalizeOfficialGameRuleDefinition(definition))
    .filter(Boolean)
    .sort((left, right) => Number(left.id) - Number(right.id))
  const effectReference = {
    stats: (rawDefinitions.stat_defines ?? [])
      .map((definition) => normalizeOfficialStatDefinition(definition))
      .filter(Boolean)
      .sort((left, right) => Number(left.id) - Number(right.id)),
    buffs: (rawDefinitions.buff_defines ?? [])
      .map((definition) =>
        normalizeOfficialBuffDefinition(
          definition,
          localizedBuffsById.get(String(definition.id)) ?? definition,
        ),
      )
      .filter(Boolean)
      .sort((left, right) => Number(left.id) - Number(right.id)),
    effectKeys: (rawDefinitions.effect_key_defines ?? [])
      .map((definition) =>
        normalizeOfficialEffectKeyDefinition(
          definition,
          localizedEffectKeysById.get(String(definition.id)) ?? definition,
        ),
      )
      .filter(Boolean)
      .sort((left, right) => Number(left.id) - Number(right.id)),
  }
  const patronPerkTiers = (rawDefinitions.patron_perk_tier_defines ?? [])
    .map((definition) => normalizePatronPerkTierDefinition(definition))
    .filter(Boolean)
    .sort(
      (left, right) =>
        Number(left.patronId) - Number(right.patronId) ||
        Number(left.tierId) - Number(right.tierId) ||
        Number(left.id) - Number(right.id),
    )
  const patronPerks = (rawDefinitions.patron_perk_defines ?? [])
    .map((definition) =>
      normalizePatronPerkDefinition(
        definition,
        localizedPatronPerksById.get(String(definition.id)) ?? definition,
      ),
    )
    .filter(Boolean)
    .sort(
      (left, right) =>
        Number(left.patronId) - Number(right.patronId) ||
        Number(left.tierId) - Number(right.tierId) ||
        Number(left.id) - Number(right.id),
    )
  const trialsRoles = (rawDefinitions.trials_role_defines ?? [])
    .map((definition) =>
      normalizeTrialsRoleDefinition(
        definition,
        localizedTrialsRolesById.get(String(definition.id)) ?? definition,
        adventureMap.get(String(definition.adventure_id ?? '')) ?? null,
      ),
    )
    .filter(Boolean)
    .sort((left, right) => Number(left.id) - Number(right.id))
  const trialsDifficulties = (rawDefinitions.trials_difficulty_defines ?? [])
    .map((definition) =>
      normalizeTrialsDifficultyDefinition(
        definition,
        localizedTrialsDifficultiesById.get(String(definition.id)) ?? definition,
      ),
    )
    .filter(Boolean)
    .sort((left, right) => Number(left.id) - Number(right.id))

  const champions = playableChampionDefinitions
    .map((definition) =>
      normalizeChampion(
        definition,
        localizedChampionsById.get(String(definition.id)),
        affiliationMap,
        currentVersion,
        portraitSourcesByChampionId.get(String(definition.id)) ?? null,
        patronEligibilityByChampionId.get(String(definition.id)),
        manualOverrides.championOverrides?.[String(definition.id)] ?? {},
      ),
    )
    .sort(
      (left, right) =>
        left.seat - right.seat ||
        left.name.display.localeCompare(right.name.display) ||
        Number(left.id) - Number(right.id),
    )
  const championDefinitionsById = new Map(
    playableChampionDefinitions.map((definition) => [String(definition.id), definition]),
  )
  const championDetails = champions.map((champion) =>
    normalizeChampionDetail(
      champion,
      championDefinitionsById.get(champion.id),
      localizedChampionsById.get(champion.id),
      updatedAt,
      attackDefinitionsById,
      localizedAttackDefinitionsById,
      upgradesByHeroId,
      localizedUpgradesById,
      effectDefinitionsById,
      localizedEffectDefinitionsById,
      featsByHeroId,
      localizedFeatsById,
      skinsByHeroId,
      localizedSkinsById,
      lootByHeroId,
      localizedLootById,
      legendaryEffectDefinitionsById,
      localizedLegendaryEffectDefinitionsById,
      ),
    )

  const adventures = (rawDefinitions.adventure_defines ?? [])
    .filter((definition) => !looksLikeVariant(definition))
    .map((definition) => {
      const normalizedAdventure = adventureMap.get(String(definition.id))
      const sceneKey =
        normalizedAdventure?.locationId
          ? `${normalizedAdventure.campaign.id}:${normalizedAdventure.locationId}`
          : null

      return normalizeAdventure(
        definition,
        localizedVariantsById.get(String(definition.id)),
        normalizedAdventure,
        sceneKey ? sceneMap.get(sceneKey) ?? null : null,
      )
    })
    .sort((left, right) => Number(left.id) - Number(right.id))

  const autoVariants = (rawDefinitions.adventure_defines ?? [])
    .filter((definition) => looksLikeVariant(definition))
    .map((definition) =>
      normalizeVariant(
        definition,
        localizedVariantsById.get(String(definition.id)),
        campaignMap,
        variantMetadataById,
      ),
    )

  const variants = mergeVariants(autoVariants, manualOverrides.variants ?? [])
  const officialFormations = extractOfficialFormations(rawDefinitions, localizedDefinitions)
  const formations = mergeFormations(
    officialFormations,
    normalizeManualFormations(manualOverrides.formations ?? []),
  )
  const enums = normalizeEnums(champions, affiliationMap, campaignMap, patrons, adventures, variants)
  const championVisuals = playableChampionDefinitions
    .map((definition) => {
      const championId = String(definition.id)
      const skins = (skinsByHeroId.get(championId) ?? [])
        .map((skinDefinition) =>
          normalizeChampionVisualSkin(
            skinDefinition,
            localizedSkinsById.get(String(skinDefinition.id)),
            graphicMap,
            masterApiUrl,
          ),
        )
        .sort(
          (left, right) =>
            left.name.display.localeCompare(right.name.display) ||
            left.name.original.localeCompare(right.name.original) ||
            Number(left.id) - Number(right.id),
        )

      return normalizeChampionVisual(
        definition,
        localizedChampionsById.get(championId),
        portraitSourcesByChampionId.get(championId) ?? null,
        skins,
        graphicMap,
        currentVersion,
        masterApiUrl,
      )
    })
    .sort(
      (left, right) =>
        left.seat - right.seat ||
        left.name.display.localeCompare(right.name.display) ||
        Number(left.championId) - Number(right.championId),
    )

  await writeJson(path.join(outputDir, 'champions.json'), {
    items: champions,
    updatedAt,
  })
  await writeJson(path.join(outputDir, 'champion-visuals.json'), {
    items: championVisuals,
    updatedAt,
  })
  const championDetailsDir = path.join(outputDir, 'champion-details')
  await mkdir(championDetailsDir, { recursive: true })
  for (const detail of championDetails) {
    await writeJson(path.join(championDetailsDir, `${detail.summary.id}.json`), detail)
  }
  await writeJson(path.join(outputDir, 'variants.json'), {
    items: variants,
    updatedAt,
  })
  await writeJson(path.join(outputDir, 'adventures.json'), {
    items: adventures,
    updatedAt,
  })
  await writeJson(path.join(outputDir, 'patrons.json'), {
    items: patrons,
    updatedAt,
  })
  await writeJson(path.join(outputDir, 'game-rules.json'), {
    items: gameRules,
    updatedAt,
  })
  await writeJson(path.join(outputDir, 'effect-reference.json'), {
    stats: effectReference.stats,
    buffs: effectReference.buffs,
    effectKeys: effectReference.effectKeys,
    updatedAt,
  })
  await writeJson(path.join(outputDir, 'patron-perks.json'), {
    tiers: patronPerkTiers,
    perks: patronPerks,
    updatedAt,
  })
  await writeJson(path.join(outputDir, 'trials.json'), {
    roles: trialsRoles,
    difficulties: trialsDifficulties,
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
      '共享英雄数据现已补充 patron 基线资格，场景数据现已补充 adventures / patrons / rule context / mode tags。',
      '共享效果参考层现已补充 effect-reference.json，统一承接官方 stat / buff / effect-key 字典。',
      '共享规则层现已补充 game-rules.json、patron-perks.json、trials.json，承接官方稳定规则、Patron Perk 与 Trials 基座事实。',
      '英雄详情页数据按 public/data/<version>/champion-details/<hero-id>.json 输出，包含结构化字段与原始快照片段。',
      '英雄本体立绘与皮肤资源的官方定位元数据见 public/data/<version>/champion-visuals.json；立绘页直接消费的本地静态资源见 public/data/<version>/champion-illustrations.json。',
      '宠物页签数据来自 familiar_defines / premium_item_defines / patron_shop_item_defines，并输出到 public/data/<version>/pets.json 与 public/data/<version>/pets/。',
      '阵型布局已从官方 definitions 的 campaign / adventure game_changes 自动提取；手工补充层只用于必要覆写。',
    ],
  })

  return {
    outputDir,
    versionFile,
    updatedAt,
    counts: {
      champions: champions.length,
      championVisuals: championVisuals.length,
      championDetails: championDetails.length,
      adventures: adventures.length,
      patrons: patrons.length,
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
  --masterApiUrl <url>       远端 mobile_assets 基础地址，默认 ${DEFAULT_MASTER_API_URL}
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
      masterApiUrl: { type: 'string' },
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
    `- counts: champions=${result.counts.champions}, championVisuals=${result.counts.championVisuals}, championDetails=${result.counts.championDetails}, adventures=${result.counts.adventures}, patrons=${result.counts.patrons}, variants=${result.counts.variants}, formations=${result.counts.formations}, enums=${result.counts.enums}`,
  )
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(`归一化 definitions 失败：${error.message}`)
    process.exitCode = 1
  })
}


