import type { BuildUserProfileSnapshotInput } from './userProfileNormalizer'

const LOCAL_DEV_PRIVATE_SNAPSHOT_ENDPOINT = '/__dev/private-user-data/user-profile-payloads'

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
