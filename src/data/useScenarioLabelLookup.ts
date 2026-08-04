import { useCallback, useEffect, useState } from 'react'
import { useI18n } from '../app/i18n'
import { buildScenarioLabelLookup, formatScenarioRefLabel, type ScenarioLabelLookup } from '../domain/scenarioRefLabel'
import type { Adventure, LocalizedOption, ScenarioRef, Variant } from '../domain/types'
import { loadCollection } from './client'

// enums.json campaigns 组：{ id: 'campaigns', values: LocalizedOption[] }
interface EnumGroup {
  id: string
  values?: LocalizedOption[]
}

// 模块级缓存：variants/adventures/enums 是参考数据（与版本无关），全站只加载一次。
// 多个 PresetCard 实例共享同一 Promise，避免 N 个卡片各触发一次加载。
let cachedLookup: Promise<ScenarioLabelLookup> | null = null

function loadScenarioLabelLookup(): Promise<ScenarioLabelLookup> {
  if (cachedLookup === null) {
    cachedLookup = Promise.all([
      loadCollection<Variant>('variants'),
      loadCollection<Adventure>('adventures'),
      loadCollection<EnumGroup>('enums'),
    ])
      .then(([variantCol, adventureCol, enumCol]) => {
        const campaigns = enumCol.items.find((item) => item.id === 'campaigns')?.values ?? []
        return buildScenarioLabelLookup(variantCol.items, adventureCol.items, campaigns)
      })
      .catch(() => {
        // 加载失败（离线/集合缺失/测试 mock 未覆盖）→ 回退空表，调用方降级显示原始 kind:id。
        // 不缓存 rejected promise：清缓存使后续重试有机会成功。
        cachedLookup = null
        return buildScenarioLabelLookup([], [], [])
      })
  }
  return cachedLookup
}

/**
 * 加载 scenarioRef 友好名查找表（模块缓存），返回按当前 locale 格式化的 label 函数。
 * lookup 未就绪时返回 null（调用方可显示回退占位）。供 PresetCard / FormationPresetCard
 * 把 scenarioRef 从原始 `${kind}:${id}` 渲染为玩家可读场景名。
 */
export function useScenarioLabelLookup(): (ref: ScenarioRef) => string | null {
  const { locale } = useI18n()
  const [lookup, setLookup] = useState<ScenarioLabelLookup | null>(null)

  useEffect(() => {
    let disposed = false
    // ponytail: loadScenarioLabelLookup 内部已 .catch 回退空表，此处 fire-and-forget；
    // void 显式标记不等待，满足 no-floating-promises。
    void loadScenarioLabelLookup().then((loaded) => {
      if (!disposed) {
        setLookup(loaded)
      }
    })
    return () => {
      disposed = true
    }
  }, [])

  return useCallback(
    (ref: ScenarioRef) => (lookup ? formatScenarioRefLabel(ref, lookup, locale) : null),
    [lookup, locale],
  )
}
