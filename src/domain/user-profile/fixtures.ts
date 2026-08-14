import type { MessageRef } from '../types/common'
import type { OwnedHero, ImportedFormationSave, UserProfileSnapshot } from './types'

export function createOwnedHero(
  overrides: Partial<OwnedHero> = {},
): OwnedHero {
  return {
    heroId: '1',
    level: 1,
    equipment: {},
    feats: [],
    legendaryEffects: [],
    unlockedFeats: [],
    activeFeats: [],
    featSlots: 0,
    isOwned: true,
    gildableSlotId: null,
    lootBySlot: {},
    legendaryBySlot: {},
    specializations: [],
    ...overrides,
  }
}

export function createImportedFormationSave(
  overrides: Partial<ImportedFormationSave> = {},
): ImportedFormationSave {
  return {
    formationId: 'formation-1',
    layoutId: 'layout-1',
    scenarioRef: { kind: 'adventure', id: '10' },
    placements: {},
    specializations: {},
    feats: {},
    familiars: {},
    isFavorite: false,
    ...overrides,
  }
}

export function createUserProfileSnapshot(
  overrides: Partial<UserProfileSnapshot> = {},
  warnings: MessageRef[] = [],
): UserProfileSnapshot {
  return {
    schemaVersion: 1,
    ownedHeroes: [],
    importedFormationSaves: [],
    updatedAt: new Date().toISOString(),
    warnings,
    legendaryLevelCap: 20,
    ...overrides,
  }
}
