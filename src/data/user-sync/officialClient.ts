const ALLOWED_ENDPOINTS = new Set([
  'getuserdetails',
  'getcampaigndetails',
  'getallformationsaves',
])

export function isAllowedEndpoint(endpoint: string): boolean {
  return ALLOWED_ENDPOINTS.has(endpoint)
}

export function buildOfficialUrl(
  endpoint: string,
  credentials: { userId: string; hash: string },
): string {
  if (!isAllowedEndpoint(endpoint)) {
    throw new Error(
      `Endpoint "${endpoint}" is not allowed. Only read-only endpoints are permitted.`,
    )
  }

  const params = new URLSearchParams({
    user_id: credentials.userId,
    hash: credentials.hash,
  })

  return `https://www.idlechampions.com/idlechampions/api/v1/${endpoint}?${params.toString()}`
}

export function createReadonlyFetchOptions(): RequestInit {
  return {
    credentials: 'omit',
    cache: 'no-store',
    referrerPolicy: 'no-referrer',
  }
}
