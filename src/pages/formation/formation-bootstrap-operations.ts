import type { Dispatch, SetStateAction } from 'react'
import type { NavigateFunction } from 'react-router-dom'
import {
  createErrorStatusMessage,
  createInfoStatusMessage,
  createSuccessStatusMessage,
} from '../../components/statusMessage'
import { loadCollectionAtVersion, loadVersion } from '../../data/client'
import {
  buildFormationSnapshotPrompt,
  buildRestoreStatusDetail,
} from '../../data/formationPersistence'
import type {
  FormationSnapshotPreview,
  FormationSnapshotPrompt,
} from '../../data/formation-persistence/types'
import { readRecentFormationDraft, saveRecentFormationDraft } from '../../data/formationDraftStore'
import type {
  Champion,
  FormationDraft,
  FormationLayout,
  FormationPreset,
  ScenarioRef,
} from '../../domain/types'
import {
  buildReadyFormationState,
  buildRestoredDraftFromPreview,
  convertPresetToDraft,
  errorMessageLocaleText,
  pickPreferredSlotId,
} from './formation-model-helpers'
import {
  DRAFT_SCHEMA_VERSION,
  type DraftPrompt,
  type FormationState,
  type StatusMessage,
} from './types'

export interface FormationBootstrapSetters {
  setState: Dispatch<SetStateAction<FormationState>>
  setSelectedLayoutId: Dispatch<SetStateAction<string>>
  setPlacements: Dispatch<SetStateAction<Record<string, string>>>
  setScenarioRef: Dispatch<SetStateAction<ScenarioRef | null>>
  setDraftPrompt: Dispatch<SetStateAction<DraftPrompt | null>>
  setDraftStatus: Dispatch<SetStateAction<StatusMessage | null>>
  setIsDraftPersistenceArmed: Dispatch<SetStateAction<boolean>>
  setActiveMobileSlotId: Dispatch<SetStateAction<string>>
}

interface BootstrapLifecycleOptions extends FormationBootstrapSetters {
  isDisposed: () => boolean
}

interface LoadFormationBootstrapDataOptions extends BootstrapLifecycleOptions {
  navigate: NavigateFunction
  pendingPresetRestore: FormationPreset | null
}

interface RestorePendingPresetOptions extends BootstrapLifecycleOptions {
  navigate: NavigateFunction
  pendingPresetRestore: FormationPreset
  version: string
  formations: FormationLayout[]
  champions: Champion[]
}

interface LoadStoredDraftPromptOptions extends BootstrapLifecycleOptions {
  version: string
  formations: FormationLayout[]
  champions: Champion[]
}

export async function loadFormationBootstrapData(opts: LoadFormationBootstrapDataOptions) {
  const { isDisposed, pendingPresetRestore } = opts
  const version = await loadVersion()
  const [formationCollection, championCollection] = await Promise.all([
    loadCollectionAtVersion<FormationLayout>(version.current, 'formations'),
    loadCollectionAtVersion<Champion>(version.current, 'champions'),
  ])

  if (isDisposed()) {
    return
  }

  const initialLayout = formationCollection.items[0] ?? null

  opts.setState(
    buildReadyFormationState(
      version.current,
      formationCollection.items,
      championCollection.items,
    ),
  )
  opts.setSelectedLayoutId(initialLayout?.id ?? '')
  opts.setActiveMobileSlotId(pickPreferredSlotId(initialLayout))
  opts.setDraftStatus(
    createInfoStatusMessage(
      { zh: '最近草稿会自动保存在当前浏览器', en: 'Recent drafts auto-save in this browser' },
      { zh: '介质为 IndexedDB；只保存在本地，不上传到外部服务。', en: 'Stored in IndexedDB; kept locally only, never uploaded.' },
    ),
  )

  const extra = {
    version: version.current,
    formations: formationCollection.items,
    champions: championCollection.items,
  }

  if (pendingPresetRestore) {
    await restorePendingPreset({ ...opts, ...extra, pendingPresetRestore })
    return
  }

  await loadStoredDraftPrompt({ ...opts, ...extra })
}

