import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { type AppLocale, useI18n } from '../app/i18n'
import { ChampionAvatar } from '../components/ChampionAvatar'
import { SurfaceCard } from '../components/SurfaceCard'
import { loadChampionDetail, resolveDataUrl } from '../data/client'
import {
  getLocalizedTextPair,
  getPrimaryLocalizedText,
  getRoleLabel,
  getSecondaryLocalizedText,
} from '../domain/localizedText'
import type {
  ChampionAttackDetail,
  ChampionDetail,
  ChampionFeatDetail,
  ChampionRawEntry,
  ChampionRawSnapshotPair,
  ChampionSkinDetail,
  ChampionUpgradeDetail,
  JsonValue,
} from '../domain/types'

const DETAIL_SECTION_IDS = ['overview', 'character-sheet', 'combat', 'upgrades', 'feats', 'skins', 'raw'] as const
const DETAIL_HASH_PREFIX = 'section-'

type DetailSectionId = (typeof DETAIL_SECTION_IDS)[number]
type DetailSectionProgressState = 'completed' | 'active' | 'upcoming'

type ChampionDetailState =
  | { status: 'idle' }
  | { status: 'ready'; detail: ChampionDetail }
  | { status: 'not-found'; championId: string }
  | { status: 'error'; championId: string; message: string }

interface DetailFieldProps {
  label: string
  value: string
  hint?: string | null
}

interface JsonPanelProps {
  title: string
  value: JsonValue
}

interface AttackPanelProps {
  title: string
  attack: ChampionAttackDetail | null
  locale: AppLocale
}

interface UpgradeCardProps {
  upgrade: ChampionUpgradeDetail
  locale: AppLocale
}

interface NumericUpgradeRowProps {
  upgrade: ChampionUpgradeDetail
  locale: AppLocale
}

interface FeatCardProps {
  feat: ChampionFeatDetail
  locale: AppLocale
}

interface SkinCardProps {
  skin: ChampionSkinDetail
  locale: AppLocale
  onPreview: (skinId: string) => void
}

interface RawPairDisclosureProps {
  title: string
  pair: ChampionRawSnapshotPair
}

interface RawEntriesDisclosureProps {
  title: string
  entries: ChampionRawEntry[]
}

interface SkinArtworkIds {
  baseGraphicId: string | null
  largeGraphicId: string | null
  xlGraphicId: string | null
  portraitGraphicId: string | null
}

function isJsonObject(value: JsonValue): value is Record<string, JsonValue> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function formatDigitString(value: string | null, locale: AppLocale): string {
  if (!value) {
    return locale === 'zh-CN' ? '暂无' : 'Not available'
  }

  if (/^-?\d+$/.test(value)) {
    return BigInt(value).toLocaleString(locale)
  }

  return value
}

function formatNumber(value: number | null, locale: AppLocale): string {
  if (value === null || Number.isNaN(value)) {
    return locale === 'zh-CN' ? '暂无' : 'Not available'
  }

  return new Intl.NumberFormat(locale).format(value)
}

function formatBoolean(value: boolean, locale: AppLocale): string {
  return value ? (locale === 'zh-CN' ? '是' : 'Yes') : locale === 'zh-CN' ? '否' : 'No'
}

function formatTimestamp(value: number | null, locale: AppLocale): string {
  if (value === null || value <= 0) {
    return locale === 'zh-CN' ? '未安排' : 'Not scheduled'
  }

  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value * 1000))
}

function formatNullableText(value: string | null, locale: AppLocale): string {
  return value?.trim() || (locale === 'zh-CN' ? '暂无' : 'Not available')
}

function stringifyJson(value: JsonValue): string {
  return JSON.stringify(value, null, 2)
}

function summarizeJson(value: JsonValue, locale: AppLocale): string {
  if (Array.isArray(value)) {
    return `${value.length} ${locale === 'zh-CN' ? '项' : 'items'}`
  }

  if (isJsonObject(value)) {
    return `${Object.keys(value).length} ${locale === 'zh-CN' ? '个字段' : 'fields'}`
  }

  if (value === null) {
    return locale === 'zh-CN' ? '空值' : 'Empty'
  }

  return String(value)
}

function getEffectDescription(upgrade: ChampionUpgradeDetail, locale: AppLocale): string | null {
  const snapshot =
    locale === 'zh-CN' ? upgrade.effectDefinition?.snapshots.display : upgrade.effectDefinition?.snapshots.original

  if (!snapshot || !isJsonObject(snapshot)) {
    return null
  }

  const description = snapshot.description

  if (isJsonObject(description) && typeof description.desc === 'string') {
    return description.desc
  }

  return null
}

function buildUpgradeTitle(upgrade: ChampionUpgradeDetail, locale: AppLocale): string {
  if (upgrade.name) {
    return getLocalizedTextPair(upgrade.name, locale)
  }

  if (upgrade.upgradeType) {
    return locale === 'zh-CN' ? `未命名 ${upgrade.upgradeType}` : `Unnamed ${upgrade.upgradeType}`
  }

  return locale === 'zh-CN' ? '数值升级' : 'Stat milestone'
}

function buildRarityLabel(value: string | null, locale: AppLocale): string {
  if (!value) {
    return locale === 'zh-CN' ? '未标注' : 'Unlabeled'
  }

  return locale === 'zh-CN' ? `稀有度 ${value}` : `Rarity ${value}`
}

function readGraphicId(value: JsonValue, key: string): string | null {
  if (!isJsonObject(value)) {
    return null
  }

  const candidate = value[key]

  if (candidate === null || candidate === undefined) {
    return null
  }

  const normalized = String(candidate).trim()
  return normalized.length > 0 ? normalized : null
}

function getSkinArtworkIds(skin: ChampionSkinDetail): SkinArtworkIds {
  return {
    baseGraphicId: readGraphicId(skin.details, 'base_graphic_id'),
    largeGraphicId: readGraphicId(skin.details, 'large_graphic_id'),
    xlGraphicId: readGraphicId(skin.details, 'xl_graphic_id'),
    portraitGraphicId: readGraphicId(skin.details, 'portrait_graphic_id'),
  }
}

function buildSkinPreviewAlt(skin: ChampionSkinDetail, locale: AppLocale): string {
  const primaryName = getPrimaryLocalizedText(skin.name, locale)
  return locale === 'zh-CN' ? `${primaryName}皮肤预览` : `${primaryName} skin preview`
}

function buildSkinPortraitPreviewUrl(portraitGraphicId: string | null): string | null {
  if (!portraitGraphicId) {
    return null
  }

  // The reference viewer exposes decoded portrait PNGs, which keeps this preview usable
  // until skin illustration assets are versioned locally like champion portraits.
  return `https://idle.kleho.ru/assets/g/${encodeURIComponent(portraitGraphicId)}.png`
}

function resolveSkinPreviewUrl(
  skin: ChampionSkinDetail,
  champion: ChampionDetail['summary'],
  useFallbackPortrait = false,
): string | null {
  if (!useFallbackPortrait) {
    const portraitPreviewUrl = buildSkinPortraitPreviewUrl(getSkinArtworkIds(skin).portraitGraphicId)

    if (portraitPreviewUrl) {
      return portraitPreviewUrl
    }
  }

  return champion.portrait?.path ? resolveDataUrl(champion.portrait.path) : null
}

