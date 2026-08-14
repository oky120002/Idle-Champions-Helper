import type { Dispatch, SetStateAction } from 'react'
import type { NavigateFunction } from 'react-router-dom'
import type { MessageRef } from '../../app/i18n'
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
  errorMessageRef,
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
      { key: '最近草稿会自动保存在当前浏览器' },
      { key: '介质为 IndexedDB；只保存在本地，不上传到外部服务。' },
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
    { key: '方案' },
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
      { literal: `方案“${pendingPresetRestore.name}”当前不能恢复` },
      pendingPrompt.detail,
    ))
    return
  }

  const restoredDraft = buildRestoredDraftFromPreview(pendingPrompt.preview)
  let writeBackFailureDetail: MessageRef | null = null

  try {
    await saveRecentFormationDraft(restoredDraft)
  } catch (error: unknown) {
    if (isDisposed()) {
      return
    }

    writeBackFailureDetail = errorMessageRef(error)
  }

  if (isDisposed()) {
    return
  }

  applyRestoredDraftState(pendingPrompt.preview, restoredDraft, opts)

  if (writeBackFailureDetail) {
    setDraftStatus(createErrorStatusMessage(
      { key: '方案已恢复，但最近草稿回写失败' },
      writeBackFailureDetail,
    ))
    return
  }

  setDraftStatus(
    createSuccessStatusMessage(
      { literal: `已从方案“${pendingPresetRestore.name}”恢复到阵型页` },
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
      { key: '最近草稿' },
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
        { key: '最近草稿读取失败' },
        { key: '{p0} 当前仍可继续编辑，但不会自动恢复旧草稿。', params: { p0: error instanceof Error ? error.message : '未知错误' } },
      ),
    )
  }
}
