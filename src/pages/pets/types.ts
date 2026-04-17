import type { PetAcquisitionKind } from '../../domain/types'

export type SourceFilter = 'all' | PetAcquisitionKind

export type AssetFilter = 'all' | 'complete' | 'missing'
