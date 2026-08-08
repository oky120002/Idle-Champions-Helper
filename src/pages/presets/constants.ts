import { PRESET_PRIORITY_OPTIONS } from '../formation/types'
import type { PresetEditorState } from './types'

export { PRESET_PRIORITY_OPTIONS }

export const EMPTY_PRESET_EDITOR: PresetEditorState = {
  name: '',
  description: '',
  scenarioTagsInput: '',
  priority: 'medium',
}
