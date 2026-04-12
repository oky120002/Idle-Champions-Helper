export interface DataVersion {
  current: string
  updatedAt: string
  notes: string[]
}

export interface DataCollection<T> {
  items: T[]
  updatedAt: string
}

export interface Champion {
  id: string
  name: string
  seat: number
  roles: string[]
  affiliations: string[]
  tags: string[]
}

export interface Variant {
  id: string
  name: string
  campaign: string
  restrictions: string[]
  rewards: string[]
}

export interface FormationSlot {
  id: string
  row: number
  column: number
}

export interface FormationLayout {
  id: string
  name: string
  slots: FormationSlot[]
}