function DetailField({ label, value, hint }: DetailFieldProps) {
  return (
    <article className="detail-field">
      <span className="detail-field__label">{label}</span>
      <strong className="detail-field__value">{value}</strong>
      {hint ? <span className="detail-field__hint">{hint}</span> : null}
    </article>
  )
}

function JsonPanel({ title, value }: JsonPanelProps) {
  return (
    <article className="detail-json-panel">
      <h3 className="detail-json-panel__title">{title}</h3>
      <pre className="detail-json">{stringifyJson(value)}</pre>
    </article>
  )
}

function AttackPanel({ title, attack, locale }: AttackPanelProps) {
  if (!attack) {
    return (
      <article className="detail-subcard detail-subcard--empty">
        <h3 className="detail-subcard__title">{title}</h3>
        <p className="supporting-text">{locale === 'zh-CN' ? '当前没有可展示的攻击定义。' : 'No attack definition is available here.'}</p>
      </article>
    )
  }

  return (
    <article className="detail-subcard attack-card">
      <div className="attack-card__header">
        <div>
          <p className="detail-subcard__eyebrow">{title}</p>
          <h3 className="detail-subcard__title">{getLocalizedTextPair(attack.name, locale)}</h3>
        </div>
        <div className="detail-badge-row">
          <span className="detail-badge">{locale === 'zh-CN' ? `冷却 ${formatNumber(attack.cooldown, locale)} 秒` : `${formatNumber(attack.cooldown, locale)}s cooldown`}</span>
          <span className="detail-badge">{locale === 'zh-CN' ? `目标 ${formatNumber(attack.numTargets, locale)}` : `${formatNumber(attack.numTargets, locale)} targets`}</span>
        </div>
      </div>

      {attack.description ? <p className="detail-subcard__body">{getLocalizedTextPair(attack.description, locale)}</p> : null}
      {attack.longDescription ? <p className="supporting-text">{getLocalizedTextPair(attack.longDescription, locale)}</p> : null}

      <div className="detail-field-grid detail-field-grid--compact">
        <DetailField label={locale === 'zh-CN' ? 'AOE 半径' : 'AOE radius'} value={formatNumber(attack.aoeRadius, locale)} />
        <DetailField label={locale === 'zh-CN' ? '伤害倍率' : 'Damage modifier'} value={formatNullableText(attack.damageModifier, locale)} />
        <DetailField label={locale === 'zh-CN' ? '目标规则' : 'Target rule'} value={formatNullableText(attack.target, locale)} />
        <DetailField label={locale === 'zh-CN' ? 'Graphic ID' : 'Graphic ID'} value={formatNullableText(attack.graphicId, locale)} />
      </div>

      {attack.damageTypes.length > 0 ? (
        <div className="tag-row">
          {attack.damageTypes.map((item) => (
            <span key={item} className="tag-pill">
              {item}
            </span>
          ))}
        </div>
      ) : null}

      {attack.tags.length > 0 ? (
        <div className="tag-row">
          {attack.tags.map((item) => (
            <span key={item} className="tag-pill tag-pill--muted">
              {item}
            </span>
          ))}
        </div>
      ) : null}
    </article>
  )
}

function UpgradeCard({ upgrade, locale }: UpgradeCardProps) {
  const effectDescription = getEffectDescription(upgrade, locale)

  return (
    <article className="detail-subcard upgrade-card">
      <div className="detail-subcard__header">
        <div>
          <p className="detail-subcard__eyebrow">
            {locale === 'zh-CN' ? `等级 ${formatNumber(upgrade.requiredLevel, locale)}` : `Level ${formatNumber(upgrade.requiredLevel, locale)}`}
          </p>
          <h3 className="detail-subcard__title">{buildUpgradeTitle(upgrade, locale)}</h3>
        </div>
        <div className="detail-badge-row">
          {upgrade.upgradeType ? <span className="detail-badge">{upgrade.upgradeType}</span> : null}
          {upgrade.requiredUpgradeId ? <span className="detail-badge">{locale === 'zh-CN' ? `前置 #${upgrade.requiredUpgradeId}` : `Req #${upgrade.requiredUpgradeId}`}</span> : null}
          {upgrade.specializationGraphicId ? <span className="detail-badge">{locale === 'zh-CN' ? `专精图 ${upgrade.specializationGraphicId}` : `Spec art ${upgrade.specializationGraphicId}`}</span> : null}
        </div>
      </div>

      {upgrade.specializationName ? <p className="detail-subcard__body">{getLocalizedTextPair(upgrade.specializationName, locale)}</p> : null}
      {upgrade.specializationDescription ? <p className="supporting-text">{getLocalizedTextPair(upgrade.specializationDescription, locale)}</p> : null}
      {upgrade.tipText ? <p className="supporting-text">{getLocalizedTextPair(upgrade.tipText, locale)}</p> : null}
      {effectDescription ? <p className="supporting-text">{effectDescription}</p> : null}

      <div className="detail-field-grid detail-field-grid--compact">
        <DetailField label={locale === 'zh-CN' ? '静态 DPS 倍率' : 'Static DPS mult'} value={formatNullableText(upgrade.staticDpsMult, locale)} />
        <DetailField label={locale === 'zh-CN' ? 'Effect 引用' : 'Effect ref'} value={formatNullableText(upgrade.effectReference, locale)} />
        <DetailField label={locale === 'zh-CN' ? '默认启用' : 'Default enabled'} value={formatBoolean(upgrade.defaultEnabled, locale)} />
      </div>
    </article>
  )
}

function NumericUpgradeRow({ upgrade, locale }: NumericUpgradeRowProps) {
  return (
    <div className="upgrade-ledger__row">
      <span>{locale === 'zh-CN' ? `等级 ${formatNumber(upgrade.requiredLevel, locale)}` : `Level ${formatNumber(upgrade.requiredLevel, locale)}`}</span>
      <span>{formatNullableText(upgrade.staticDpsMult, locale)}</span>
      <span>{formatNullableText(upgrade.effectReference, locale)}</span>
      <span>{upgrade.requiredUpgradeId ? (locale === 'zh-CN' ? `前置 #${upgrade.requiredUpgradeId}` : `Req #${upgrade.requiredUpgradeId}`) : locale === 'zh-CN' ? '无前置' : 'No prerequisite'}</span>
    </div>
  )
}

function FeatCard({ feat, locale }: FeatCardProps) {
  return (
    <article className="detail-subcard feat-card">
      <div className="detail-subcard__header">
        <div>
          <p className="detail-subcard__eyebrow">{locale === 'zh-CN' ? `顺序 ${formatNumber(feat.order, locale)}` : `Order ${formatNumber(feat.order, locale)}`}</p>
          <h3 className="detail-subcard__title">{getLocalizedTextPair(feat.name, locale)}</h3>
        </div>
        <span className="detail-badge">{buildRarityLabel(feat.rarity, locale)}</span>
      </div>

      {feat.description ? <p className="detail-subcard__body">{getLocalizedTextPair(feat.description, locale)}</p> : null}

      <div className="detail-inline-grid">
        <JsonPanel title={locale === 'zh-CN' ? 'Effects' : 'Effects'} value={feat.effects} />
        <JsonPanel title={locale === 'zh-CN' ? 'Sources' : 'Sources'} value={feat.sources} />
        <JsonPanel title={locale === 'zh-CN' ? 'Properties' : 'Properties'} value={feat.properties} />
        <JsonPanel title={locale === 'zh-CN' ? 'Collection Source' : 'Collection Source'} value={feat.collectionsSource} />
      </div>
    </article>
  )
}

