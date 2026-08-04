import { execFile } from 'node:child_process'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { parseArgs, promisify } from 'node:util'
import { pathToFileURL } from 'node:url'
import { inflateRawSync, inflateSync, unzipSync } from 'node:zlib'
import { PNG } from 'pngjs'
import type { LocalizedText } from '../src/domain/types/common.ts'
import type { PetImage } from '../src/domain/types/assets.ts'
import type { Pet, PetAcquisition, PetAcquisitionKind } from '../src/domain/types/champions.ts'
import {
  compareLocalizedText,
  normalizeLocalizedText,
  toText,
} from './data/normalize-text-utils.ts'
import {
  DEFAULT_MASTER_API_URL,
  buildRemoteGraphicAsset,
  buildGraphicMap,
} from './data/champion-asset-helpers.ts'
import { extractWrappedPngBuffer } from './data/mobile-asset-codec.ts'
import { decodeSkelAnimGraphicBuffer } from './data/skelanim-codec.ts'
import type { SkelAnimSequence } from './data/skelanim-codec.ts'
import {
  readJson,
  writeJson,
  runWithConcurrency,
} from './data/io-utils.ts'
import { findOpaqueBounds, type OpaqueBounds } from './data/png-image-helpers.ts'
import {
  computeSkelAnimFrameBounds,
  renderSkelAnimPoseToPngBuffer,
  type SkelAnimFrameBounds,
} from './data/skelanim-renderer.ts'
import {
  fileExists,
  readExistingCollection,
  removeUnexpectedFiles,
  shouldSkipResourceSync,
} from './data/resource-sync-policy.ts'

const DEFAULT_OUTPUT_DIR = 'public/data/v1'
const DEFAULT_CURRENT_VERSION = 'v1'
const DEFAULT_CONCURRENCY = 8
const DEFAULT_FPS = 24
const FETCH_TIMEOUT_MS = 20_000
const PET_ICON_DIR_NAME = 'pets/icons'
const PET_ILLUSTRATION_DIR_NAME = 'pets/illustrations'
const PET_ANIMATION_DIR_NAME = 'pet-animations'
const PET_ILLUSTRATION_TARGET_EDGE = 320
const PET_ILLUSTRATION_MAX_RASTER_SCALE = 4
const execFileAsync = promisify(execFile)

// 把 unknown 运行时收窄为 Record；定义 JSON 字段访问的统一边界。
function asRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : undefined
}

interface GameDefinitions {
  current_time?: unknown
  graphic_defines?: unknown[]
  familiar_defines?: Record<string, unknown>[]
  premium_item_defines?: Record<string, unknown>[]
  patron_shop_item_defines?: Record<string, unknown>[]
  patron_defines?: Record<string, unknown>[]
}

interface DefinitionRef {
  raw: Record<string, unknown>
  localized: Record<string, unknown>
}

type PremiumRef = DefinitionRef
type PatronRef = DefinitionRef

interface AnimationBounds {
  minX: number
  minY: number
  maxX: number
  maxY: number
}

interface SequenceSummary {
  sequenceIndex: number
  frameCount: number
  pieceCount: number
  firstRenderableFrameIndex: number | null
  bounds: AnimationBounds | null
}

interface PetAnimationAssetEntry {
  path: string
  bytes: number
  format: 'skelanim-zlib'
}

interface PetAnimationItem {
  id: string
  petId: string
  name: LocalizedText
  sourceSlot: 'illustration'
  sourceGraphicId: string
  sourceGraphic: string
  sourceVersion: number | null
  fps: number
  defaultSequenceIndex: number
  defaultFrameIndex: number
  asset: PetAnimationAssetEntry
  sequences: SequenceSummary[]
}

interface DownloadedPetAnimation extends PetAnimationItem {
  mode: 'downloaded'
}

type PetVariant = 'icon' | 'illustration'
type PetRenderMode = 'skelanim' | 'decoded-png'

interface PetAssetTask {
  petId: string
  variant: PetVariant
  asset: { graphicId: string; sourceGraphic: string; sourceVersion: number | null; remotePath: string; remoteUrl: string; delivery: string; uses: string[] }
  renderMode: PetRenderMode
  preferredSequenceIndexes: number[]
  remoteUrl: string
  outputFile: string
  outputPath: string
}

interface PetAnimationTask {
  petId: string
  name: LocalizedText
  asset: { graphicId: string; sourceGraphic: string; sourceVersion: number | null; remotePath: string; remoteUrl: string; delivery: string; uses: string[] }
  preferredSequenceIndexes: number[]
  outputFile: string
  outputPath: string
}

interface DownloadedPetAsset {
  mode: 'downloaded'
  petId: string
  variant: PetVariant
  image: PetImage
}

