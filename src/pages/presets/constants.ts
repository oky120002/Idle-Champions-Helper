import type { PresetPriority } from '../../domain/types'
import type { PresetEditorState } from './types'

export const PRESET_SCHEMA_VERSION = 1
export const PRESET_PRIORITY_OPTIONS: PresetPriority[] = ['high', 'medium', 'low']

export const EMPTY_PRESET_EDITOR: PresetEditorState = {
  name: '',
  description: '',
  scenarioTagsInput: '',
  priority: 'medium',
}
