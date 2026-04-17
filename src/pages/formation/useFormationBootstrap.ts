import { useEffect, type Dispatch, type MutableRefObject, type SetStateAction } from 'react'
import type { NavigateFunction } from 'react-router-dom'
import { loadCollectionAtVersion, loadVersion } from '../../data/client'
import {
  buildFormationSnapshotPrompt,
  buildRestoreStatusDetail,
} from '../../data/formationPersistence'
import { readRecentFormationDraft, saveRecentFormationDraft } from '../../data/formationDraftStore'
import type {
  Champion,
  FormationLayout,
  FormationPreset,
  ScenarioRef,
} from '../../domain/types'
import {
  buildReadyFormationState,
  buildRestoredDraftFromPreview,
  convertPresetToDraft,
  getErrorMessage,
  pickPreferredSlotId,
} from './formation-model-helpers'
import {
  DRAFT_SCHEMA_VERSION,
  PRESET_SCHEMA_VERSION,
  type DraftPrompt,
  type FormationState,
  type StatusMessage,
} from './types'

interface UseFormationBootstrapOptions {
  navigate: NavigateFunction
  pendingPresetRestoreRef: MutableRefObject<FormationPreset | null>
  setState: Dispatch<SetStateAction<FormationState>>
  setSelectedLayoutId: Dispatch<SetStateAction<string>>
  setPlacements: Dispatch<SetStateAction<Record<string, string>>>
  setScenarioRef: Dispatch<SetStateAction<ScenarioRef | null>>
  setDraftPrompt: Dispatch<SetStateAction<DraftPrompt | null>>
  setDraftStatus: Dispatch<SetStateAction<StatusMessage | null>>
  setIsDraftPersistenceArmed: Dispatch<SetStateAction<boolean>>
  setActiveMobileSlotId: Dispatch<SetStateAction<string>>
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

    async function bootstrap() {
      try {
        const version = await loadVersion()
        const [formationCollection, championCollection] = await Promise.all([
          loadCollectionAtVersion<FormationLayout>(version.current, 'formations'),
          loadCollectionAtVersion<Champion>(version.current, 'champions'),
        ])

        if (isDisposed()) {
          return
        }

        setState(
          buildReadyFormationState(
            version.current,
            formationCollection.items,
            championCollection.items,
          ),
        )
        setSelectedLayoutId(formationCollection.items[0]?.id ?? '')
        setActiveMobileSlotId(pickPreferredSlotId(formationCollection.items[0] ?? null))
        setDraftStatus({
          tone: 'info',
          title: '最近草稿会自动保存在当前浏览器',
          detail: '介质为 IndexedDB；只保存在本地，不上传到外部服务。',
        })

        if (pendingPresetRestoreRef.current) {
          await restorePendingPreset({
            isDisposed,
            navigate,
            pendingPresetRestore: pendingPresetRestoreRef.current,
            version: version.current,
            formations: formationCollection.items,
            champions: championCollection.items,
            setState,
            setSelectedLayoutId,
            setPlacements,
            setScenarioRef,
            setDraftStatus,
            setIsDraftPersistenceArmed,
            setActiveMobileSlotId,
          })
          return
        }

        await loadStoredDraftPrompt({
          isDisposed,
          version: version.current,
          formations: formationCollection.items,
          champions: championCollection.items,
          setDraftPrompt,
          setDraftStatus,
          setIsDraftPersistenceArmed,
        })
      } catch (error: unknown) {
        if (isDisposed()) {
          return
        }

        setState({
          status: 'error',
          message: getErrorMessage(error),
        })
      }
    }