interface ProcessedPng {
  // eslint-disable-next-line sonarjs/no-reference-error -- Buffer 是 Node.js 运行时全局类型，@types/node 已声明，sonarjs 静态分析未识别
  pngBuffer: Buffer
  width: number
  height: number
  bytes: number
}

interface PetCatalogItem extends Pet {
  iconSourceGraphic: string | null
  iconSourceVersion: number | null
  illustrationSourceGraphic: string | null
  illustrationSourceVersion: number | null
}

interface SyncPetsCatalogOptions {
  input?: string | undefined
  localizedInput?: string | undefined
  outputDir?: string | undefined
  currentVersion?: string | undefined
  masterApiUrl?: string | undefined
  concurrency?: string | undefined
}

interface SyncPetsCatalogCounts {
  icons: number
  illustrations: number
  animations: number
  gems: number
  premium: number
  patron: number
  unavailable: number
  unknown: number
}

interface SyncPetsCatalogResult {
  outputDir: string
  updatedAt: string
  count: number
  assetCount: number
  counts: SyncPetsCatalogCounts
  skipped?: boolean
}

function buildPetAnimationAssetPath(currentVersion: string, petId: string): string {
  return `${currentVersion}/${PET_ANIMATION_DIR_NAME}/illustrations/${petId}.bin`
}

function toNonZeroText(value: unknown): string | null {
  const text = toText(value)

  if (text == null || text === '' || text === '0') {
    return null
  }

  return text
}

function toNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  if (typeof value === 'string') {
    const trimmed = value.trim()

    if (trimmed === '') {
      return null
    }

    const parsed = Number(trimmed)
    return Number.isFinite(parsed) ? parsed : null
  }

  return null
}

function buildIdMap(
  definitions?: readonly Record<string, unknown>[],
): Map<string, Record<string, unknown>> {
  const defs = definitions ?? []
  return new Map(
    defs
      .filter((definition) => definition.id !== undefined && definition.id !== null)
      .map((definition) => [String(definition.id), definition]),
  )
}

function getUpdatedAt(rawDefinitions: GameDefinitions): string {
  if (typeof rawDefinitions.current_time === 'number') {
    return new Date(rawDefinitions.current_time * 1000).toISOString().slice(0, 10)
  }

  return new Date().toISOString().slice(0, 10)
}

function canReusePetImage(existingImage: PetImage | null | undefined, expectedPath: string): boolean {
  return existingImage?.path === expectedPath
}

function canReusePetAnimation(
  existingAnimation: PetAnimationItem | null | undefined,
  task: PetAnimationTask,
): existingAnimation is PetAnimationItem {
  if (!existingAnimation) {
    return false
  }

  return (
    existingAnimation.id === task.petId &&
    existingAnimation.petId === task.petId &&
    existingAnimation.sourceGraphicId === task.asset.graphicId &&
    existingAnimation.sourceGraphic === task.asset.sourceGraphic &&
    (existingAnimation.sourceVersion ?? null) === (task.asset.sourceVersion ?? null) &&
    existingAnimation.asset.path === task.outputPath
  )
}