function SkinCard({ skin, locale, onPreview }: SkinCardProps) {
  const artworkIds = getSkinArtworkIds(skin)

  return (
    <article className="detail-subcard skin-card">
      <div className="detail-subcard__header">
        <div>
          <p className="detail-subcard__eyebrow">{buildRarityLabel(skin.rarity, locale)}</p>
          <h3 className="detail-subcard__title">{getLocalizedTextPair(skin.name, locale)}</h3>
        </div>
        <button
          type="button"
          className="action-button action-button--ghost action-button--compact"
          aria-label={
            locale === 'zh-CN'
              ? `查看立绘：${getPrimaryLocalizedText(skin.name, locale)}`
              : `Preview artwork: ${getPrimaryLocalizedText(skin.name, locale)}`
          }
          onClick={() => onPreview(skin.id)}
        >
          {locale === 'zh-CN' ? '查看立绘' : 'Preview'}
        </button>
      </div>

      <div className="detail-field-grid detail-field-grid--compact">
        <DetailField label={locale === 'zh-CN' ? 'Base Graphic ID' : 'Base graphic ID'} value={formatNullableText(artworkIds.baseGraphicId, locale)} />
        <DetailField label={locale === 'zh-CN' ? 'Large Graphic ID' : 'Large graphic ID'} value={formatNullableText(artworkIds.largeGraphicId, locale)} />
        <DetailField label={locale === 'zh-CN' ? 'XL Graphic ID' : 'XL graphic ID'} value={formatNullableText(artworkIds.xlGraphicId, locale)} />
        <DetailField label={locale === 'zh-CN' ? 'Portrait Graphic ID' : 'Portrait graphic ID'} value={formatNullableText(artworkIds.portraitGraphicId, locale)} />
      </div>

      <div className="detail-inline-grid">
        <JsonPanel title={locale === 'zh-CN' ? 'Cost' : 'Cost'} value={skin.cost} />
        <JsonPanel title={locale === 'zh-CN' ? 'Details' : 'Details'} value={skin.details} />
        <JsonPanel title={locale === 'zh-CN' ? 'Source' : 'Source'} value={skin.collectionsSource} />
        <JsonPanel title={locale === 'zh-CN' ? 'Properties' : 'Properties'} value={skin.properties} />
        {skin.availabilities ? <JsonPanel title={locale === 'zh-CN' ? 'Availabilities' : 'Availabilities'} value={skin.availabilities} /> : null}
      </div>
    </article>
  )
}

function RawPairDisclosure({ title, pair }: RawPairDisclosureProps) {
  return (
    <details className="raw-disclosure">
      <summary className="raw-disclosure__summary">{title}</summary>
      <div className="raw-disclosure__body raw-grid">
        <article className="detail-json-panel">
          <h3 className="detail-json-panel__title">Source</h3>
          <pre className="detail-json">{stringifyJson(pair.original)}</pre>
        </article>
        <article className="detail-json-panel">
          <h3 className="detail-json-panel__title">Localized</h3>
          <pre className="detail-json">{stringifyJson(pair.display)}</pre>
        </article>
      </div>
    </details>
  )
}

function RawEntriesDisclosure({ title, entries }: RawEntriesDisclosureProps) {
  return (
    <details className="raw-disclosure">
      <summary className="raw-disclosure__summary">{title}</summary>
      <div className="raw-disclosure__stack">
        {entries.map((entry) => (
          <details key={entry.id} className="raw-entry">
            <summary className="raw-entry__summary">#{entry.id}</summary>
            <div className="raw-grid">
              <article className="detail-json-panel">
                <h3 className="detail-json-panel__title">Source</h3>
                <pre className="detail-json">{stringifyJson(entry.snapshots.original)}</pre>
              </article>
              <article className="detail-json-panel">
                <h3 className="detail-json-panel__title">Localized</h3>
                <pre className="detail-json">{stringifyJson(entry.snapshots.display)}</pre>
              </article>
            </div>
          </details>
        ))}
      </div>
    </details>
  )
}

function isDetailSectionId(value: string): value is DetailSectionId {
  return DETAIL_SECTION_IDS.includes(value as DetailSectionId)
}

function resolveSectionIdFromHashValue(hashValue: string): DetailSectionId | null {
  const normalizedHash = hashValue.startsWith('#') ? hashValue.slice(1) : hashValue
  const normalizedSectionId = normalizedHash.startsWith(DETAIL_HASH_PREFIX)
    ? normalizedHash.slice(DETAIL_HASH_PREFIX.length)
    : normalizedHash

  return isDetailSectionId(normalizedSectionId) ? normalizedSectionId : null
}

function resolveSectionIdFromBrowserHash(hash: string): DetailSectionId | null {
  const normalizedHash = hash.startsWith('#') ? hash.slice(1) : hash
  const lastHashIndex = normalizedHash.lastIndexOf('#')

  if (lastHashIndex === -1) {
    return resolveSectionIdFromHashValue(normalizedHash)
  }

  return resolveSectionIdFromHashValue(normalizedHash.slice(lastHashIndex + 1))
}

function buildSectionHash(pathname: string, search: string, sectionId: DetailSectionId): string {
  return `#${pathname}${search}#${DETAIL_HASH_PREFIX}${sectionId}`
}

function resolveActiveSectionId(): DetailSectionId {
  const activationOffset = 196
  let activeSectionId: DetailSectionId = DETAIL_SECTION_IDS[0]

  for (const sectionId of DETAIL_SECTION_IDS) {
    const element = document.getElementById(sectionId)

    if (!element) {
      continue
    }

    if (element.getBoundingClientRect().top <= activationOffset) {
      activeSectionId = sectionId
    } else {
      break
    }
  }

  return activeSectionId
}