    void bootstrap()

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

interface RestorePendingPresetOptions {
  isDisposed: () => boolean
  navigate: NavigateFunction
  pendingPresetRestore: FormationPreset
  version: string
  formations: FormationLayout[]
  champions: Champion[]
  setState: Dispatch<SetStateAction<FormationState>>
  setSelectedLayoutId: Dispatch<SetStateAction<string>>
  setPlacements: Dispatch<SetStateAction<Record<string, string>>>
  setScenarioRef: Dispatch<SetStateAction<ScenarioRef | null>>
  setDraftStatus: Dispatch<SetStateAction<StatusMessage | null>>
  setIsDraftPersistenceArmed: Dispatch<SetStateAction<boolean>>
  setActiveMobileSlotId: Dispatch<SetStateAction<string>>
}

async function restorePendingPreset({
  isDisposed,
  navigate,
  pendingPresetRestore,
  version,
  formations,
  champions,
  setState,
  setSelectedLayoutId,
  setPlacements,
  setScenarioRef,
  setDraftStatus,
  setIsDraftPersistenceArmed,
  setActiveMobileSlotId,
}: RestorePendingPresetOptions) {
  void navigate('/formation', { replace: true, state: null })

  const pendingPrompt = await buildFormationSnapshotPrompt(
    convertPresetToDraft(pendingPresetRestore),
    version,
    formations,
    champions,
    '方案',
    PRESET_SCHEMA_VERSION,
  )

  if (isDisposed()) {
    return
  }

  if (pendingPrompt.kind !== 'restore') {
    setIsDraftPersistenceArmed(true)
    setDraftStatus({
      tone: 'error',
      title: `方案“${pendingPresetRestore.name}”当前不能恢复`,
      detail: pendingPrompt.detail,
    })
    return
  }

  const restoredDraft = buildRestoredDraftFromPreview(pendingPrompt.preview)

  try {
    await saveRecentFormationDraft(restoredDraft)
  } catch (error: unknown) {
    if (isDisposed()) {
      return
    }

    setIsDraftPersistenceArmed(true)
    setDraftStatus({
      tone: 'error',
      title: '方案已恢复，但最近草稿回写失败',
      detail: getErrorMessage(error),
    })
  }

  if (isDisposed()) {
    return
  }

  setState(
    buildReadyFormationState(
      pendingPrompt.preview.dataVersion,
      pendingPrompt.preview.formations,
      pendingPrompt.preview.champions,
    ),
  )
  setSelectedLayoutId(restoredDraft.layoutId)
  setPlacements(restoredDraft.placements)
  setActiveMobileSlotId(
    pickPreferredSlotId(
      pendingPrompt.preview.formations.find((layout) => layout.id === restoredDraft.layoutId) ?? null,
      restoredDraft.placements,
    ),
  )
  setScenarioRef(restoredDraft.scenarioRef)
  setIsDraftPersistenceArmed(true)
  setDraftStatus({
    tone: 'success',
    title: `已从方案“${pendingPresetRestore.name}”恢复到阵型页`,
    detail: buildRestoreStatusDetail(pendingPrompt.preview),
  })
}

interface LoadStoredDraftPromptOptions {
  isDisposed: () => boolean
  version: string
  formations: FormationLayout[]
  champions: Champion[]
  setDraftPrompt: Dispatch<SetStateAction<DraftPrompt | null>>
  setDraftStatus: Dispatch<SetStateAction<StatusMessage | null>>
  setIsDraftPersistenceArmed: Dispatch<SetStateAction<boolean>>
}

async function loadStoredDraftPrompt({
  isDisposed,
  version,
  formations,
  champions,
  setDraftPrompt,
  setDraftStatus,
  setIsDraftPersistenceArmed,
}: LoadStoredDraftPromptOptions) {
  try {
    const storedDraft = await readRecentFormationDraft()

    if (isDisposed()) {
      return
    }

    if (!storedDraft) {
      setIsDraftPersistenceArmed(true)
      return
    }

    const prompt = await buildFormationSnapshotPrompt(
      storedDraft,
      version,
      formations,
      champions,
      '最近草稿',
      DRAFT_SCHEMA_VERSION,
    )

    if (isDisposed()) {
      return
    }

    setDraftPrompt(prompt)
  } catch (error: unknown) {
    if (isDisposed()) {
      return
    }

    setIsDraftPersistenceArmed(true)
    setDraftStatus({
      tone: 'error',
      title: '最近草稿读取失败',
      detail: `${getErrorMessage(error)} 当前仍可继续编辑，但不会自动恢复旧草稿。`,
    })
  }
}
