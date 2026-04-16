import { execFile } from 'node:child_process'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { parseArgs, promisify } from 'node:util'
import { pathToFileURL } from 'node:url'
import { inflateRawSync, inflateSync, unzipSync } from 'node:zlib'
import { PNG } from 'pngjs'
import {
  DEFAULT_MASTER_API_URL,
  buildGraphicMap,
  buildMobileAssetUrl,
} from './data/champion-asset-helpers.mjs'
import { extractWrappedPngBuffer } from './data/mobile-asset-codec.mjs'

const DEFAULT_OUTPUT_DIR = 'public/data/v1'
const DEFAULT_CURRENT_VERSION = 'v1'
const DEFAULT_CONCURRENCY = 8
const FETCH_TIMEOUT_MS = 20_000
const PET_ICON_DIR_NAME = 'pets/icons'
const PET_ILLUSTRATION_DIR_NAME = 'pets/illustrations'
const execFileAsync = promisify(execFile)

function toText(value) {
  if (typeof value === 'string') {
    const trimmed = value.trim()
    return trimmed || null
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value)
  }

  return null
}

function toNonZeroText(value) {
  const text = toText(value)

  if (!text || text === '0') {
    return null
  }

  return text
}

function toNumber(value) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  if (typeof value === 'string') {
    const trimmed = value.trim()

    if (!trimmed) {
      return null
    }

    const parsed = Number(trimmed)
    return Number.isFinite(parsed) ? parsed : null
  }

  return null
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

function compareLocalizedText(left, right) {
  return left.display.localeCompare(right.display) || left.original.localeCompare(right.original)
}

function buildIdMap(definitions = []) {
  return new Map(
    definitions
      .filter((definition) => definition?.id !== undefined && definition?.id !== null)
      .map((definition) => [String(definition.id), definition]),
  )
}

function getUpdatedAt(rawDefinitions) {
  if (typeof rawDefinitions.current_time === 'number') {
    return new Date(rawDefinitions.current_time * 1000).toISOString().slice(0, 10)
  }

  return new Date().toISOString().slice(0, 10)
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, 'utf8'))
}

async function writeJson(filePath, value) {
  await mkdir(path.dirname(filePath), { recursive: true })
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
}

async function readExistingImage(filePath, outputPath) {
  try {
    const buffer = await readFile(filePath)
    const png = PNG.sync.read(buffer)

    return {
      path: outputPath,
      width: png.width,
      height: png.height,
      bytes: buffer.length,
      format: 'png',
    }
  } catch {
    return null
  }
}

function buildPremiumRefsByFamiliarId(rawDefinitions, localizedDefinitions) {
  const localizedById = buildIdMap(localizedDefinitions)
  const refsByFamiliarId = new Map()

  for (const premiumItem of rawDefinitions ?? []) {
    for (const effect of premiumItem.effect ?? []) {
      if (effect?.type !== 'familiar' || effect.familiar_id === undefined || effect.familiar_id === null) {
        continue
      }

      const familiarId = String(effect.familiar_id)
      const refs = refsByFamiliarId.get(familiarId) ?? []
      refs.push({
        raw: premiumItem,
        localized: localizedById.get(String(premiumItem.id)) ?? premiumItem,
      })
      refsByFamiliarId.set(familiarId, refs)
    }
  }

  return refsByFamiliarId
}

function buildPatronRefsByFamiliarId(rawDefinitions, localizedDefinitions) {
  const localizedById = buildIdMap(localizedDefinitions)
  const refsByFamiliarId = new Map()

  for (const patronItem of rawDefinitions ?? []) {
    for (const effect of patronItem.effects ?? []) {
      if (effect?.type !== 'familiar' || effect.familiar_id === undefined || effect.familiar_id === null) {
        continue
      }

      refsByFamiliarId.set(String(effect.familiar_id), {
        raw: patronItem,
        localized: localizedById.get(String(patronItem.id)) ?? patronItem,
      })
    }
  }

  return refsByFamiliarId
}

