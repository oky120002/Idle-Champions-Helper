import { FormFieldSchemaRenderer, type FormFieldSchema } from '../../components/FormFieldSchemaRenderer'
import type { UserDataPageModel } from './types'

type UserImportFieldsProps = {
  model: UserDataPageModel
}

export function UserImportFields({ model }: UserImportFieldsProps) {
  const { t, method, supportUrl, manualUserId, manualHash, webRequestLog, updateSupportUrl, updateManualUserId, updateManualHash, updateWebRequestLog } = model
  const fields: FormFieldSchema[] =
    method === 'supportUrl'
      ? [
          {
            kind: 'textarea',
            id: 'support-url',
            inputId: 'user-import-support-url',
            label: 'Support URL',
            hint: t({
              zh: '当前只在浏览器本地解析 `user_id` 和 `device_hash/hash`，不会出站。',
              en: 'This only extracts `user_id` and `device_hash/hash` locally in the browser. Nothing is sent out.',
            }),
            placeholder: t({
              zh: '粘贴游戏内 Support 按钮打开后的完整链接。',
              en: 'Paste the full link opened from the in-game Support button.',
            }),
            value: supportUrl,
            onChange: updateSupportUrl,
            rows: 5,
          },
        ]
      : method === 'manual'
        ? [
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
                  placeholder: t({ zh: '例如 123456789', en: 'Example 123456789' }),
                  inputMode: 'numeric',
                },
                {
                  kind: 'input',
                  id: 'manual-hash',
                  inputId: 'user-import-manual-hash',
                  label: 'Hash',
                  value: manualHash,
                  onChange: updateManualHash,
                  placeholder: t({
                    zh: '例如 abcdef1234567890abcdef1234567890',
                    en: 'Example abcdef1234567890abcdef1234567890',
                  }),
                },
              ],
            },
          ]
        : [
            {
              kind: 'textarea',
              id: 'web-request-log',
              inputId: 'user-import-web-request-log',
              label: t({ zh: '日志文本', en: 'Log text' }),
              hint: t({
                zh: '当前阶段先支持文本粘贴，避免一上来就把真实文件导入和持久化绑死。',
                en: 'Text paste comes first so file import and persistence do not get coupled too early.',
              }),
              placeholder: t({
                zh: '先粘贴脱敏过的 webRequestLog.txt 片段，后续再接真实文件拖放。',
                en: 'Paste a redacted `webRequestLog.txt` snippet first. Real file drag-and-drop can come later.',
              }),
              value: webRequestLog,
              onChange: updateWebRequestLog,
              rows: 8,
              inputClassName: 'text-area text-area--tall',
            },
          ]

  return <FormFieldSchemaRenderer fields={fields} className="form-stack" />
}
