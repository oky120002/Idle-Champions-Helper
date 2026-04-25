import { LabeledValueCardGrid } from '../../components/LabeledValueCardGrid'
import { StatusBannerStack, type StatusBannerStackItem } from '../../components/StatusBannerStack'
import { createExclusiveStatusBannerItems } from '../../components/statusBannerStackItemBuilders'
import type { UserDataPageModel } from './types'

type UserImportResultPanelProps = {
  model: UserDataPageModel
}

export function UserImportResultPanel({ model }: UserImportResultPanelProps) {
  const { locale, t, parseState, importMethodLabels, maskedCredentials } = model
  const statusItems: StatusBannerStackItem[] = createExclusiveStatusBannerItems({
    status: parseState.status,
    items: [
      {
        id: 'success',
        when: 'success',
        tone: 'success',
        children: t({
          zh: '已在本地解析出一组合法凭证，当前页面仅展示脱敏结果，不会自动保存。',
          en: 'A valid credential pair was parsed locally. This page only shows the masked result and does not save it automatically.',
        }),
      },
      {
        id: 'error',
        when: 'error',
        tone: 'error',
        ...(parseState.status === 'error' ? { children: parseState.message } : {}),
      },
      {
        id: 'idle',
        when: 'idle',
        tone: 'info',
        children: t({
          zh: '这里适合先用脱敏样本验证格式，再考虑接真实导入和本地同步。',
          en: 'Use masked samples here to validate the format first, then move on to real imports and local sync.',
        }),
      },
    ],
  })
  const previewItems = parseState.status === 'success' && maskedCredentials
    ? [
        {
          id: 'import-mode',
          label: t({ zh: '导入方式', en: 'Import mode' }),
          value: importMethodLabels[parseState.method],
        },
        {
          id: 'masked-user-id',
          label: locale === 'zh-CN' ? '脱敏 User ID' : 'Masked User ID',
          value: maskedCredentials.userId,
        },
        {
          id: 'masked-hash',
          label: locale === 'zh-CN' ? '脱敏 Hash' : 'Masked Hash',
          value: maskedCredentials.hash,
          valueClassName: 'preview-card__value--mono',
        },
        ...(parseState.method === 'supportUrl'
          ? [{
              id: 'detected-network',
              label: t({ zh: '推断 network', en: 'Detected network' }),
              value: parseState.network ?? t({ zh: '当前输入未包含 network', en: 'No network value found in the input' }),
            }]
          : []),
      ]
    : []

  return (
    <>
      <StatusBannerStack items={statusItems} />

      {parseState.status === 'success' && maskedCredentials ? (
        <LabeledValueCardGrid
          items={previewItems}
          gridClassName="preview-grid"
          cardClassName="preview-card"
          labelClassName="preview-card__label"
          valueClassName="preview-card__value"
        />
      ) : null}
    </>
  )
}
