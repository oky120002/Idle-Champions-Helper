import { FormFieldSchemaRenderer, type FormFieldSchema } from '../../components/FormFieldSchemaRenderer'
import type { UserDataPageModel } from './types'

type UserImportFieldsProps = {
  readonly model: UserDataPageModel
}

export function UserImportFields({ model }: UserImportFieldsProps) {
  const { t, method, supportUrl, manualUserId, manualHash, webRequestLog, updateSupportUrl, updateManualUserId, updateManualHash, updateWebRequestLog } = model

  let fields: FormFieldSchema[]
  if (method === 'supportUrl') {
    fields = [
      {
        kind: 'textarea',
        id: 'support-url',
        inputId: 'user-import-support-url',
        label: 'Support URL',
        hint: t("当前只在浏览器本地解析 `user_id` 和 `device_hash/hash`，不会出站。"),
        placeholder: t("粘贴游戏内 Support 按钮打开后的完整链接。"),
        value: supportUrl,
        onChange: updateSupportUrl,
        rows: 5,
      },
    ]
  } else if (method === 'manual') {
    fields = [
      {
        kind: 'group',
        id: 'manual-fields',
        layout: 'split',
        fields: [
          {
            kind: 'input',
            id: 'manual-user-id',
            inputId: 'user-import-manual-user-id',
            label: 'User ID',
            value: manualUserId,
            onChange: updateManualUserId,
            placeholder: t("例如 123456789"),
            inputMode: 'numeric',
          },
          {
            kind: 'input',
            id: 'manual-hash',
            inputId: 'user-import-manual-hash',
            label: 'Hash',
            value: manualHash,
            onChange: updateManualHash,
            placeholder: t("例如 abcdef1234567890abcdef1234567890"),
          },
        ],
      },
    ]
  } else {
    fields = [
      {
        kind: 'textarea',
        id: 'web-request-log',
        inputId: 'user-import-web-request-log',
        label: t("日志文本"),
        hint: t("当前阶段先支持文本粘贴，避免一上来就把真实文件导入和持久化绑死。"),
        placeholder: t("先粘贴脱敏过的 webRequestLog.txt 片段，后续再接真实文件拖放。"),
        value: webRequestLog,
        onChange: updateWebRequestLog,
        rows: 8,
        inputClassName: 'text-area text-area--tall',
      },
    ]
  }

  return <FormFieldSchemaRenderer fields={fields} className="form-stack" />
}
