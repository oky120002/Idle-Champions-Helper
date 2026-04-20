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

export function useFormationBootstrap({
  navigate,
  pendingPresetRestoreRef,
  setState,
  setSelectedLayoutId,
  setPlacements,
  setScenarioRef,
  setDraftPrompt,
  setDraftStatus,
  setIsDraftPersistenceArmed,
  setActiveMobileSlotId,
}: UseFormationBootstrapOptions) {
  useEffect(() => {
    let disposed = false
    const isDisposed = () => disposed

    void loadFormationBootstrapData({
      isDisposed,
      navigate,
      pendingPresetRestore: pendingPresetRestoreRef.current,
      setState,
      setSelectedLayoutId,
      setPlacements,
      setScenarioRef,
      setDraftPrompt,
      setDraftStatus,
      setIsDraftPersistenceArmed,
      setActiveMobileSlotId,
    }).catch((error: unknown) => {
      if (isDisposed()) {
        return
      }

      setState({
        status: 'error',
        message: getErrorMessage(error),
      })
    })

    return () => {
      disposed = true
    }
  }, [
    navigate,
    pendingPresetRestoreRef,
    setActiveMobileSlotId,
    setDraftPrompt,
    setDraftStatus,
    setIsDraftPersistenceArmed,
    setPlacements,
    setScenarioRef,
    setSelectedLayoutId,
    setState,
  ])
}
