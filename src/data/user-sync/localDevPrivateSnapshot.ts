import type { BuildUserProfileSnapshotInput } from './userProfileNormalizer'

const LOCAL_DEV_PRIVATE_SNAPSHOT_ENDPOINT = '/__dev/private-user-data/user-profile-payloads'
const LOCAL_DEV_PRIVATE_SNAPSHOT_REFRESH_ENDPOINT = '/__dev/private-user-data/refresh'

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

export function isLocalDevPrivateSnapshotEnabled(): boolean {
  return import.meta.env.DEV
}

export async function fetchLocalDevPrivateSnapshotPayloads(
  fetchImpl: typeof fetch = fetch,
): Promise<BuildUserProfileSnapshotInput> {
  if (!isLocalDevPrivateSnapshotEnabled()) {
    throw new Error('本地开发快照导入只允许在 Vite 开发模式中使用。')
  }

  const response = await fetchImpl(LOCAL_DEV_PRIVATE_SNAPSHOT_ENDPOINT, {
    cache: 'no-store',
  })

  if (!response.ok) {
    throw new Error('本地开发快照不可用：请先运行 private-user-data:fetch，并在 vite dev 下重试。')
  }

  const payload = await response.json()
  if (!isRecord(payload)) {
    throw new Error('本地开发快照格式无效：根对象缺失。')
  }

  if (!('userDetails' in payload) || !('campaignDetails' in payload) || !('formationSaves' in payload)) {
    throw new Error('本地开发快照格式无效：缺少 userDetails/campaignDetails/formationSaves。')
  }

  return {
    userDetails: payload.userDetails,
    campaignDetails: payload.campaignDetails,
    formationSaves: payload.formationSaves,
  }
}

export async function refreshLocalDevPrivateSnapshot(
  fetchImpl: typeof fetch = fetch,
): Promise<string> {
  if (!isLocalDevPrivateSnapshotEnabled()) {
    throw new Error('本地开发快照刷新只允许在 Vite 开发模式中使用。')
  }

  const response = await fetchImpl(LOCAL_DEV_PRIVATE_SNAPSHOT_REFRESH_ENDPOINT, {
    method: 'POST',
    cache: 'no-store',
  })

  if (!response.ok) {
    throw new Error('刷新本地开发快照失败：请检查本机私有凭证、网络或官方接口。')
  }

  const payload = await response.json()
  if (!isRecord(payload)) {
    throw new Error('刷新本地开发快照失败：响应格式无效。')
  }

  const manifest = payload.manifest
  if (!isRecord(manifest)) {
    throw new Error('刷新本地开发快照失败：manifest 缺失。')
  }

  const timestamp = typeof manifest.timestamp === 'string' ? manifest.timestamp : null
  return timestamp
    ? `已刷新本地开发快照（${timestamp}）。浏览器 IndexedDB 未被覆盖。`
    : '已刷新本地开发快照。浏览器 IndexedDB 未被覆盖。'
}