function pickBestPremiumRef(familiarDefinition, refs = []) {
  if (refs.length === 0) {
    return null
  }

  const premiumItemId = toNonZeroText(familiarDefinition.cost?.premium_item)
  const sourceItemId = toNonZeroText(familiarDefinition.collections_source?.item_id)
  const familiarName = String(familiarDefinition.name ?? '').trim().toLowerCase()

  return [...refs]
    .sort((left, right) => {
      const leftScore = scorePremiumRef(left)
      const rightScore = scorePremiumRef(right)

      if (rightScore !== leftScore) {
        return rightScore - leftScore
      }

      return Number(right.raw.id ?? 0) - Number(left.raw.id ?? 0)
    })[0]

  function scorePremiumRef(ref) {
    const rawId = toNonZeroText(ref.raw.id)
    const rawName = String(ref.raw.name ?? '').trim().toLowerCase()
    let score = 0

    if (premiumItemId && rawId === premiumItemId) {
      score += 1000
    }

    if (sourceItemId && rawId === sourceItemId) {
      score += 900
    }

    if (familiarName && rawName.includes(familiarName)) {
      score += 200
    }

    if (rawName.includes('familiar pack')) {
      score += 50
    }

    if (rawName.includes('theme pack')) {
      score += 35
    }

    if (rawName.includes('bundle')) {
      score -= 20
    }

    if (ref.raw.properties?.retired !== true) {
      score += 10
    }

    return score
  }
}

function readPatronInfluenceRequirement(requirements = []) {
  for (const requirement of requirements) {
    if (requirement?.condition === 'patron_total_influence') {
      return toNumber(requirement.influence)
    }
  }

  return null
}

function resolveAcquisitionKind(sourceType, premiumRef, patronRef) {
  if (sourceType === 'gems') {
    return 'gems'
  }

  if (sourceType === 'patron' || patronRef) {
    return 'patron'
  }

  if (sourceType === 'not_yet_available') {
    return 'not-yet-available'
  }

  if (premiumRef || sourceType === 'dlc' || sourceType === 'flash_sale') {
    return 'premium'
  }

  return 'unknown'
}

function buildAcquisition(definition, premiumRef, patronRef, patronsById, localizedPatronsById) {
  const sourceType = toText(definition.collections_source?.type)
  const kind = resolveAcquisitionKind(sourceType, premiumRef, patronRef)
  const gemCost = sourceType === 'gems'
    ? toNumber(definition.collections_source?.cost ?? definition.cost?.soft_currency)
    : null

  const patronId = toNonZeroText(definition.collections_source?.patron_id ?? patronRef?.raw?.patron_id)
  const patronDefinition = patronId ? patronsById.get(patronId) ?? null : null
  const localizedPatronDefinition = patronId
    ? localizedPatronsById.get(patronId) ?? patronDefinition
    : null
  const patronName = patronDefinition
    ? normalizeLocalizedText(
        patronDefinition.name,
        localizedPatronDefinition?.name,
        `Patron ${patronId}`,
      )
    : null
  const patronCurrency = patronDefinition
    ? normalizeLocalizedText(
        patronDefinition.currency_name_plural ?? patronDefinition.currency_name,
        localizedPatronDefinition?.currency_name_plural ?? localizedPatronDefinition?.currency_name,
        patronDefinition.currency_name_plural ?? patronDefinition.currency_name ?? 'Patron currency',
      )
    : null
  const patronCost = patronRef ? toNumber(patronRef.raw.cost?.patron_currency) : null
  const patronInfluence = patronRef ? readPatronInfluenceRequirement(patronRef.raw.requirements ?? []) : null
  const premiumPackName = premiumRef
    ? normalizeLocalizedText(
        premiumRef.raw.name,
        premiumRef.localized?.name,
        `Premium item ${premiumRef.raw.id}`,
      )
    : null
  const premiumPackDescription = premiumRef
    ? normalizeLocalizedText(
        premiumRef.raw.description,
        premiumRef.localized?.description,
        premiumRef.raw.description ?? premiumRef.raw.name ?? '',
      )
    : null

  return {
    kind,
    sourceType,
    gemCost,
    premiumPackName,
    premiumPackDescription,
    patronName,
    patronCurrency,
    patronCost,
    patronInfluence,
  }
}

function decodeGraphicBuffer(rawBuffer) {
  const decoders = [
    () => extractWrappedPngBuffer(rawBuffer),
    () => extractWrappedPngBuffer(inflateSync(rawBuffer)),
    () => extractWrappedPngBuffer(inflateRawSync(rawBuffer)),
    () => extractWrappedPngBuffer(unzipSync(rawBuffer)),
  ]
  const errors = []

  for (const decode of decoders) {
    try {
      const candidate = decode()
      PNG.sync.read(candidate)
      return candidate
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error))
    }
  }

  throw new Error(errors.join(' | '))
}