export async function restorePendingPreset(opts: RestorePendingPresetOptions) {
  const { isDisposed, navigate, pendingPresetRestore, version, formations, champions } = opts

  // 清除路由 state（防止 back/forward 或 remount 时重复恢复），但保留当前 URL 搜索参数——
  // useFormationFilterState 的 useLayoutEffect 已将筛选快照同步到 URL，硬编码 '/formation'
  // 会抹掉这些参数导致刷新后筛选丢失。HashRouter 下路由路径在 window.location.hash 中。
  const hashPath = typeof window !== 'undefined' ? window.location.hash.slice(1) : ''
  const currentPath = hashPath !== '' ? hashPath : '/formation'
  void navigate(currentPath, { replace: true, state: null })

  const pendingPrompt = await buildFormationSnapshotPrompt(
    convertPresetToDraft(pendingPresetRestore),
    version,
    formations,
    champions,
    { zh: '方案', en: 'preset' },
    DRAFT_SCHEMA_VERSION,
  )

  if (isDisposed()) {
    return
  }

  await applyPendingPresetOutcome(opts, pendingPrompt)
}

async function applyPendingPresetOutcome(
  opts: RestorePendingPresetOptions,
  pendingPrompt: FormationSnapshotPrompt<FormationDraft>,
) {
  const { isDisposed, pendingPresetRestore, setDraftStatus, setIsDraftPersistenceArmed } = opts

  if (pendingPrompt.kind !== 'restore') {
    setIsDraftPersistenceArmed(true)
    setDraftStatus(createErrorStatusMessage(
      { zh: `方案“${pendingPresetRestore.name}”当前不能恢复`, en: `Preset "${pendingPresetRestore.name}" cannot be restored` },
      pendingPrompt.detail,
    ))
    return
  }

  const restoredDraft = buildRestoredDraftFromPreview(pendingPrompt.preview)
  let writeBackFailureDetail: { zh: string; en: string } | null = null

  try {
    await saveRecentFormationDraft(restoredDraft)
  } catch (error: unknown) {
    if (isDisposed()) {
      return
    }

    writeBackFailureDetail = errorMessageLocaleText(error)
  }

  if (isDisposed()) {
    return
  }

  applyRestoredDraftState(pendingPrompt.preview, restoredDraft, opts)

  if (writeBackFailureDetail) {
    setDraftStatus(createErrorStatusMessage(
      { zh: '方案已恢复，但最近草稿回写失败', en: 'Preset restored, but recent-draft write-back failed' },
      writeBackFailureDetail,
    ))
    return
  }

  setDraftStatus(
    createSuccessStatusMessage(
      { zh: `已从方案“${pendingPresetRestore.name}”恢复到阵型页`, en: `Restored preset "${pendingPresetRestore.name}" to the formation page` },
      buildRestoreStatusDetail(pendingPrompt.preview),
    ),
  )
}

function applyRestoredDraftState(
  preview: FormationSnapshotPreview<FormationDraft>,
  restoredDraft: FormationDraft,
  setters: FormationBootstrapSetters,
) {
  setters.setState(
    buildReadyFormationState(
      preview.dataVersion,
      preview.formations,
      preview.champions,
    ),
  )
  setters.setSelectedLayoutId(restoredDraft.layoutId)
  setters.setPlacements(restoredDraft.placements)
  setters.setActiveMobileSlotId(
    pickPreferredSlotId(
      preview.formations.find((layout) => layout.id === restoredDraft.layoutId) ?? null,
      restoredDraft.placements,
    ),
  )
  setters.setScenarioRef(restoredDraft.scenarioRef)
  setters.setIsDraftPersistenceArmed(true)
  setters.setDraftPrompt(null)
}

export async function loadStoredDraftPrompt({
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
      { zh: '最近草稿', en: 'recent draft' },
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
    setDraftStatus(
      createErrorStatusMessage(
        { zh: '最近草稿读取失败', en: 'Failed to read recent draft' },
        {
          zh: `${errorMessageLocaleText(error).zh} 当前仍可继续编辑，但不会自动恢复旧草稿。`,
          en: `${errorMessageLocaleText(error).en} You can keep editing, but the old draft won't auto-restore.`,
        },
      ),
    )
  }
}
