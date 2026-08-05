import { describe, expect, it } from 'vitest'

import { normalizeOfficialPlayServerBaseUrl } from './official-play-server.ts'

// hostname 校验是 SSRF 防护边界：只允许官方 play server 主机。
// discovery 实际返回的主机名格式会随官方部署演进（曾为 psNN 数字，现为 ps<字母数字> 如 pslt4）。
// 任何放宽必须仍限定 idlechampions.com 域 + ps 前缀，避免被导向非官方地址。

describe('normalizeOfficialPlayServerBaseUrl', () => {
  it('接受旧格式 psNN（纯数字主机名）', () => {
    expect(normalizeOfficialPlayServerBaseUrl('https://ps28.idlechampions.com/~idledragons/'))
      .toBe('https://ps28.idlechampions.com/~idledragons/')
  })

  it('接受新格式 ps<字母数字>（pslt4，discovery 当前实际返回）', () => {
    expect(normalizeOfficialPlayServerBaseUrl('https://pslt4.idlechampions.com/~idledragons/'))
      .toBe('https://pslt4.idlechampions.com/~idledragons/')
  })

  it('补全缺失的尾斜杠', () => {
    expect(normalizeOfficialPlayServerBaseUrl('https://pslt4.idlechampions.com/~idledragons'))
      .toBe('https://pslt4.idlechampions.com/~idledragons/')
  })

  it('拒绝非 idlechampions.com 域（SSRF 防护）', () => expect(() => normalizeOfficialPlayServerBaseUrl('https://evil.example.com/~idledragons/')).toThrow())

  it('拒绝无 ps 前缀的 idlechampions 主机（如 master discovery API）', () => expect(() => normalizeOfficialPlayServerBaseUrl('https://master.idlechampions.com/~idledragons/')).toThrow())

  it('拒绝错误 pathname', () => expect(() => normalizeOfficialPlayServerBaseUrl('https://ps28.idlechampions.com/wrong/')).toThrow())
})