function findOpaqueBounds(png) {
  let left = png.width
  let top = png.height
  let right = -1
  let bottom = -1

  for (let y = 0; y < png.height; y += 1) {
    for (let x = 0; x < png.width; x += 1) {
      const alpha = png.data[(png.width * y + x) * 4 + 3]

      if (alpha === 0) {
        continue
      }

      left = Math.min(left, x)
      top = Math.min(top, y)
      right = Math.max(right, x)
      bottom = Math.max(bottom, y)
    }
  }

  if (right < left || bottom < top) {
    return null
  }

  return {
    left,
    top,
    width: right - left + 1,
    height: bottom - top + 1,
  }
}

function copyOpaqueRegion(source, bounds, target, offsetX, offsetY) {
  for (let y = 0; y < bounds.height; y += 1) {
    for (let x = 0; x < bounds.width; x += 1) {
      const sourceIndex = ((bounds.top + y) * source.width + (bounds.left + x)) * 4
      const targetIndex = ((offsetY + y) * target.width + (offsetX + x)) * 4

      target.data[targetIndex] = source.data[sourceIndex]
      target.data[targetIndex + 1] = source.data[sourceIndex + 1]
      target.data[targetIndex + 2] = source.data[sourceIndex + 2]
      target.data[targetIndex + 3] = source.data[sourceIndex + 3]
    }
  }
}

function processIconPng(pngBuffer) {
  const source = PNG.sync.read(pngBuffer)
  const bounds = findOpaqueBounds(source)

  if (!bounds) {
    return {
      pngBuffer,
      width: source.width,
      height: source.height,
      bytes: pngBuffer.length,
    }
  }

  const size = Math.max(bounds.width, bounds.height)
  const output = new PNG({ width: size, height: size })
  const offsetX = Math.floor((size - bounds.width) / 2)
  const offsetY = Math.floor((size - bounds.height) / 2)

  copyOpaqueRegion(source, bounds, output, offsetX, offsetY)

  const normalized = PNG.sync.write(output)
  return {
    pngBuffer: normalized,
    width: output.width,
    height: output.height,
    bytes: normalized.length,
  }
}

function processIllustrationPng(pngBuffer) {
  const source = PNG.sync.read(pngBuffer)
  const bounds = findOpaqueBounds(source)

  if (!bounds) {
    return {
      pngBuffer,
      width: source.width,
      height: source.height,
      bytes: pngBuffer.length,
    }
  }

  const output = new PNG({ width: bounds.width, height: bounds.height })
  copyOpaqueRegion(source, bounds, output, 0, 0)

  const normalized = PNG.sync.write(output)
  return {
    pngBuffer: normalized,
    width: output.width,
    height: output.height,
    bytes: normalized.length,
  }
}

async function runWithConcurrency(items, concurrency, worker) {
  const results = new Array(items.length)
  let cursor = 0

  async function consume() {
    while (cursor < items.length) {
      const currentIndex = cursor
      cursor += 1
      results[currentIndex] = await worker(items[currentIndex], currentIndex)
    }
  }

  await Promise.all(
    Array.from({ length: Math.max(1, Math.min(concurrency, items.length || 1)) }, () => consume()),
  )

  return results
}

