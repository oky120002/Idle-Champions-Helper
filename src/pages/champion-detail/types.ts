import type { ReactNode } from 'react'
import type { AppLocale } from '../../app/i18n'
import type {
  ChampionAttackDetail,
  ChampionDetail,
  ChampionFeatDetail,
  ChampionUpgradeDetail,
  ChampionSpecializationGraphic,
  JsonValue,
} from '../../domain/types'

export const DETAIL_SECTION_IDS = ['overview', 'character-sheet', 'combat', 'upgrades', 'feats'] as const
export const DETAIL_HASH_PREFIX = 'section-'

export type DetailSectionId = (typeof DETAIL_SECTION_IDS)[number]
export type DetailSectionProgressState = 'completed' | 'active' | 'upcoming'

export type ChampionDetailState =
  | { status: 'idle' }
  | { status: 'ready'; detail: ChampionDetail }
  | { status: 'not-found'; championId: string }
  | { status: 'error'; championId: string; message: string }

export interface DetailFieldProps {
  label: string
  value: ReactNode
  hint?: ReactNode | null
  variant?: 'default' | 'compact'
}

export interface AttackPanelProps {
  title: ReactNode
  attack: ChampionAttackDetail | null
  locale: AppLocale
}

export interface UpgradeCardProps {
  upgrade: ChampionUpgradeDetail
  presentation: UpgradePresentation
  locale: AppLocale
  specializationGraphic: ChampionSpecializationGraphic | null
}

export interface NumericUpgradeRowProps {
  upgrade: ChampionUpgradeDetail
  presentation: UpgradePresentation
  locale: AppLocale
}

export interface FeatCardProps {
  feat: ChampionFeatDetail
  locale: AppLocale
  effectContext: EffectContext
}

export interface DetailSectionBadge {
  label: string
  value: string
}

export interface DetailSectionHeaderProps {
  title: string
  badges: DetailSectionBadge[]
}

export interface SummaryTagGroupProps {
  label: string
  items: string[]
}

export interface FeatEffectEntry {
  summary: string
  detail: string | null
}

export interface UpgradeSpecializationArtProps {
  src: string
  alt: string
}

export interface SkinArtworkIds {
  baseGraphicId: string | null
  largeGraphicId: string | null
  xlGraphicId: string | null
  portraitGraphicId: string | null
}

export interface EffectContext {
  locale: AppLocale
  championName: string
  attackLabelById: Map<string, string>
  upgradeLabelById: Map<string, string>
}

export interface ParsedEffectPayload {
  raw: string
  effectString: string
  description: string | null
  data: JsonValue | null
  kind: string
  args: string[]
}

export interface EffectDescriptor {
  categoryLabel: string
  targetLabel: string | null
  targetHint: string | null
  summary: string
  detail: string | null
}

export interface EffectDefinitionPresentation {
  summary: string | null
  detail: string | null
  bullets: string[]
}

export interface UpgradePresentation {
  title: string
  typeLabel: string
  targetLabel: string | null
  targetHint: string | null
  summary: string | null
  detailLines: string[]
  prerequisiteLabel: string
  staticMultiplierLabel: string | null
}

export interface UpgradeCategoryMeta {
  key: string
  label: string
  defaultEnabled: boolean
}

export interface LedgerUpgradeRow {
  upgrade: ChampionUpgradeDetail
  presentation: UpgradePresentation
  category: UpgradeCategoryMeta
}

export interface DetailSectionLink {
  id: DetailSectionId
  label: string
}