export function ChampionDetailPage() {
  const { championId } = useParams<{ championId: string }>()
  const location = useLocation()
  const { locale, t } = useI18n()
  const [state, setState] = useState<ChampionDetailState>({ status: 'idle' })
  const [activeSectionId, setActiveSectionId] = useState<DetailSectionId>(DETAIL_SECTION_IDS[0])
  const pendingHashSectionIdRef = useRef<DetailSectionId | null>(null)
  const handledSectionHashRef = useRef<string | null>(null)
  const [artworkDialogChampionId, setArtworkDialogChampionId] = useState<string | null>(null)
  const [selectedSkinId, setSelectedSkinId] = useState<string | null>(null)
  const [failedSkinPreviewIds, setFailedSkinPreviewIds] = useState<Record<string, boolean>>({})
  const isMissingChampionId = !championId

  useEffect(() => {
    let disposed = false

    if (!championId) {
      return undefined
    }

    pendingHashSectionIdRef.current = null
    handledSectionHashRef.current = null

    loadChampionDetail(championId)
      .then((detail) => {
        if (disposed) {
          return
        }

        setState({ status: 'ready', detail })
      })
      .catch((error: unknown) => {
        if (disposed) {
          return
        }

        if (error instanceof Error && error.message === 'HTTP 404') {
          setState({ status: 'not-found', championId })
          return
        }

        setState({
          status: 'error',
          championId,
          message: error instanceof Error ? error.message : '',
        })
      })

    return () => {
      disposed = true
    }
  }, [championId])

  const detail =
    state.status === 'ready' && state.detail.summary.id === championId ? state.detail : null
  const isArtworkDialogOpen = detail ? artworkDialogChampionId === detail.summary.id : false
  const selectedSkin = useMemo(() => {
    if (!detail || detail.skins.length === 0) {
      return null
    }

    return detail.skins.find((skin) => skin.id === selectedSkinId) ?? detail.skins[0]
  }, [detail, selectedSkinId])
  const isLoading =
    !isMissingChampionId &&
    (state.status === 'idle' ||
      (state.status === 'ready' && state.detail.summary.id !== championId) ||
      (state.status === 'not-found' && state.championId !== championId) ||
      (state.status === 'error' && state.championId !== championId))
  const spotlightUpgrades = useMemo(() => {
    if (!detail) {
      return []
    }

    return detail.upgrades.filter(
      (upgrade) =>
        Boolean(upgrade.name) ||
        Boolean(upgrade.upgradeType) ||
        Boolean(upgrade.specializationName) ||
        Boolean(upgrade.specializationDescription) ||
        Boolean(upgrade.tipText) ||
        Boolean(upgrade.effectDefinition),
    )
  }, [detail])
  const ledgerUpgrades = useMemo(() => {
    if (!detail) {
      return []
    }

    return detail.upgrades.filter(
      (upgrade) =>
        !upgrade.name &&
        !upgrade.upgradeType &&
        !upgrade.specializationName &&
        !upgrade.specializationDescription &&
        !upgrade.tipText &&
        !upgrade.effectDefinition,
    )
  }, [detail])
  const sectionLinks: Array<{ id: DetailSectionId; label: string }> = [
    { id: 'overview', label: t({ zh: '概览', en: 'Overview' }) },
    { id: 'character-sheet', label: t({ zh: '角色卡', en: 'Character sheet' }) },
    { id: 'combat', label: t({ zh: '战斗', en: 'Combat' }) },
    { id: 'upgrades', label: t({ zh: '升级', en: 'Upgrades' }) },
    { id: 'feats', label: t({ zh: '天赋', en: 'Feats' }) },
    { id: 'skins', label: t({ zh: '皮肤', en: 'Skins' }) },
    { id: 'raw', label: t({ zh: '原始字段', en: 'Raw fields' }) },
  ]
  const activeSectionIndex = Math.max(
    sectionLinks.findIndex((section) => section.id === activeSectionId),
    0,
  )
  const activeSectionLabel = sectionLinks[activeSectionIndex]?.label ?? sectionLinks[0].label
  const sectionProgressValue = `${((activeSectionIndex + 1) / sectionLinks.length) * 100}%`
  const getSectionProgressState = (index: number): DetailSectionProgressState => {
    if (index < activeSectionIndex) {
      return 'completed'
    }

    if (index === activeSectionIndex) {
      return 'active'
    }

    return 'upcoming'
  }
  const getSectionProgressText = (state: DetailSectionProgressState): string => {
    if (state === 'completed') {
      return t({ zh: '已读', en: 'Seen' })
    }

    if (state === 'active') {
      return t({ zh: '当前', en: 'Current' })
    }

    return t({ zh: '未读', en: 'Ahead' })
  }
  const hashSectionId =
    typeof window === 'undefined'
      ? resolveSectionIdFromHashValue(location.hash)
      : resolveSectionIdFromBrowserHash(window.location.hash) ?? resolveSectionIdFromHashValue(location.hash)
  const selectedSkinArtworkIds = selectedSkin ? getSkinArtworkIds(selectedSkin) : null
  const selectedSkinPreviewKey = detail && selectedSkin ? `${detail.summary.id}:${selectedSkin.id}` : null
  const selectedSkinPreviewUrl =
    detail && selectedSkin
      ? resolveSkinPreviewUrl(
          selectedSkin,
          detail.summary,
          Boolean(selectedSkinPreviewKey && failedSkinPreviewIds[selectedSkinPreviewKey]),
        )
      : null

  const openArtworkDialog = (skinId?: string) => {
    if (!detail || detail.skins.length === 0) {
      return
    }

    const nextSkinId = skinId && detail.skins.some((skin) => skin.id === skinId) ? skinId : detail.skins[0]?.id ?? null

    setSelectedSkinId(nextSkinId)
    setArtworkDialogChampionId(detail.summary.id)
  }

  const closeArtworkDialog = () => {
    setArtworkDialogChampionId(null)
    setSelectedSkinId(null)
  }

  useEffect(() => {
    if (!isArtworkDialogOpen || typeof window === 'undefined') {
      return undefined
    }

    const previousOverflow = document.body.style.overflow

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeArtworkDialog()
      }
    }

    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isArtworkDialogOpen])

  useEffect(() => {
    if (!detail || typeof window === 'undefined') {
      return undefined
    }

    const updateActiveSection = () => {
      const nextSectionId = resolveActiveSectionId()

      if (pendingHashSectionIdRef.current) {
        if (nextSectionId === pendingHashSectionIdRef.current) {
          pendingHashSectionIdRef.current = null
          setActiveSectionId(nextSectionId)
        }

        return
      }

      setActiveSectionId(nextSectionId)
    }

    updateActiveSection()
    window.addEventListener('scroll', updateActiveSection, { passive: true })
    window.addEventListener('resize', updateActiveSection)

    return () => {
      window.removeEventListener('scroll', updateActiveSection)
      window.removeEventListener('resize', updateActiveSection)
    }
  }, [detail])

  useEffect(() => {
    if (!detail || !hashSectionId || typeof window === 'undefined') {
      return
    }

    const browserHash = window.location.hash

    if (handledSectionHashRef.current === browserHash) {
      return
    }

    handledSectionHashRef.current = browserHash
    pendingHashSectionIdRef.current = hashSectionId

    const frameId = window.requestAnimationFrame(() => {
      setActiveSectionId(hashSectionId)
      document.getElementById(hashSectionId)?.scrollIntoView({ behavior: 'auto', block: 'start' })
    })

    return () => {
      window.cancelAnimationFrame(frameId)
    }
  }, [detail, hashSectionId])

  useEffect(() => {
    if (!detail || typeof window === 'undefined') {
      return
    }

    if (pendingHashSectionIdRef.current && pendingHashSectionIdRef.current !== activeSectionId) {
      return
    }

    const nextHash = buildSectionHash(location.pathname, location.search, activeSectionId)
    handledSectionHashRef.current = nextHash

    if (window.location.hash === nextHash) {
      return
    }

    window.history.replaceState(
      window.history.state,
      '',
      `${window.location.pathname}${window.location.search}${nextHash}`,
    )
  }, [activeSectionId, detail, location.pathname, location.search])

  const scrollToSection = (id: string) => {
    if (isDetailSectionId(id)) {
      pendingHashSectionIdRef.current = id
      setActiveSectionId(id)

      if (typeof window !== 'undefined') {
        const nextHash = buildSectionHash(location.pathname, location.search, id)
        handledSectionHashRef.current = nextHash

        if (window.location.hash !== nextHash) {
          window.history.replaceState(
            window.history.state,
            '',
            `${window.location.pathname}${window.location.search}${nextHash}`,
          )
        }
      }
    }

    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="page-stack champion-detail-page">
      <div className="page-backlink-row">
        <Link
          className="page-backlink"
          to={{
            pathname: '/champions',
            search: location.search,
          }}
        >
          {t({ zh: '← 返回英雄筛选', en: '← Back to champions' })}
        </Link>
      </div>

      {isLoading ? (
        <SurfaceCard
          eyebrow={t({ zh: '英雄详情', en: 'Champion detail' })}
          title={t({ zh: '正在整理英雄卷宗…', en: 'Building the champion dossier…' })}
          description={t({
            zh: '当前会加载结构化详情与原始 definitions 片段。',
            en: 'This loads both the structured profile and the raw definitions slices.',
          })}
        >
          <div className="status-banner status-banner--info">{t({ zh: '正在读取详情数据…', en: 'Loading detail data…' })}</div>
        </SurfaceCard>
      ) : null}

      {isMissingChampionId || (state.status === 'not-found' && state.championId === championId) ? (
        <SurfaceCard
          eyebrow={t({ zh: '英雄详情', en: 'Champion detail' })}
          title={t({ zh: '没有找到这个英雄', en: 'Champion not found' })}
          description={t({
            zh: '可能是链接里的英雄 ID 不存在，或当前静态数据版本还没有这份详情文件。',
            en: 'The champion id may be invalid, or this data version does not have a detail file yet.',
          })}
        >
          <div className="status-banner status-banner--info">
            {t({ zh: '你可以返回筛选页重新进入，或检查当前数据版本是否已重新生成。', en: 'Return to the champions page or regenerate the current data version.' })}
          </div>
        </SurfaceCard>
      ) : null}

      {state.status === 'error' && state.championId === championId ? (
        <SurfaceCard
          eyebrow={t({ zh: '英雄详情', en: 'Champion detail' })}
          title={t({ zh: '详情数据读取失败', en: 'Detail data failed to load' })}
          description={t({
            zh: '可能是静态文件缺失，也可能是当前数据合同和页面实现不一致。',
            en: 'The static file may be missing, or the data contract may be out of sync with the page.',
          })}
        >
          <div className="status-banner status-banner--error">
            {state.message || t({ zh: '未知错误', en: 'Unknown error' })}
          </div>
        </SurfaceCard>
      ) : null}

      {detail ? (
        <>
          <section className="champion-dossier">
            <div className="champion-dossier__grid">
              <div className="champion-dossier__identity">
                <div className="champion-dossier__avatar-stage">
                  <ChampionAvatar champion={detail.summary} locale={locale} className="champion-avatar--dossier" loading="eager" />
                  {detail.skins.length > 0 ? (
                    <button
                      type="button"
                      className="champion-dossier__artwork-button"
                      aria-label={t({ zh: '打开皮肤立绘预览', en: 'Open skin artwork preview' })}
                      onClick={() => openArtworkDialog()}
                    >
                      <span aria-hidden="true" className="champion-dossier__artwork-icon">
                        ◎
                      </span>
                      <span>{t({ zh: '看皮肤立绘', en: 'View skins' })}</span>
                    </button>
                  ) : null}
                </div>
                <div className="champion-dossier__copy">
                  <p className="champion-dossier__eyebrow">
                    {locale === 'zh-CN' ? `${detail.summary.seat} 号位 · 英雄 #${detail.summary.id}` : `Seat ${detail.summary.seat} · Champion #${detail.summary.id}`}
                  </p>
                  <h2 className="champion-dossier__title">{getPrimaryLocalizedText(detail.summary.name, locale)}</h2>
                  {getSecondaryLocalizedText(detail.summary.name, locale) ? (
                    <p className="champion-dossier__secondary">{getSecondaryLocalizedText(detail.summary.name, locale)}</p>
                  ) : null}
                  <p className="champion-dossier__summary">
                    {t({
                      zh: '这个页面把结构化资料、成长轨道和原始 definitions 片段放在同一条浏览链路里，适合边查边做阵型判断。',
                      en: 'This page keeps the structured profile, progression track, and raw definitions slices in one browsing flow so you can inspect and decide quickly.',
                    })}
                  </p>

                  <div className="tag-row">
                    {detail.summary.roles.map((role) => (
                      <span key={role} className="tag-pill">
                        {getRoleLabel(role, locale)}
                      </span>
                    ))}
                  </div>

                  <p className="supporting-text champion-dossier__line">
                    {t({ zh: '联动队伍', en: 'Affiliations' })}：
                    {detail.summary.affiliations.length > 0
                      ? detail.summary.affiliations.map((item) => getLocalizedTextPair(item, locale)).join(' / ')
                      : t({ zh: '暂无', en: 'None yet' })}
                  </p>

                  <div className="tag-row">
                    {detail.summary.tags.map((tag) => (
                      <span key={tag} className="tag-pill tag-pill--muted">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="champion-dossier__stats">
                <article className="dossier-stat">
                  <span className="dossier-stat__label">{t({ zh: '升级条目', en: 'Upgrades' })}</span>
                  <strong className="dossier-stat__value">{detail.upgrades.length}</strong>
                </article>
                <article className="dossier-stat">
                  <span className="dossier-stat__label">{t({ zh: '天赋条目', en: 'Feats' })}</span>
                  <strong className="dossier-stat__value">{detail.feats.length}</strong>
                </article>
                <article className="dossier-stat">
                  <span className="dossier-stat__label">{t({ zh: '皮肤条目', en: 'Skins' })}</span>
                  <strong className="dossier-stat__value">{detail.skins.length}</strong>
                </article>
                <article className="dossier-stat">
                  <span className="dossier-stat__label">{t({ zh: '详情更新', en: 'Updated' })}</span>
                  <strong className="dossier-stat__value">{detail.updatedAt}</strong>
                </article>
              </div>
            </div>

            <div className="detail-badge-row detail-badge-row--wrap">
              <span className={detail.availability.isAvailable ? 'detail-badge detail-badge--active' : 'detail-badge'}>
                {t({ zh: '当前可用', en: 'Currently available' })}: {formatBoolean(detail.availability.isAvailable, locale)}
              </span>
              <span className={detail.availability.availableInShop ? 'detail-badge detail-badge--active' : 'detail-badge'}>
                {t({ zh: '商店', en: 'Shop' })}: {formatBoolean(detail.availability.availableInShop, locale)}
              </span>
              <span className={detail.availability.availableInTimeGate ? 'detail-badge detail-badge--active' : 'detail-badge'}>
                {t({ zh: '时间门', en: 'Time Gate' })}: {formatBoolean(detail.availability.availableInTimeGate, locale)}
              </span>
              <span className={detail.availability.availableInNextEvent ? 'detail-badge detail-badge--active' : 'detail-badge'}>
                {t({ zh: '下个活动', en: 'Next event' })}: {formatBoolean(detail.availability.availableInNextEvent, locale)}
              </span>
              {detail.eventName ? <span className="detail-badge">{t({ zh: '活动', en: 'Event' })}: {getLocalizedTextPair(detail.eventName, locale)}</span> : null}
            </div>

            <div className="section-jump-bar">
              {sectionLinks.map((section) => (
                <button
                  key={section.id}
                  type="button"
                  className={
                    activeSectionId === section.id
                      ? 'section-jump-bar__button section-jump-bar__button--active'
                      : 'section-jump-bar__button'
                  }
                  aria-pressed={activeSectionId === section.id}
                  onClick={() => scrollToSection(section.id)}
                >
                  {section.label}
                </button>
              ))}
            </div>
          </section>

          <div className="champion-detail-layout">
            <div className="champion-detail-content">
              <SurfaceCard
                eyebrow={t({ zh: '概览', en: 'Overview' })}
                title={t({ zh: '身份、系统字段与可用性', en: 'Identity, system fields, and availability' })}
                description={t({
                  zh: '先把最容易影响筛选、判断和排错的基础字段集中展示。',
                  en: 'Start with the fields that most often affect filtering, decisions, and data checks.',
                })}
              >
                <div id="overview" className="detail-section-anchor" />
                <div className="detail-field-grid">
                  <DetailField label={t({ zh: 'Seat', en: 'Seat' })} value={locale === 'zh-CN' ? `${detail.summary.seat} 号位` : `Seat ${detail.summary.seat}`} />
                  <DetailField label={t({ zh: '英文名', en: 'English name' })} value={detail.englishName} />
                  <DetailField label={t({ zh: '活动名', en: 'Event name' })} value={detail.eventName ? getLocalizedTextPair(detail.eventName, locale) : t({ zh: '无', en: 'None' })} />
                  <DetailField label={t({ zh: '首次可用', en: 'Date available' })} value={formatNullableText(detail.dateAvailable, locale)} />
                  <DetailField label={t({ zh: '最后重做', en: 'Last rework' })} value={formatNullableText(detail.lastReworkDate, locale)} />
                  <DetailField label={t({ zh: 'Popularity', en: 'Popularity' })} value={formatNumber(detail.popularity, locale)} />
                  <DetailField label={t({ zh: 'Graphic ID', en: 'Graphic ID' })} value={formatNullableText(detail.graphicId, locale)} />
                  <DetailField label={t({ zh: 'Portrait Graphic ID', en: 'Portrait Graphic ID' })} value={formatNullableText(detail.portraitGraphicId, locale)} />
                  <DetailField label={t({ zh: '下次活动时间', en: 'Next event time' })} value={formatTimestamp(detail.availability.nextEventTimestamp, locale)} />
                  <DetailField label={t({ zh: '默认天赋槽解锁', en: 'Default feat slots' })} value={detail.defaultFeatSlotUnlocks.length > 0 ? detail.defaultFeatSlotUnlocks.join(' / ') : t({ zh: '暂无', en: 'None yet' })} />
                  <DetailField label={t({ zh: 'Adventure IDs', en: 'Adventure IDs' })} value={detail.adventureIds.length > 0 ? detail.adventureIds.join(', ') : t({ zh: '暂无', en: 'None yet' })} hint={t({ zh: `${detail.adventureIds.length} 条`, en: `${detail.adventureIds.length} entries` })} />
                  <DetailField label={t({ zh: '原始块摘要', en: 'Raw blocks' })} value={t({ zh: 'Hero / Attacks / Upgrades / Feats / Skins', en: 'Hero / Attacks / Upgrades / Feats / Skins' })} />
                </div>

                <div className="detail-inline-grid detail-inline-grid--wide">
                  <JsonPanel title={t({ zh: 'Cost Curves', en: 'Cost Curves' })} value={detail.costCurves} />
                  <JsonPanel title={t({ zh: 'Health Curves', en: 'Health Curves' })} value={detail.healthCurves} />
                  <JsonPanel title={t({ zh: 'Properties', en: 'Properties' })} value={detail.properties} />
                </div>
              </SurfaceCard>

              <SurfaceCard
                eyebrow={t({ zh: '角色卡', en: 'Character sheet' })}
                title={t({ zh: '叙事资料与能力分布', en: 'Narrative profile and ability spread' })}
                description={t({
                  zh: '把角色设定、D&D 属性和背景故事分在同一段，方便同时看机制与人设。',
                  en: 'Keep the lore profile, D&D stats, and backstory together so mechanics and flavor stay connected.',
                })}
              >
                <div id="character-sheet" className="detail-section-anchor" />
                {detail.characterSheet ? (
                  <>
                    <div className="detail-field-grid">
                      <DetailField label={t({ zh: '全名', en: 'Full name' })} value={detail.characterSheet.fullName ? getLocalizedTextPair(detail.characterSheet.fullName, locale) : t({ zh: '暂无', en: 'Not available' })} />
                      <DetailField label={t({ zh: '职业', en: 'Class' })} value={detail.characterSheet.class ? getLocalizedTextPair(detail.characterSheet.class, locale) : t({ zh: '暂无', en: 'Not available' })} />
                      <DetailField label={t({ zh: '种族', en: 'Race' })} value={detail.characterSheet.race ? getLocalizedTextPair(detail.characterSheet.race, locale) : t({ zh: '暂无', en: 'Not available' })} />
                      <DetailField label={t({ zh: '阵营', en: 'Alignment' })} value={detail.characterSheet.alignment ? getLocalizedTextPair(detail.characterSheet.alignment, locale) : t({ zh: '暂无', en: 'Not available' })} />
                      <DetailField label={t({ zh: '年龄', en: 'Age' })} value={formatNumber(detail.characterSheet.age, locale)} />
                    </div>

                    <div className="ability-score-grid">
                      {(['str', 'dex', 'con', 'int', 'wis', 'cha'] as const).map((key) => (
                        <article key={key} className="ability-score-card">
                          <span className="ability-score-card__label">{key.toUpperCase()}</span>
                          <strong className="ability-score-card__value">{formatNumber(detail.characterSheet?.abilityScores[key] ?? null, locale)}</strong>
                        </article>
                      ))}
                    </div>

                    {detail.characterSheet.backstory ? (
                      <article className="detail-subcard detail-subcard--story">
                        <h3 className="detail-subcard__title">{t({ zh: '背景故事', en: 'Backstory' })}</h3>
                        <p className="detail-subcard__body">{getLocalizedTextPair(detail.characterSheet.backstory, locale)}</p>
                      </article>
                    ) : null}
                  </>
                ) : (
                  <div className="status-banner status-banner--info">{t({ zh: '当前没有角色卡字段。', en: 'No character sheet fields are available here.' })}</div>
                )}
              </SurfaceCard>

              <SurfaceCard
                eyebrow={t({ zh: '战斗', en: 'Combat' })}
                title={t({ zh: '基础数值、普攻、大招与活动升级', en: 'Base stats, attacks, ultimate, and event upgrades' })}
                description={t({
                  zh: '这里把会直接影响理解英雄机制的字段集中起来。',
                  en: 'This section groups the fields that most directly explain how the champion behaves in combat.',
                })}
              >
                <div id="combat" className="detail-section-anchor" />
                <div className="detail-field-grid">
                  <DetailField label={t({ zh: '基础花费', en: 'Base cost' })} value={formatDigitString(detail.baseCost, locale)} />
                  <DetailField label={t({ zh: '基础伤害', en: 'Base damage' })} value={formatDigitString(detail.baseDamage, locale)} />
                  <DetailField label={t({ zh: '基础生命', en: 'Base health' })} value={formatDigitString(detail.baseHealth, locale)} />
                  <DetailField label={t({ zh: '事件升级', en: 'Event upgrades' })} value={formatNumber(detail.attacks.eventUpgrades.length, locale)} />
                </div>

                <div className="detail-card-grid detail-card-grid--two-up">
                  <AttackPanel title={t({ zh: '普攻', en: 'Base attack' })} attack={detail.attacks.base} locale={locale} />
                  <AttackPanel title={t({ zh: '大招', en: 'Ultimate' })} attack={detail.attacks.ultimate} locale={locale} />
                </div>

                {detail.attacks.eventUpgrades.length > 0 ? (
                  <div className="detail-card-grid">
                    {detail.attacks.eventUpgrades.map((upgrade) => (
                      <article key={upgrade.upgradeId} className="detail-subcard">
                        <div className="detail-subcard__header">
                          <div>
                            <p className="detail-subcard__eyebrow">{t({ zh: '活动升级', en: 'Event upgrade' })}</p>
                            <h3 className="detail-subcard__title">{getLocalizedTextPair(upgrade.name, locale)}</h3>
                          </div>
                          {upgrade.graphicId ? <span className="detail-badge">Graphic {upgrade.graphicId}</span> : null}
                        </div>
                        {upgrade.description ? <p className="detail-subcard__body">{getLocalizedTextPair(upgrade.description, locale)}</p> : null}
                      </article>
                    ))}
                  </div>
                ) : null}
              </SurfaceCard>

              <SurfaceCard
                eyebrow={t({ zh: '升级', en: 'Upgrades' })}
                title={t({ zh: '成长轨道分成可读升级和数值里程碑', en: 'Split the progression track into readable upgrades and numeric milestones' })}
                description={t({
                  zh: '命名升级优先展示在上半段，空名数值升级用紧凑 ledger 排布，既不丢信息，也不把页面炸成瀑布流。',
                  en: 'Named upgrades stay in the upper layer, while unnamed numeric milestones move into a compact ledger so nothing is lost and the page stays scannable.',
                })}
              >
                <div id="upgrades" className="detail-section-anchor" />
                <div className="detail-field-grid detail-field-grid--compact">
                  <DetailField label={t({ zh: '全部升级', en: 'All upgrades' })} value={formatNumber(detail.upgrades.length, locale)} />
                  <DetailField label={t({ zh: '重点升级', en: 'Spotlight upgrades' })} value={formatNumber(spotlightUpgrades.length, locale)} />
                  <DetailField label={t({ zh: '数值里程碑', en: 'Numeric milestones' })} value={formatNumber(ledgerUpgrades.length, locale)} />
                </div>

                {spotlightUpgrades.length > 0 ? (
                  <div className="detail-card-grid">
                    {spotlightUpgrades.map((upgrade) => (
                      <UpgradeCard key={upgrade.id} upgrade={upgrade} locale={locale} />
                    ))}
                  </div>
                ) : null}

                {ledgerUpgrades.length > 0 ? (
                  <div className="upgrade-ledger">
                    <div className="upgrade-ledger__head">
                      <span>{t({ zh: '等级', en: 'Level' })}</span>
                      <span>{t({ zh: '静态倍率', en: 'Static mult' })}</span>
                      <span>{t({ zh: 'Effect 引用', en: 'Effect ref' })}</span>
                      <span>{t({ zh: '前置', en: 'Prerequisite' })}</span>
                    </div>
                    {ledgerUpgrades.map((upgrade) => (
                      <NumericUpgradeRow key={upgrade.id} upgrade={upgrade} locale={locale} />
                    ))}
                  </div>
                ) : null}
              </SurfaceCard>

              <SurfaceCard
                eyebrow={t({ zh: '天赋', en: 'Feats' })}
                title={t({ zh: '全部天赋原样保留，并补来源字段', en: 'Keep every feat intact and expose its source fields' })}
                description={t({
                  zh: '这里不只展示名字和描述，还把 effect、source、property 一并展开。',
                  en: 'This section keeps more than the name and description by exposing effect, source, and property data together.',
                })}
              >
                <div id="feats" className="detail-section-anchor" />
                <div className="detail-card-grid">
                  {detail.feats.map((feat) => (
                    <FeatCard key={feat.id} feat={feat} locale={locale} />
                  ))}
                </div>
              </SurfaceCard>

              <SurfaceCard
                eyebrow={t({ zh: '皮肤', en: 'Skins' })}
                title={t({ zh: '成本、资产字段和来源一页看全', en: 'View costs, asset fields, and sources in one place' })}
                description={t({
                  zh: '皮肤仍然按结构化字段展示，不把 cost / details / availability 混进原始 JSON 大段里。',
                  en: 'Skins still use structured slices so cost, details, and availability do not disappear inside giant JSON blobs.',
                })}
              >
                <div id="skins" className="detail-section-anchor" />
                <div className="detail-card-grid">
                  {detail.skins.map((skin) => (
                    <SkinCard
                      key={skin.id}
                      skin={skin}
                      locale={locale}
                      onPreview={openArtworkDialog}
                    />
                  ))}
                </div>
              </SurfaceCard>

              <SurfaceCard
                eyebrow={t({ zh: '原始字段', en: 'Raw fields' })}
                title={t({ zh: '最后一层：source / localized 快照片段', en: 'Final layer: source and localized snapshot slices' })}
                description={t({
                  zh: '为了满足“所有信息”，这里保留原始 definitions 片段；默认折叠，避免影响前半段的浏览效率。',
                  en: 'To satisfy the all-information requirement, the raw definitions slices stay here behind collapsible sections so they do not slow down the upper half of the page.',
                })}
              >
                <div id="raw" className="detail-section-anchor" />
                <div className="detail-field-grid detail-field-grid--compact">
                  <DetailField label={t({ zh: 'Hero raw', en: 'Hero raw' })} value={summarizeJson(detail.raw.hero.original, locale)} />
                  <DetailField label={t({ zh: 'Attacks raw', en: 'Attacks raw' })} value={`${detail.raw.attacks.length}`} />
                  <DetailField label={t({ zh: 'Upgrades raw', en: 'Upgrades raw' })} value={`${detail.raw.upgrades.length}`} />
                  <DetailField label={t({ zh: 'Feats raw', en: 'Feats raw' })} value={`${detail.raw.feats.length}`} />
                  <DetailField label={t({ zh: 'Skins raw', en: 'Skins raw' })} value={`${detail.raw.skins.length}`} />
                </div>

                <div className="raw-disclosure-stack">
                  <RawPairDisclosure title={t({ zh: 'Hero 快照', en: 'Hero snapshot' })} pair={detail.raw.hero} />
                  <RawEntriesDisclosure title={t({ zh: 'Attack 快照', en: 'Attack snapshots' })} entries={detail.raw.attacks} />
                  <RawEntriesDisclosure title={t({ zh: 'Upgrade 快照', en: 'Upgrade snapshots' })} entries={detail.raw.upgrades} />
                  <RawEntriesDisclosure title={t({ zh: 'Feat 快照', en: 'Feat snapshots' })} entries={detail.raw.feats} />
                  <RawEntriesDisclosure title={t({ zh: 'Skin 快照', en: 'Skin snapshots' })} entries={detail.raw.skins} />
                </div>
              </SurfaceCard>
            </div>

            <aside className="champion-detail-sidebar">
              <div className="champion-detail-sidebar__panel">
                <p className="champion-detail-sidebar__eyebrow">{t({ zh: '快速索引', en: 'Quick index' })}</p>
                <section className="champion-detail-sidebar__progress" aria-label={t({ zh: '卷宗进度', en: 'Dossier progress' })}>
                  <div className="champion-detail-sidebar__progress-head">
                    <div>
                      <p className="champion-detail-sidebar__progress-label">{t({ zh: '卷宗进度', en: 'Dossier progress' })}</p>
                      <p className="champion-detail-sidebar__progress-copy">
                        {t({ zh: '当前浏览', en: 'Currently reading' })} · {activeSectionLabel}
                      </p>
                    </div>
                    <strong className="champion-detail-sidebar__progress-value">
                      {activeSectionIndex + 1} / {sectionLinks.length}
                    </strong>
                  </div>
                  <div className="champion-detail-sidebar__progress-track" aria-hidden="true">
                    <span className="champion-detail-sidebar__progress-fill" style={{ width: sectionProgressValue }} />
                  </div>
                </section>

                <div className="champion-detail-sidebar__nav">
                  {sectionLinks.map((section, index) => {
                    const progressState = getSectionProgressState(index)

                    return (
                      <button
                        key={section.id}
                        type="button"
                        data-testid={`sidebar-section-${section.id}`}
                        data-progress-state={progressState}
                        className={
                          activeSectionId === section.id
                            ? 'champion-detail-sidebar__button champion-detail-sidebar__button--active'
                            : 'champion-detail-sidebar__button'
                        }
                        aria-label={section.label}
                        aria-pressed={activeSectionId === section.id}
                        aria-current={progressState === 'active' ? 'step' : undefined}
                        onClick={() => scrollToSection(section.id)}
                      >
                        <span className="champion-detail-sidebar__button-index">{String(index + 1).padStart(2, '0')}</span>
                        <span className="champion-detail-sidebar__button-copy">
                          <span className="champion-detail-sidebar__button-label">{section.label}</span>
                          <span className="champion-detail-sidebar__button-state">{getSectionProgressText(progressState)}</span>
                        </span>
                      </button>
                    )
                  })}
                </div>

                <div className="champion-detail-sidebar__facts">
                  <DetailField label={t({ zh: 'Seat', en: 'Seat' })} value={locale === 'zh-CN' ? `${detail.summary.seat} 号位` : `Seat ${detail.summary.seat}`} />
                  <DetailField label={t({ zh: '英雄 ID', en: 'Champion ID' })} value={detail.summary.id} />
                  <DetailField label={t({ zh: '详情更新', en: 'Updated' })} value={detail.updatedAt} />
                  <DetailField label={t({ zh: '普攻', en: 'Base attack' })} value={detail.attacks.base ? getPrimaryLocalizedText(detail.attacks.base.name, locale) : t({ zh: '暂无', en: 'None yet' })} />
                  <DetailField label={t({ zh: '大招', en: 'Ultimate' })} value={detail.attacks.ultimate ? getPrimaryLocalizedText(detail.attacks.ultimate.name, locale) : t({ zh: '暂无', en: 'None yet' })} />
                </div>
              </div>
            </aside>
          </div>

          {isArtworkDialogOpen && selectedSkin ? (
            <div
              className="skin-artwork-dialog"
              role="dialog"
              aria-modal="true"
              aria-label={t({ zh: '皮肤立绘预览', en: 'Skin artwork preview' })}
              onClick={closeArtworkDialog}
            >
              <div className="skin-artwork-dialog__backdrop" aria-hidden="true" />
              <div className="skin-artwork-dialog__panel" onClick={(event) => event.stopPropagation()}>
                <div className="skin-artwork-dialog__header">
                  <div className="skin-artwork-dialog__copy">
                    <p className="champion-detail-sidebar__eyebrow">{t({ zh: '皮肤立绘预览', en: 'Skin artwork preview' })}</p>
                    <h3 className="skin-artwork-dialog__title">{getLocalizedTextPair(selectedSkin.name, locale)}</h3>
                    <p className="skin-artwork-dialog__hint">
                      {t({
                        zh: '当前先用各皮肤的 portrait 预览图集中切换，下方继续保留 large / xl graphic id，方便后续对照原始资源。',
                        en: 'This overlay currently uses the portrait-style preview for each skin while keeping the large / xl graphic ids visible for deeper asset verification.',
                      })}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="skin-artwork-dialog__close"
                    aria-label={t({ zh: '关闭皮肤立绘预览', en: 'Close skin artwork preview' })}
                    onClick={closeArtworkDialog}
                  >
                    ×
                  </button>
                </div>

                <div className="skin-artwork-dialog__body">
                  <div className="skin-artwork-dialog__stage">
                    <div className="skin-artwork-dialog__canvas">
                      {selectedSkinPreviewUrl ? (
                        <img
                          key={`${selectedSkinPreviewKey ?? selectedSkin.id}:${Boolean(
                            selectedSkinPreviewKey && failedSkinPreviewIds[selectedSkinPreviewKey],
                          )}`}
                          className="skin-artwork-dialog__image"
                          src={selectedSkinPreviewUrl}
                          alt={buildSkinPreviewAlt(selectedSkin, locale)}
                          loading="eager"
                          onError={() => {
                            if (!selectedSkinPreviewKey) {
                              return
                            }

                            setFailedSkinPreviewIds((current) =>
                              current[selectedSkinPreviewKey]
                                ? current
                                : { ...current, [selectedSkinPreviewKey]: true },
                            )
                          }}
                        />
                      ) : (
                        <div className="skin-artwork-dialog__fallback">
                          {t({ zh: '当前没有可用的皮肤预览资源。', en: 'No skin preview asset is available right now.' })}
                        </div>
                      )}
                    </div>

                    <div className="detail-field-grid detail-field-grid--compact">
                      <DetailField label={t({ zh: 'Base Graphic ID', en: 'Base graphic ID' })} value={formatNullableText(selectedSkinArtworkIds?.baseGraphicId ?? null, locale)} />
                      <DetailField label={t({ zh: 'Large Graphic ID', en: 'Large graphic ID' })} value={formatNullableText(selectedSkinArtworkIds?.largeGraphicId ?? null, locale)} />
                      <DetailField label={t({ zh: 'XL Graphic ID', en: 'XL graphic ID' })} value={formatNullableText(selectedSkinArtworkIds?.xlGraphicId ?? null, locale)} />
                      <DetailField label={t({ zh: 'Portrait Graphic ID', en: 'Portrait graphic ID' })} value={formatNullableText(selectedSkinArtworkIds?.portraitGraphicId ?? null, locale)} />
                    </div>
                  </div>

                  <div className="skin-artwork-dialog__selector">
                    <p className="skin-artwork-dialog__selector-title">{t({ zh: '切换皮肤', en: 'Switch skins' })}</p>
                    <div className="skin-artwork-dialog__tabs">
                      {detail.skins.map((skin) => {
                        const artworkIds = getSkinArtworkIds(skin)

                        return (
                          <button
                            key={skin.id}
                            type="button"
                            className={
                              selectedSkin.id === skin.id
                                ? 'skin-artwork-dialog__tab skin-artwork-dialog__tab--active'
                                : 'skin-artwork-dialog__tab'
                            }
                            aria-label={
                              locale === 'zh-CN'
                                ? `切换皮肤：${getPrimaryLocalizedText(skin.name, locale)}`
                                : `Switch skin: ${getPrimaryLocalizedText(skin.name, locale)}`
                            }
                            aria-pressed={selectedSkin.id === skin.id}
                            onClick={() => setSelectedSkinId(skin.id)}
                          >
                            <span className="skin-artwork-dialog__tab-title">{getPrimaryLocalizedText(skin.name, locale)}</span>
                            <span className="skin-artwork-dialog__tab-meta">
                              {artworkIds.largeGraphicId || artworkIds.xlGraphicId || artworkIds.portraitGraphicId
                                ? `ID ${artworkIds.largeGraphicId ?? artworkIds.xlGraphicId ?? artworkIds.portraitGraphicId}`
                                : t({ zh: '暂无图像字段', en: 'No graphic id' })}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  )
}
