export type UserImportMethod = 'supportUrl' | 'manual' | 'webRequestLog'

export interface UserCredentials {
  userId: string
  hash: string
}

export interface MaskedUserCredentials {
  userId: string
  hash: string
}

export type UserImportParseResult =
  | {
      ok: true
      value: UserCredentials
    }
  | {
      ok: false
      error: string
    }
