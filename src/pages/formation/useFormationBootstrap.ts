import { useEffect, type MutableRefObject } from 'react'
import type { NavigateFunction } from 'react-router-dom'
import type { FormationPreset } from '../../domain/types'
import { getErrorMessage } from './formation-model-helpers'
import {
  loadFormationBootstrapData,
  type FormationBootstrapSetters,
} from './formation-bootstrap-operations'

interface UseFormationBootstrapOptions extends FormationBootstrapSetters {
  navigate: NavigateFunction
  pendingPresetRestoreRef: MutableRefObject<FormationPreset | null>
}

export function useFormationBootstrap(options: UseFormationBootstrapOptions) {
  const deps = buildBootstrapDeps(options)
  useEffect(() => {
    let disposed = false
    void loadFormationBootstrapData({
      pendingPresetRestore: options.pendingPresetRestoreRef.current,
      isDisposed: () => disposed,
      navigate: options.navigate,
      setState: options.setState,
      setSelectedLayoutId: options.setSelectedLayoutId,
      setPlacements: options.setPlacements,
      setScenarioRef: options.setScenarioRef,
      setDraftPrompt: options.setDraftPrompt,
      setDraftStatus: options.setDraftStatus,
      setIsDraftPersistenceArmed: options.setIsDraftPersistenceArmed,
      setActiveMobileSlotId: options.setActiveMobileSlotId,
    }).catch((error: unknown) => {
      if (disposed) return
      options.setState({ status: 'error', message: getErrorMessage(error) })
    })
    return () => { disposed = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
}

function buildBootstrapDeps(options: UseFormationBootstrapOptions) {
  return [
    options.navigate,
    options.pendingPresetRestoreRef,
    options.setActiveMobileSlotId,
    options.setDraftPrompt,
    options.setDraftStatus,
    options.setIsDraftPersistenceArmed,
    options.setPlacements,
    options.setScenarioRef,
    options.setSelectedLayoutId,
    options.setState,
  ]
}
