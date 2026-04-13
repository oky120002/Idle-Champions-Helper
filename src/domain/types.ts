export interface DataVersion {
  current: string
  updatedAt: string
  notes: string[]
}

export interface DataCollection<T> {
  items: T[]
  updatedAt: string
}

export interface LocalizedText {
  original: string
  display: string
}

export interface LocalizedOption extends LocalizedText {
  id: string
}

export interface Champion {
  id: string
  name: LocalizedText
  seat: number
  roles: string[]
  affiliations: LocalizedText[]
  tags: string[]
}

export interface Variant {
  id: string
  name: LocalizedText
  campaign: LocalizedOption
  restrictions: LocalizedText[]
  rewards: LocalizedText[]
}

export interface FormationSlot {
  id: string
  row: number
  column: number
}

export interface FormationLayout {
  id: string
  name: string
  notes?: string
  slots: FormationSlot[]
}

export type UserImportMethod = 'supportUrl' | 'manual' | 'webRequestLog'

export interface UserCredentials {
  userId: string
  hash: string
}

export interface MaskedUserCredentials {
  userId: string
  hash: string
}

export type UserImportParseResult =
  | {
      ok: true
      value: UserCredentials
    }
  | {
      ok: false
      error: string
    }
