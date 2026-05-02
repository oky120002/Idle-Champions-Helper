import { describe, expect, it } from 'vitest'
import {
  createManifest,
  writeManifest,
} from '../../../scripts/private-user-data/private-snapshot-manifest.mjs'

describe('private snapshot manifest', () => {
  it('输出路径位于 tmp/private-user-data/<timestamp>/', () => {
    const manifest = createManifest({
      payloadName: 'profile-2026-05-03.json',
      userId: '12345678',
      hash: 'abc123def456789abc123def456789ab',
    })

    expect(manifest.outputDir).toMatch(/^tmp[/\\]private-user-data[/\\]\d{4}-\d{2}-\d{2}T/)
    expect(manifest.outputDir).toContain('tmp/private-user-data/')
  })

  it('序列化时遮蔽 user id 和 hash', () => {
    const manifest = createManifest({
      payloadName: 'profile.json',
      userId: '12345678',
      hash: 'abc123def456789abc123def456789ab',
    })

    const serialized = JSON.stringify(manifest)

    expect(serialized).not.toContain('12345678')
    expect(serialized).not.toContain('abc123def456789abc123def456789ab')
    expect(manifest.maskedUserId).toBe('****5678')
    expect(manifest.maskedHash).toBe('****89ab')
  })

  it('拒绝 tmp/private-user-data 之外的目标路径', () => {
    expect(() =>
      writeManifest({
        targetDir: 'src/data/snapshots',
        manifest: {},
      }),
    ).toThrow(/tmp[/\\]private-user-data/)
  })

  it('拒绝空路径', () => {
    expect(() =>
      writeManifest({
        targetDir: '',
        manifest: {},
      }),
    ).toThrow()
  })

  it('manifest 包含 payload 名称和时间戳', () => {
    const manifest = createManifest({
      payloadName: 'profile.json',
      userId: '99999999',
      hash: '00000000000000000000000000000000',
    })

    expect(manifest.payloadName).toBe('profile.json')
    expect(manifest.timestamp).toBeTruthy()
    expect(typeof manifest.timestamp).toBe('string')
  })
})
