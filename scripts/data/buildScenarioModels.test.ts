import { describe, expect, it } from 'vitest'

import { buildOfficialScenarioModel } from './buildScenarioModels'

describe('buildOfficialScenarioModel', () => {
  it('保留多行 restriction 的可翻译 warning 参数', () => {
    const model = buildOfficialScenarioModel(
      {
        id: 'variant-1',
        name: { original: 'Test', display: '测试' },
        restrictions: [{
          original: 'Every area has a special rule.\r\nOnly test heroes may be used.',
          display: '每个区域都有特殊规则。\r\n仅测试英雄可用。',
        }],
        forcedHeroIds: [],
        enemyTypes: [],
        allowedHeroIds: [],
        allowedTagExpression: [],
        mechanics: [],
      },
      [],
      new Map(),
    )

    expect(model.scenarioWarnings).toEqual(expect.arrayContaining([{
      key: '未解析 restriction：{p0}（含特殊机制，请人工评估对阵型的影响）',
      params: { p0: 'Every area has a special rule.\r\nOnly test heroes may be used.' },
    }]))
  })
})
