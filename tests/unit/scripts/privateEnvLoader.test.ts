import { describe, expect, it } from 'vitest'
import {
  loadPrivateCredentials,
  parseLocalEnvFile,
} from '../../../scripts/private-user-data/private-env-loader.mjs'

describe('private env loader', () => {
  it('从 process env 读取 IC_PRIVATE_USER_ID 和 IC_PRIVATE_HASH', () => {
    const env = {
      IC_PRIVATE_USER_ID: '12345678',
      IC_PRIVATE_HASH: 'abc123def456789abc123def456789ab',
    }

    const result = loadPrivateCredentials({ env })

    expect(result.userId).toBe('12345678')
    expect(result.hash).toBe('abc123def456789abc123def456789ab')
  })

  it('能解析显式 .local env 文件内容', () => {
    const content = [
      '# development credentials',
      'IC_PRIVATE_USER_ID=99887766',
      'IC_PRIVATE_HASH=deadbeefdeadbeefdeadbeefdeadbeef',
      '',
      'SOME_OTHER_VAR=hello',
    ].join('\n')

    const result = parseLocalEnvFile(content)

    expect(result.IC_PRIVATE_USER_ID).toBe('99887766')
    expect(result.IC_PRIVATE_HASH).toBe('deadbeefdeadbeefdeadbeefdeadbeef')
    expect(result.SOME_OTHER_VAR).toBe('hello')
  })

  it('凭证缺失时安全报错且不打印 secret', () => {
    const env = {}

    const result = loadPrivateCredentials({ env })

    expect(result.error).toBeTruthy()
    expect(result.userId).toBeUndefined()
    expect(result.hash).toBeUndefined()
    if (result.error) {
      expect(result.error).not.toMatch(/12345678/)
      expect(result.error).not.toMatch(/[0-9a-f]{32}/)
    }
  })

  it('拒绝 VITE_ 开头的 key 作为私人凭证', () => {
    const env = {
      VITE_IC_PRIVATE_USER_ID: '12345678',
      VITE_IC_PRIVATE_HASH: 'abc123def456789abc123def456789ab',
    }

    const result = loadPrivateCredentials({ env })

    expect(result.error).toBeTruthy()
    expect(result.error).toContain('VITE_')
  })

  it('支持 .local 文件中的引号值', () => {
    const content = 'IC_PRIVATE_USER_ID="12345678"\nIC_PRIVATE_HASH=\'abc123\''

    const result = parseLocalEnvFile(content)

    expect(result.IC_PRIVATE_USER_ID).toBe('12345678')
    expect(result.IC_PRIVATE_HASH).toBe('abc123')
  })

  it('忽略 .local 文件中的空行和注释', () => {
    const content = [
      '# comment',
      '',
      '  ',
      'IC_PRIVATE_USER_ID=12345678',
    ].join('\n')

    const result = parseLocalEnvFile(content)

    expect(Object.keys(result)).toHaveLength(1)
    expect(result.IC_PRIVATE_USER_ID).toBe('12345678')
  })
})
