import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { describe, expect, it } from 'vitest'
import type { ChampionDetail } from '../../domain/types'
import { buildAttackLabelById, buildEffectContext, buildUpgradeLabelById } from './detail-derived-context'
import { buildUpgradePresentation } from './effect-model'

// 游戏数据占位符固定格式，输入来自打包后的 champion-details JSON，无对抗输入
// eslint-disable-next-line sonarjs/super-linear-regex, sonarjs/regex-complexity
const UNRESOLVED_PATTERN = /\{[^}]+\}(?:#[0-9a-f]+)?|\[#\d+[A-Z]?\]|\$\(|\$[a-z_]\w*(?:___\d+)?|\b该值\b|\bvalue\b/iu

function loadChampionDetails(): ChampionDetail[] {
  const detailDir = path.resolve(process.cwd(), 'public/data/v1/champion-details')

  return readdirSync(detailDir)
    .filter((file) => file.endsWith('.json'))
    .map((file) => JSON.parse(readFileSync(path.join(detailDir, file), 'utf8')) as ChampionDetail)
}

describe('champion detail effect audit', () => {
  it('专精与能力说明中不再残留已知占位符模式', () => {
    const failures: string[] = []

    for (const detail of loadChampionDetails()) {
      const attackLabelById = buildAttackLabelById(detail, 'zh-CN')
      const upgradeLabelById = buildUpgradeLabelById(detail, 'zh-CN', attackLabelById)
      const effectContext = buildEffectContext(detail, 'zh-CN', attackLabelById, upgradeLabelById)

      if (!effectContext) {
        continue
      }

      for (const upgrade of detail.upgrades) {
        const presentation = buildUpgradePresentation(upgrade, effectContext)
        const lines = [presentation.summary, ...presentation.detailLines].filter((value): value is string => Boolean(value))

        for (const line of lines) {
          if (UNRESOLVED_PATTERN.test(line)) {
            failures.push(`${detail.summary.id}:${upgrade.id}:${line}`)
          }
        }
      }
    }

    expect(failures.slice(0, 20)).toEqual([])
  })
})
