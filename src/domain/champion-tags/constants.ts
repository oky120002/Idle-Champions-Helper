import type { ChampionAttributeGroupId } from './types'
import { isAcquisitionTag, isMechanicTag } from './helpers'

export const ROLE_TAGS = new Set([
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

export const RACE_TAGS = new Set([
  'aasimar',
  'aarakocra',
  'bullywug',
  'centaur',
  'companion',
  'dragonborn',
  'drow',
  'dwarf',
  'eladrin',
  'elf',
  'genasi',
  'gith',
  'gnome',
  'halfling',
  'half-elf',
  'half-orc',
  'human',
  'kobold',
  'lizardfolk',
  'lycanthrope',
  'tabaxi',
  'tiefling',
  'tortle',
  'undead',
  'warforged',
  'yuan-ti',
])

export const GENDER_TAGS = new Set(['male', 'female'])
export const ALIGNMENT_TAGS = new Set(['chaotic', 'evil', 'geneutral', 'good', 'lawful', 'lcneutral', 'neutral'])
export const PROFESSION_TAGS = new Set([
  'artificer',
  'barbarian',
  'bard',
  'cleric',
  'druid',
  'fighter',
  'hunter',
  'monk',
  'paladin',
  'ranger',
  'rogue',
  'samurai',
  'sorcerer',
  'warlock',
  'wizard',
])

export const ATTRIBUTE_GROUP_MATCHERS: Record<
  Exclude<ChampionAttributeGroupId, 'other'>,
  (tag: string) => boolean
> = {
  race: (tag) => RACE_TAGS.has(tag),
  gender: (tag) => GENDER_TAGS.has(tag),
  alignment: (tag) => ALIGNMENT_TAGS.has(tag),
  profession: (tag) => PROFESSION_TAGS.has(tag),
  acquisition: isAcquisitionTag,
  mechanics: isMechanicTag,
}
