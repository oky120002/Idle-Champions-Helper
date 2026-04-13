import { describe, expect, it } from 'vitest'
import {
  buildMaskedCredentials,
  getSupportUrlNetwork,
  parseSupportUrl,
  parseWebRequestLog,
} from '../../../src/data/userImport'

describe('userImport helpers', () => {
  it('从 Support URL 提取合法凭证与 network', () => {
    const url =
      'https://help.idlechampions.com/?page=help&network=mobile&user_id=123456789&device_hash=ABCDEF1234567890'

    expect(parseSupportUrl(url)).toEqual({
      ok: true,
      value: {
        userId: '123456789',
        hash: 'abcdef1234567890',
      },
    })
    expect(getSupportUrlNetwork(url)).toBe('mobile')
  })

  it('从日志文本提取凭证并生成脱敏预览', () => {
    const result = parseWebRequestLog(
      'POST /?hash=abcdef1234567890abcdef1234567890&user_id=123456789 HTTP/1.1',
    )

    expect(result).toEqual({
      ok: true,
      value: {
        userId: '123456789',
        hash: 'abcdef1234567890abcdef1234567890',
      },
    })

    if (!result.ok) {
      throw new Error('期望日志文本解析成功。')
    }

    expect(buildMaskedCredentials(result.value)).toEqual({
      userId: '12***89',
      hash: 'abcdef***7890',
    })
  })
})
