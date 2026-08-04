// 中英文统一分词器，供 MiniSearch 在索引与查询时复用（同一分词器保证两侧一致）。
// 占位符已在构建期剥净，运行期只做分词 + 小写。

const segmenter =
  typeof Intl !== 'undefined' && 'Segmenter' in Intl
    ? new Intl.Segmenter('zh-CN', { granularity: 'word' })
    : null

export function tokenize(text: string): string[] {
  if (!text) {
    return []
  }

  if (segmenter) {
    const terms: string[] = []
    for (const segment of segmenter.segment(text)) {
      if (segment.isWordLike === true) {
        terms.push(segment.segment.toLowerCase())
      }
    }
    return terms
  }

  // ponytail: Intl.Segmenter 不可用时的回退，丢 CJK 词边界精度，按字母序列切分。
  const matches = text.toLowerCase().match(/\p{L}+/gu)
  return matches ?? []
}
