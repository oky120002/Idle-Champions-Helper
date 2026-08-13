import type { LocalizedUiText } from './types/common'

/** 把已知单语言源文本（数据源 warning、unsupported signal note 等）包装成双语文案，zh/en 同值；真正的双语翻译留待该数据源层补全。 */
export function asLocalizedUiText(text: string): LocalizedUiText {
  return { zh: text, en: text }
}

/** 按 zh（主语言）去重双语文案；zh/en 一一对应，zh 作 key 即可。 */
export function uniqueLocalizedUiText(items: readonly LocalizedUiText[]): LocalizedUiText[] {
  return [...new Map(items.map((item) => [item.zh, item])).values()]
}