function buildPremiumRefsByFamiliarId(
  rawDefinitions: readonly Record<string, unknown>[] | undefined,
  localizedDefinitions: readonly Record<string, unknown>[],
): Map<string, PremiumRef[]> {
  const localizedById = buildIdMap(localizedDefinitions)
  const refsByFamiliarId = new Map<string, PremiumRef[]>()

  for (const premiumItem of rawDefinitions ?? []) {
    const effectList = Array.isArray(premiumItem.effect) ? premiumItem.effect : []
    for (const rawEffect of effectList) {
      const effect = asRecord(rawEffect)
      if (effect?.type !== 'familiar' || effect.familiar_id === undefined || effect.familiar_id === null) {
        continue
      }

      const familiarId = toText(effect.familiar_id) ?? ''
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

function buildPatronRefsByFamiliarId(
  rawDefinitions: readonly Record<string, unknown>[] | undefined,
  localizedDefinitions: readonly Record<string, unknown>[],
): Map<string, PatronRef> {
  const localizedById = buildIdMap(localizedDefinitions)
  const refsByFamiliarId = new Map<string, PatronRef>()

  for (const patronItem of rawDefinitions ?? []) {
    const effectList = Array.isArray(patronItem.effects) ? patronItem.effects : []
    for (const rawEffect of effectList) {
      const effect = asRecord(rawEffect)
      if (effect?.type !== 'familiar' || effect.familiar_id === undefined || effect.familiar_id === null) {
        continue
      }

      refsByFamiliarId.set(toText(effect.familiar_id) ?? '', {
        raw: patronItem,
        localized: localizedById.get(String(patronItem.id)) ?? patronItem,
      })
    }
  }

  return refsByFamiliarId
}

function pickBestPremiumRef(
  familiarDefinition: Record<string, unknown>,
  refs: readonly PremiumRef[] = [],
): PremiumRef | null {
  if (refs.length === 0) {
    return null
  }

  const premiumItemId = toNonZeroText(asRecord(familiarDefinition.cost)?.premium_item)
  const sourceItemId = toNonZeroText(asRecord(familiarDefinition.collections_source)?.item_id)
  const familiarName = (toText(familiarDefinition.name) ?? '').trim().toLowerCase()

  function scorePremiumRef(ref: PremiumRef): number {
    const rawId = toNonZeroText(ref.raw.id)
    const rawName = (toText(ref.raw.name) ?? '').trim().toLowerCase()
    let score = 0

    if (premiumItemId != null && premiumItemId !== '' && rawId === premiumItemId) {
      score += 1000
    }

    if (sourceItemId != null && sourceItemId !== '' && rawId === sourceItemId) {
      score += 900
    }

    if (familiarName !== '' && rawName.includes(familiarName)) {
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

    if (asRecord(ref.raw.properties)?.retired !== true) {
      score += 10
    }

    return score
  }

  return [...refs].sort((left, right) => {
    const leftScore = scorePremiumRef(left)
    const rightScore = scorePremiumRef(right)

    if (rightScore !== leftScore) {
      return rightScore - leftScore
    }

    return Number(right.raw.id ?? 0) - Number(left.raw.id ?? 0)
  })[0] ?? null
}

function readPatronInfluenceRequirement(requirements: readonly unknown[] = []): number | null {
  for (const rawRequirement of requirements) {
    const requirement = asRecord(rawRequirement)
    if (requirement?.condition === 'patron_total_influence') {
      return toNumber(requirement.influence)
    }
  }

  return null
}

function resolveAcquisitionKind(
  sourceType: string | null,
  premiumRef: PremiumRef | null,
  patronRef: PatronRef | null,
): PetAcquisitionKind {
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

function buildAcquisition(
  definition: Record<string, unknown>,
  premiumRef: PremiumRef | null,
  patronRef: PatronRef | null,
  patronsById: Map<string, Record<string, unknown>>,
  localizedPatronsById: Map<string, Record<string, unknown>>,
): PetAcquisition {
  const sourceRecord = asRecord(definition.collections_source)
  const costRecord = asRecord(definition.cost)
  const sourceType = toText(sourceRecord?.type)
  const kind = resolveAcquisitionKind(sourceType, premiumRef, patronRef)
  const gemCost = sourceType === 'gems'
    ? toNumber(sourceRecord?.cost ?? costRecord?.soft_currency)
    : null

  const patronId = toNonZeroText(sourceRecord?.patron_id ?? asRecord(patronRef?.raw)?.patron_id)
  const patronDefinition = patronId != null && patronId !== '' ? (patronsById.get(patronId) ?? null) : null
  const localizedPatronDefinition = patronId != null && patronId !== ''
    ? (localizedPatronsById.get(patronId) ?? patronDefinition)
    : null
  const patronName = patronDefinition
    ? normalizeLocalizedText(
      patronDefinition.name,
      localizedPatronDefinition?.name,
      `Patron ${patronId ?? ''}`,
    )
    : null
  const patronCurrency = patronDefinition
    ? normalizeLocalizedText(
      asRecord(patronDefinition)?.currency_name_plural
        ?? asRecord(patronDefinition)?.currency_name,
      asRecord(localizedPatronDefinition)?.currency_name_plural
        ?? asRecord(localizedPatronDefinition)?.currency_name,
      asRecord(patronDefinition)?.currency_name_plural
        ?? asRecord(patronDefinition)?.currency_name ?? 'Patron currency',
    )
    : null
  const patronCost = patronRef ? toNumber(asRecord(patronRef.raw.cost)?.patron_currency) : null
  const patronRequirements = patronRef != null && Array.isArray(patronRef.raw.requirements)
    ? patronRef.raw.requirements
    : []
  const patronInfluence = patronRef != null
    ? readPatronInfluenceRequirement(patronRequirements)
    : null
  const premiumPackName = premiumRef
    ? normalizeLocalizedText(
      premiumRef.raw.name,
      premiumRef.localized.name,
      `Premium item ${String(premiumRef.raw.id)}`,
    )
    : null
  const premiumPackDescription = premiumRef
    ? normalizeLocalizedText(
      premiumRef.raw.description,
      premiumRef.localized.description,
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

function decodeGraphicBuffer(rawBuffer: Buffer): Buffer {
  const decoders: (() => Buffer)[] = [
    () => extractWrappedPngBuffer(rawBuffer),
    () => extractWrappedPngBuffer(inflateSync(rawBuffer)),
    () => extractWrappedPngBuffer(inflateRawSync(rawBuffer)),
    () => extractWrappedPngBuffer(unzipSync(rawBuffer)),
  ]
  const errors: string[] = []

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

function isSkelAnimGraphicDefinition(graphicDefinition: Record<string, unknown> | null | undefined): boolean {
  return Number(graphicDefinition?.type ?? 0) === 3
}

function buildPetGraphicAsset(
  graphicDefinition: Record<string, unknown>,
  baseUrl: string = DEFAULT_MASTER_API_URL,
): ReturnType<typeof buildRemoteGraphicAsset> {
  const asset = buildRemoteGraphicAsset(graphicDefinition, baseUrl)

  if (!asset) {
    return null
  }

  if (!isSkelAnimGraphicDefinition(graphicDefinition)) {
    return asset
  }

  return {
    ...asset,
    delivery: 'zlib-png',
  }
}

function resolvePreferredSequenceIndexes(
  graphicDefinition: Record<string, unknown> | null | undefined,
): number[] {
  const sequenceOverride = asRecord(graphicDefinition?.export_params)?.sequence_override

  if (!Array.isArray(sequenceOverride) || sequenceOverride.length === 0) {
    return []
  }

  return sequenceOverride
    .map((value) => Number(value) - 1)
    .filter((value) => Number.isInteger(value) && value >= 0)
}

function mergeBounds(base: AnimationBounds | null, next: SkelAnimFrameBounds | null): AnimationBounds | null {
  if (!next) {
    return base
  }

  if (!base) {
    return {
      minX: next.minX,
      minY: next.minY,
      maxX: next.maxX,
      maxY: next.maxY,
    }
  }

  return {
    minX: Math.min(base.minX, next.minX),
    minY: Math.min(base.minY, next.minY),
    maxX: Math.max(base.maxX, next.maxX),
    maxY: Math.max(base.maxY, next.maxY),
  }
}

function summarizeSequence(sequence: SkelAnimSequence): SequenceSummary {
  let bounds: AnimationBounds | null = null
  let firstRenderableFrameIndex: number | null = null

  for (let frameIndex = 0; frameIndex < sequence.length; frameIndex += 1) {
    const frameBounds = computeSkelAnimFrameBounds(sequence, frameIndex)

    if (!frameBounds) {
      continue
    }

    firstRenderableFrameIndex ??= frameIndex

    bounds = mergeBounds(bounds, frameBounds)
  }

  return {
    sequenceIndex: sequence.sequenceIndex,
    frameCount: sequence.length,
    pieceCount: sequence.pieces.length,
    firstRenderableFrameIndex,
    bounds,
  }
}

function resolveDefaultSequence(
  sequenceSummaries: readonly SequenceSummary[],
  preferredSequenceIndexes: readonly number[],
): SequenceSummary | null {
  const sequenceByIndex = new Map(sequenceSummaries.map((summary) => [summary.sequenceIndex, summary]))

  for (const preferredIndex of preferredSequenceIndexes) {
    const summary = sequenceByIndex.get(preferredIndex)

    if (summary?.firstRenderableFrameIndex !== null) {
      return summary ?? null
    }
  }

  return sequenceSummaries.find((summary) => summary.firstRenderableFrameIndex !== null) ?? null
}

function resolvePetIllustrationRasterScale(bounds: AnimationBounds): number {
  const width = Math.max(1, Math.ceil(bounds.maxX - bounds.minX))
  const height = Math.max(1, Math.ceil(bounds.maxY - bounds.minY))
  const maxEdge = Math.max(width, height)

  return Math.max(
    1,
    Math.min(PET_ILLUSTRATION_MAX_RASTER_SCALE, Math.ceil(PET_ILLUSTRATION_TARGET_EDGE / maxEdge)),
  )
}

async function renderPetSkelAnimPng(task: PetAssetTask, rawBuffer: Buffer): Promise<Buffer> {
  const skelAnim = decodeSkelAnimGraphicBuffer(task.asset, rawBuffer)

  if (task.variant !== 'illustration') {
    return (
      await renderSkelAnimPoseToPngBuffer(skelAnim, {
        preferredSequenceIndexes: task.preferredSequenceIndexes,
      })
    ).bytes
  }

  const character = skelAnim.characters[0]

  if (!character) {
    throw new Error('SkelAnim 中没有可用角色')
  }

  const sequences = character.sequences.map(summarizeSequence)
  const defaultSequence = resolveDefaultSequence(sequences, task.preferredSequenceIndexes)

  if (!defaultSequence?.bounds) {
    throw new Error('没有可渲染的 illustration sequence')
  }

  // renderer 只读 viewportBounds 的 minX/minY/maxX/maxY；AnimationBounds 缺少 width/height/visiblePieceCount，
  // 但 renderer 不读这些字段，as SkelAnimFrameBounds 是安全的。
  return (
    await renderSkelAnimPoseToPngBuffer(skelAnim, {
      sequenceIndex: defaultSequence.sequenceIndex,
      frameIndex: defaultSequence.firstRenderableFrameIndex ?? 0,
      viewportBounds: defaultSequence.bounds as SkelAnimFrameBounds,
      rasterScale: resolvePetIllustrationRasterScale(defaultSequence.bounds),
    })
  ).bytes
}

function copyOpaqueRegion(
  source: PNG,
  bounds: OpaqueBounds,
  target: PNG,
  offsetX: number,
  offsetY: number,
): void {
  for (let y = 0; y < bounds.height; y += 1) {
    for (let x = 0; x < bounds.width; x += 1) {
      const sourceIndex = ((bounds.top + y) * source.width + (bounds.left + x)) * 4
      const targetIndex = ((offsetY + y) * target.width + (offsetX + x)) * 4

      target.data[targetIndex] = source.data[sourceIndex] ?? 0
      target.data[targetIndex + 1] = source.data[sourceIndex + 1] ?? 0
      target.data[targetIndex + 2] = source.data[sourceIndex + 2] ?? 0
      target.data[targetIndex + 3] = source.data[sourceIndex + 3] ?? 0
    }
  }
}

function processIconPng(pngBuffer: Buffer): ProcessedPng {
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

function processIllustrationPng(pngBuffer: Buffer): ProcessedPng {
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

async function downloadRawAsset(task: { remoteUrl: string }): Promise<Buffer> {
  const controller = new AbortController()
  const timer = setTimeout(() => {
    controller.abort()
  }, FETCH_TIMEOUT_MS)

  try {
    const response = await fetch(task.remoteUrl, {
      cache: 'no-store',
      signal: controller.signal,
    })

    if (!response.ok) {
      throw new Error(`HTTP ${String(response.status)}`)
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
      throw new Error(`fetch=${fetchMessage} | curl=${curlMessage}`, { cause: curlError })
    }
  } finally {
    clearTimeout(timer)
  }
}

async function downloadPetAsset(task: PetAssetTask): Promise<DownloadedPetAsset> {
  try {
    const rawBuffer = await downloadRawAsset(task)
    const decodedPng =
      task.renderMode === 'skelanim'
        ? await renderPetSkelAnimPng(task, rawBuffer)
        : decodeGraphicBuffer(rawBuffer)
    const processed: ProcessedPng =
      task.variant === 'icon' ? processIconPng(decodedPng) : processIllustrationPng(decodedPng)

    await writeFile(task.outputFile, processed.pngBuffer)

    return {
      mode: 'downloaded',
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
      { cause: error },
    )
  }
}

async function downloadPetAnimation(task: PetAnimationTask): Promise<DownloadedPetAnimation> {
  try {
    const rawBuffer = await downloadRawAsset({ remoteUrl: task.asset.remoteUrl })
    const decoded = decodeSkelAnimGraphicBuffer(task.asset, rawBuffer)
    const character = decoded.characters[0]

    if (!character) {
      throw new Error('缺少可用角色数据')
    }

    const sequences = character.sequences.map(summarizeSequence)
    const defaultSequence = resolveDefaultSequence(sequences, task.preferredSequenceIndexes)

    if (!defaultSequence) {
      throw new Error('没有可播放的 sequence')
    }

    await writeFile(task.outputFile, rawBuffer)

    return {
      mode: 'downloaded',
      id: task.petId,
      petId: task.petId,
      name: task.name,
      sourceSlot: 'illustration',
      sourceGraphicId: task.asset.graphicId,
      sourceGraphic: task.asset.sourceGraphic,
      sourceVersion: task.asset.sourceVersion,
      fps: DEFAULT_FPS,
      defaultSequenceIndex: defaultSequence.sequenceIndex,
      defaultFrameIndex: defaultSequence.firstRenderableFrameIndex ?? 0,
      asset: {
        path: task.outputPath,
        bytes: rawBuffer.length,
        format: 'skelanim-zlib',
      },
      sequences,
    }
  } catch (error) {
    throw new Error(
      `解析 pet=${task.petId} animation 失败 (${task.asset.remoteUrl}): ${error instanceof Error ? error.message : String(error)}`,
      { cause: error },
    )
  }
}

function countAcquisitionKind(pets: readonly PetCatalogItem[], kind: PetAcquisitionKind): number {
  return pets.filter((pet) => pet.acquisition.kind === kind).length
}

function buildSyncCounts(pets: readonly PetCatalogItem[], animations: number): SyncPetsCatalogCounts {
  return {
    icons: pets.filter((pet) => Boolean(pet.icon)).length,
    illustrations: pets.filter((pet) => Boolean(pet.illustration)).length,
    gems: countAcquisitionKind(pets, 'gems'),
    premium: countAcquisitionKind(pets, 'premium'),
    patron: countAcquisitionKind(pets, 'patron'),
    unavailable: countAcquisitionKind(pets, 'not-yet-available'),
    unknown: countAcquisitionKind(pets, 'unknown'),
    animations,
  }
}

export async function syncPetsCatalog(
  options: SyncPetsCatalogOptions = {},
): Promise<SyncPetsCatalogResult> {
  if (options.input == null || options.input === '') {
    throw new Error('缺少 --input，无法根据 definitions 快照同步宠物目录')
  }

  const input = path.resolve(options.input)
  const outputDir = path.resolve(options.outputDir ?? DEFAULT_OUTPUT_DIR)
  const currentVersion = options.currentVersion ?? DEFAULT_CURRENT_VERSION
  const concurrency = Math.max(1, Number(options.concurrency ?? DEFAULT_CONCURRENCY))
  const rawDefinitions = (await readJson(input)) as GameDefinitions
  const localizedDefinitions = options.localizedInput != null && options.localizedInput !== ''
    ? ((await readJson(path.resolve(options.localizedInput))) as GameDefinitions)
    : rawDefinitions
  const updatedAt = getUpdatedAt(rawDefinitions)
  const petsCollectionFile = path.join(outputDir, 'pets.json')
  const animationsCollectionFile = path.join(outputDir, 'pet-animations.json')
  const existingPetsCollection = await readExistingCollection(petsCollectionFile)
  const existingAnimationsCollection = await readExistingCollection(animationsCollectionFile)
  if (
    shouldSkipResourceSync({
      existingUpdatedAt: existingPetsCollection?.updatedAt,
      nextUpdatedAt: updatedAt,
    }) &&
    shouldSkipResourceSync({
      existingUpdatedAt: existingAnimationsCollection?.updatedAt,
      nextUpdatedAt: updatedAt,
    })
  ) {
    const existingPets = (existingPetsCollection?.items ?? []) as PetCatalogItem[]
    const existingAnimations = (existingAnimationsCollection?.items ?? []) as PetAnimationItem[]
    return {
      outputDir,
      updatedAt,
      count: existingPets.length,
      assetCount: 0,
      counts: buildSyncCounts(existingPets, existingAnimations.length),
      skipped: true,
    }
  }
  const graphicMap = buildGraphicMap(rawDefinitions.graphic_defines)
  const assetBaseUrl = options.masterApiUrl ?? DEFAULT_MASTER_API_URL
  const localizedFamiliarsById = buildIdMap(localizedDefinitions.familiar_defines)
  const patronsById = buildIdMap(rawDefinitions.patron_defines)
  const localizedPatronsById = buildIdMap(localizedDefinitions.patron_defines)
  const premiumRefsByFamiliarId = buildPremiumRefsByFamiliarId(
    rawDefinitions.premium_item_defines,
    localizedDefinitions.premium_item_defines ?? [],
  )
  const patronRefsByFamiliarId = buildPatronRefsByFamiliarId(
    rawDefinitions.patron_shop_item_defines,
    localizedDefinitions.patron_shop_item_defines ?? [],
  )

  const iconDir = path.join(outputDir, 'pets', 'icons')
  const illustrationDir = path.join(outputDir, 'pets', 'illustrations')
  const animationDir = path.join(outputDir, PET_ANIMATION_DIR_NAME, 'illustrations')
  await mkdir(iconDir, { recursive: true })
  await mkdir(illustrationDir, { recursive: true })
  await mkdir(animationDir, { recursive: true })

  const pets: PetCatalogItem[] = []
  const tasks: PetAssetTask[] = []
  const animationTasks: PetAnimationTask[] = []
  const existingPetById = new Map<string, PetCatalogItem>(
    (existingPetsCollection?.items ?? []).map((item) => {
      const pet = item as PetCatalogItem
      return [pet.id, pet]
    }),
  )
  const existingAnimationByPetId = new Map<string, PetAnimationItem>(
    (existingAnimationsCollection?.items ?? []).map((item) => {
      const animation = item as PetAnimationItem
      return [animation.petId, animation]
    }),
  )
  const reusedAnimations: PetAnimationItem[] = []

  for (const definition of rawDefinitions.familiar_defines ?? []) {
    const petId = String(definition.id)
    const localizedDefinition = localizedFamiliarsById.get(petId) ?? definition
    const premiumRef = pickBestPremiumRef(definition, premiumRefsByFamiliarId.get(petId) ?? [])
    const patronRef = patronRefsByFamiliarId.get(petId) ?? null
    const sourceRecord = asRecord(definition.collections_source)
    const propertiesRecord = asRecord(definition.properties)
    const sourceType = toText(sourceRecord?.type)
    const isAvailable =
      sourceType !== 'not_yet_available' &&
      Boolean(definition.is_available ?? propertiesRecord?.is_available ?? false)
    const iconGraphicId = toNonZeroText(definition.graphic_id)
    const illustrationGraphicId = toNonZeroText(propertiesRecord?.xl_graphic_id)
    const iconGraphic = iconGraphicId != null && iconGraphicId !== '' ? (graphicMap.get(iconGraphicId) ?? null) : null
    const illustrationGraphic = illustrationGraphicId != null && illustrationGraphicId !== '' ? (graphicMap.get(illustrationGraphicId) ?? null) : null
    const iconAsset = iconGraphic ? buildPetGraphicAsset(iconGraphic, assetBaseUrl) : null
    const illustrationAsset = illustrationGraphic ? buildPetGraphicAsset(illustrationGraphic, assetBaseUrl) : null

    const pet: PetCatalogItem = {
      id: petId,
      name: normalizeLocalizedText(
        definition.name,
        localizedDefinition.name,
        `Pet ${petId}`,
      ) ?? { original: `Pet ${petId}`, display: `Pet ${petId}` },
      description: normalizeLocalizedText(
        definition.description,
        localizedDefinition.description,
        definition.description ?? definition.name ?? `Pet ${petId}`,
      ),
      acquisition: buildAcquisition(
        definition,
        premiumRef,
        patronRef,
        patronsById,
        localizedPatronsById,
      ),
      icon: null,
      illustration: null,
      iconSourceGraphic: iconAsset?.sourceGraphic ?? null,
      iconSourceVersion: iconAsset?.sourceVersion ?? null,
      illustrationSourceGraphic: illustrationAsset?.sourceGraphic ?? null,
      illustrationSourceVersion: illustrationAsset?.sourceVersion ?? null,
      isAvailable,
      iconGraphicId,
      illustrationGraphicId,
    }
    const existingPet = existingPetById.get(petId) ?? null

    const iconOutputFile = path.join(outputDir, 'pets', 'icons', `${petId}.png`)
    const iconOutputPath = `${currentVersion}/${PET_ICON_DIR_NAME}/${petId}.png`
    const illustrationOutputFile = path.join(outputDir, 'pets', 'illustrations', `${petId}.png`)
    const illustrationOutputPath = `${currentVersion}/${PET_ILLUSTRATION_DIR_NAME}/${petId}.png`
    const animationOutputFile = path.join(outputDir, PET_ANIMATION_DIR_NAME, 'illustrations', `${petId}.bin`)
    const animationOutputPath = buildPetAnimationAssetPath(currentVersion, petId)

    if (
      iconAsset != null && iconAsset.sourceGraphic !== '' &&
      // eslint-disable-next-line @typescript-eslint/prefer-optional-chain -- 保留 existingPet != null 类型守卫，以收窄类型供 canReusePetImage(existingPet.icon) 与 if 体 pet.icon 赋值使用；改 ?. 会破坏类型收窄
      existingPet != null &&
      existingPet.iconSourceGraphic === iconAsset.sourceGraphic &&
      (existingPet.iconSourceVersion ?? null) === (iconAsset.sourceVersion ?? null) &&
      canReusePetImage(existingPet.icon, iconOutputPath) &&
      (await fileExists(iconOutputFile))
    ) {
      pet.icon = existingPet.icon
    }

    if (!pet.icon && iconAsset?.sourceGraphic != null && iconAsset.sourceGraphic !== '') {
      tasks.push({
        petId,
        variant: 'icon',
        asset: iconAsset,
        renderMode: isSkelAnimGraphicDefinition(iconGraphic) ? 'skelanim' : 'decoded-png',
        preferredSequenceIndexes: resolvePreferredSequenceIndexes(iconGraphic),
        remoteUrl: iconAsset.remoteUrl,
        outputFile: iconOutputFile,
        outputPath: iconOutputPath,
      })
    }

    if (
      illustrationAsset != null && illustrationAsset.sourceGraphic !== '' &&
      // eslint-disable-next-line @typescript-eslint/prefer-optional-chain -- 保留 existingPet != null 类型守卫，以收窄类型供 canReusePetImage(existingPet.illustration) 与 if 体 pet.illustration 赋值使用
      existingPet != null &&
      existingPet.illustrationSourceGraphic === illustrationAsset.sourceGraphic &&
      (existingPet.illustrationSourceVersion ?? null) === (illustrationAsset.sourceVersion ?? null) &&
      canReusePetImage(existingPet.illustration, illustrationOutputPath) &&
      (await fileExists(illustrationOutputFile))
    ) {
      pet.illustration = existingPet.illustration
    }

    if (illustrationAsset?.sourceGraphic != null && illustrationAsset.sourceGraphic !== '' && !pet.illustration) {
      tasks.push({
        petId,
        variant: 'illustration',
        asset: illustrationAsset,
        renderMode: isSkelAnimGraphicDefinition(illustrationGraphic) ? 'skelanim' : 'decoded-png',
        preferredSequenceIndexes: resolvePreferredSequenceIndexes(illustrationGraphic),
        remoteUrl: illustrationAsset.remoteUrl,
        outputFile: illustrationOutputFile,
        outputPath: illustrationOutputPath,
      })
    }

    if (illustrationAsset?.sourceGraphic != null && illustrationAsset.sourceGraphic !== '' && isSkelAnimGraphicDefinition(illustrationGraphic)) {
      const animationTask: PetAnimationTask = {
        petId,
        name: pet.name,
        asset: illustrationAsset,
        preferredSequenceIndexes: resolvePreferredSequenceIndexes(illustrationGraphic),
        outputFile: animationOutputFile,
        outputPath: animationOutputPath,
      }
      const existingAnimation = existingAnimationByPetId.get(petId) ?? null

      if (canReusePetAnimation(existingAnimation, animationTask) && (await fileExists(animationOutputFile))) {
        reusedAnimations.push(existingAnimation)
      } else {
        animationTasks.push(animationTask)
      }
    }

    pets.push(pet)
  }

  const downloadedAssets = await runWithConcurrency(tasks, concurrency, downloadPetAsset)
  const downloadedAnimations = await runWithConcurrency(animationTasks, concurrency, downloadPetAnimation)
  const animations: (PetAnimationItem | DownloadedPetAnimation)[] = [
    ...reusedAnimations,
    ...downloadedAnimations,
  ]
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

  const sortedPets = [...pets].sort((left, right) => {
    const byName = compareLocalizedText(left.name, right.name)
    return byName !== 0 ? byName : Number(left.id) - Number(right.id)
  })
  const sortedAnimations = [...animations].sort((left, right) => {
    const byName = compareLocalizedText(left.name, right.name)
    return byName !== 0 ? byName : Number(left.petId) - Number(right.petId)
  })
  await removeUnexpectedFiles(iconDir, new Set(sortedPets.filter((pet) => pet.icon).map((pet) => `${pet.id}.png`)))
  await removeUnexpectedFiles(
    illustrationDir,
    new Set(sortedPets.filter((pet) => pet.illustration).map((pet) => `${pet.id}.png`)),
  )
  await removeUnexpectedFiles(animationDir, new Set(sortedAnimations.map((item) => `${item.petId}.bin`)))

  await writeJson(petsCollectionFile, {
    items: sortedPets,
    updatedAt,
  })
  await writeJson(animationsCollectionFile, {
    items: sortedAnimations,
    updatedAt,
  })

  return {
    outputDir,
    updatedAt,
    count: sortedPets.length,
    assetCount: downloadedAssets.length,
    counts: buildSyncCounts(sortedPets, sortedAnimations.length),
  }
}

function printUsage(): void {
  console.log(`用法：
  node scripts/sync-idle-champions-pets.ts --input <raw-json>

可选参数：
  --input <file>             官方原文 definitions 快照 JSON
  --localizedInput <file>    中文 definitions 快照 JSON；缺省时回退到 --input
  --outputDir <dir>          输出目录，默认 ${DEFAULT_OUTPUT_DIR}
  --currentVersion <name>    pets.json 中写入的版本目录，默认 ${DEFAULT_CURRENT_VERSION}
  --masterApiUrl <url>       远端 mobile_assets 基础地址，默认 ${DEFAULT_MASTER_API_URL}
  --concurrency <n>          并发下载数，默认 ${String(DEFAULT_CONCURRENCY)}
  --help                     显示帮助
`)
}

async function main(): Promise<void> {
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

  if (values.help === true) {
    printUsage()
    return
  }

  const result = await syncPetsCatalog(values)

  console.log('宠物目录同步完成：')
  console.log(`- pets: ${String(result.count)}`)
  console.log(`- local assets: ${String(result.assetCount)}`)
  console.log(`- icons: ${String(result.counts.icons)}`)
  console.log(`- illustrations: ${String(result.counts.illustrations)}`)
  console.log(`- animations: ${String(result.counts.animations)}`)
  console.log(`- gems: ${String(result.counts.gems)}`)
  console.log(`- premium: ${String(result.counts.premium)}`)
  console.log(`- patron: ${String(result.counts.patron)}`)
  console.log(`- unavailable: ${String(result.counts.unavailable)}`)
  console.log(`- unknown: ${String(result.counts.unknown)}`)
}

// eslint-disable-next-line sonarjs/no-reference-error -- process 是 Node.js 运行时全局，@types/node 已声明，sonarjs 静态分析未识别
const argv1 = process.argv[1]
if (argv1 !== undefined && import.meta.url === pathToFileURL(argv1).href) {
  main().catch((error: unknown) => {
    console.error(`同步宠物目录失败：${error instanceof Error ? error.message : String(error)}`)
    process.exitCode = 1
  })
}