async function downloadRawAsset(task) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

  try {
    const response = await fetch(task.remoteUrl, {
      cache: 'no-store',
      signal: controller.signal,
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    return Buffer.from(await response.arrayBuffer())
  } catch (error) {
    const fetchMessage = error instanceof Error ? error.message : String(error)

    try {
      const { stdout } = await execFileAsync(
        'curl',
        ['--http1.1', '-L', '--fail', '--silent', '--show-error', task.remoteUrl],
        {
          encoding: 'buffer',
          maxBuffer: 32 * 1024 * 1024,
        },
      )

      return Buffer.from(stdout)
    } catch (curlError) {
      const curlMessage = curlError instanceof Error ? curlError.message : String(curlError)
      throw new Error(`fetch=${fetchMessage} | curl=${curlMessage}`)
    }
  } finally {
    clearTimeout(timer)
  }
}

async function downloadPetAsset(task) {
  try {
    const rawBuffer = await downloadRawAsset(task)
    const decodedPng = decodeGraphicBuffer(rawBuffer)
    const processed =
      task.variant === 'icon' ? processIconPng(decodedPng) : processIllustrationPng(decodedPng)

    await writeFile(task.outputFile, processed.pngBuffer)

    return {
      petId: task.petId,
      variant: task.variant,
      image: {
        path: task.outputPath,
        width: processed.width,
        height: processed.height,
        bytes: processed.bytes,
        format: 'png',
      },
    }
  } catch (error) {
    throw new Error(
      `解析 pet=${task.petId} variant=${task.variant} 失败 (${task.remoteUrl}): ${error instanceof Error ? error.message : String(error)}`,
    )
  }
}

export async function syncPetsCatalog(options = {}) {
  if (!options.input) {
    throw new Error('缺少 --input，无法根据 definitions 快照同步宠物目录')
  }

  const input = path.resolve(options.input)
  const outputDir = path.resolve(options.outputDir ?? DEFAULT_OUTPUT_DIR)
  const currentVersion = options.currentVersion ?? DEFAULT_CURRENT_VERSION
  const concurrency = Math.max(1, Number(options.concurrency ?? DEFAULT_CONCURRENCY))
  const rawDefinitions = await readJson(input)
  const localizedDefinitions = options.localizedInput
    ? await readJson(path.resolve(options.localizedInput))
    : rawDefinitions
  const updatedAt = getUpdatedAt(rawDefinitions)
  const graphicMap = buildGraphicMap(rawDefinitions.graphic_defines)
  const localizedFamiliarsById = buildIdMap(localizedDefinitions.familiar_defines)
  const patronsById = buildIdMap(rawDefinitions.patron_defines)
  const localizedPatronsById = buildIdMap(localizedDefinitions.patron_defines)
  const premiumRefsByFamiliarId = buildPremiumRefsByFamiliarId(
    rawDefinitions.premium_item_defines,
    localizedDefinitions.premium_item_defines,
  )
  const patronRefsByFamiliarId = buildPatronRefsByFamiliarId(
    rawDefinitions.patron_shop_item_defines,
    localizedDefinitions.patron_shop_item_defines,
  )

  await mkdir(path.join(outputDir, 'pets', 'icons'), { recursive: true })
  await mkdir(path.join(outputDir, 'pets', 'illustrations'), { recursive: true })

  const pets = []
  const tasks = []

  for (const definition of rawDefinitions.familiar_defines ?? []) {
    const petId = String(definition.id)
    const localizedDefinition = localizedFamiliarsById.get(petId) ?? definition
    const premiumRef = pickBestPremiumRef(definition, premiumRefsByFamiliarId.get(petId) ?? [])
    const patronRef = patronRefsByFamiliarId.get(petId) ?? null
    const sourceType = toText(definition.collections_source?.type)
    const isAvailable =
      sourceType !== 'not_yet_available' &&
      Boolean(definition.is_available ?? definition.properties?.is_available ?? false)
    const iconGraphicId = toNonZeroText(definition.graphic_id)
    const illustrationGraphicId = toNonZeroText(definition.properties?.xl_graphic_id)
    const iconGraphic = iconGraphicId ? graphicMap.get(iconGraphicId) ?? null : null
    const illustrationGraphic = illustrationGraphicId ? graphicMap.get(illustrationGraphicId) ?? null : null

    const pet = {
      id: petId,
      name: normalizeLocalizedText(
        definition.name,
        localizedDefinition?.name,
        `Pet ${petId}`,
      ),
      description: normalizeLocalizedText(
        definition.description,
        localizedDefinition?.description,
        definition.description ?? definition.name ?? `Pet ${petId}`,
      ),
      isAvailable,
      iconGraphicId,
      illustrationGraphicId,
      acquisition: buildAcquisition(
        definition,
        premiumRef,
        patronRef,
        patronsById,
        localizedPatronsById,
      ),
      icon: null,
      illustration: null,
    }

    const iconOutputFile = path.join(outputDir, 'pets', 'icons', `${petId}.png`)
    const iconOutputPath = `${currentVersion}/${PET_ICON_DIR_NAME}/${petId}.png`
    const illustrationOutputFile = path.join(outputDir, 'pets', 'illustrations', `${petId}.png`)
    const illustrationOutputPath = `${currentVersion}/${PET_ILLUSTRATION_DIR_NAME}/${petId}.png`

    pet.icon = await readExistingImage(iconOutputFile, iconOutputPath)
    pet.illustration = await readExistingImage(illustrationOutputFile, illustrationOutputPath)

    if (!pet.icon && iconGraphic?.graphic) {
      tasks.push({
        petId,
        variant: 'icon',
        remoteUrl: buildMobileAssetUrl(iconGraphic.graphic, options.masterApiUrl ?? DEFAULT_MASTER_API_URL),
        outputFile: iconOutputFile,
        outputPath: iconOutputPath,
      })
    }

    if (!pet.illustration && illustrationGraphic?.graphic) {
      tasks.push({
        petId,
        variant: 'illustration',
        remoteUrl: buildMobileAssetUrl(
          illustrationGraphic.graphic,
          options.masterApiUrl ?? DEFAULT_MASTER_API_URL,
        ),
        outputFile: illustrationOutputFile,
        outputPath: illustrationOutputPath,
      })
    }

    pets.push(pet)
  }

  const downloadedAssets = await runWithConcurrency(tasks, concurrency, downloadPetAsset)
  const petById = new Map(pets.map((pet) => [pet.id, pet]))

  for (const asset of downloadedAssets) {
    const pet = petById.get(asset.petId)

    if (!pet) {
      continue
    }

    if (asset.variant === 'icon') {
      pet.icon = asset.image
    } else {
      pet.illustration = asset.image
    }
  }

  const sortedPets = [...pets].sort(
    (left, right) => compareLocalizedText(left.name, right.name) || Number(left.id) - Number(right.id),
  )

  await writeJson(path.join(outputDir, 'pets.json'), {
    items: sortedPets,
    updatedAt,
  })

  return {
    outputDir,
    updatedAt,
    count: sortedPets.length,
    assetCount: downloadedAssets.length,
    counts: {
      icons: sortedPets.filter((pet) => Boolean(pet.icon)).length,
      illustrations: sortedPets.filter((pet) => Boolean(pet.illustration)).length,
      gems: sortedPets.filter((pet) => pet.acquisition.kind === 'gems').length,
      premium: sortedPets.filter((pet) => pet.acquisition.kind === 'premium').length,
      patron: sortedPets.filter((pet) => pet.acquisition.kind === 'patron').length,
      unavailable: sortedPets.filter((pet) => pet.acquisition.kind === 'not-yet-available').length,
      unknown: sortedPets.filter((pet) => pet.acquisition.kind === 'unknown').length,
    },
  }
}

function printUsage() {
  console.log(`用法：
  node scripts/sync-idle-champions-pets.mjs --input <raw-json>

可选参数：
  --input <file>             官方原文 definitions 快照 JSON
  --localizedInput <file>    中文 definitions 快照 JSON；缺省时回退到 --input
  --outputDir <dir>          输出目录，默认 ${DEFAULT_OUTPUT_DIR}
  --currentVersion <name>    pets.json 中写入的版本目录，默认 ${DEFAULT_CURRENT_VERSION}
  --masterApiUrl <url>       远端 mobile_assets 基础地址，默认 ${DEFAULT_MASTER_API_URL}
  --concurrency <n>          并发下载数，默认 ${DEFAULT_CONCURRENCY}
  --help                     显示帮助
`)
}

async function main() {
  const { values } = parseArgs({
    options: {
      input: { type: 'string' },
      localizedInput: { type: 'string' },
      outputDir: { type: 'string' },
      currentVersion: { type: 'string' },
      masterApiUrl: { type: 'string' },
      concurrency: { type: 'string' },
      help: { type: 'boolean' },
    },
  })

  if (values.help) {
    printUsage()
    return
  }

  const result = await syncPetsCatalog(values)

  console.log('宠物目录同步完成：')
  console.log(`- pets: ${result.count}`)
  console.log(`- local assets: ${result.assetCount}`)
  console.log(`- icons: ${result.counts.icons}`)
  console.log(`- illustrations: ${result.counts.illustrations}`)
  console.log(`- gems: ${result.counts.gems}`)
  console.log(`- premium: ${result.counts.premium}`)
  console.log(`- patron: ${result.counts.patron}`)
  console.log(`- unavailable: ${result.counts.unavailable}`)
  console.log(`- unknown: ${result.counts.unknown}`)
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(`同步宠物目录失败：${error.message}`)
    process.exitCode = 1
  })
}
