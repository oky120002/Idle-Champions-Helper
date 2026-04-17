import { FieldGroup } from '../../components/FieldGroup'
import type { UserDataPageModel } from './types'

type UserImportFieldsProps = {
  model: UserDataPageModel
}

export function UserImportFields({ model }: UserImportFieldsProps) {
  const { t, method, supportUrl, manualUserId, manualHash, webRequestLog, updateSupportUrl, updateManualUserId, updateManualHash, updateWebRequestLog } = model

  return (
    <div className="form-stack">
      {method === 'supportUrl' ? (
        <FieldGroup
          label="Support URL"
          hint={t({
            zh: '当前只在浏览器本地解析 `user_id` 和 `device_hash/hash`，不会出站。',
            en: 'This only extracts `user_id` and `device_hash/hash` locally in the browser. Nothing is sent out.',
          })}
          as="label"
        >
          <textarea
            className="text-area"
            rows={5}
            placeholder={t({
              zh: '粘贴游戏内 Support 按钮打开后的完整链接。',
              en: 'Paste the full link opened from the in-game Support button.',
            })}
            value={supportUrl}
            onChange={(event) => updateSupportUrl(event.target.value)}
          />
        </FieldGroup>
      ) : null}

      {method === 'manual' ? (
        <div className="split-grid">
          <FieldGroup label="User ID" as="label">
            <input
              className="text-input"
              type="text"
              inputMode="numeric"
              placeholder={t({ zh: '例如 123456789', en: 'Example 123456789' })}
              value={manualUserId}
              onChange={(event) => updateManualUserId(event.target.value)}
            />
          </FieldGroup>

          <FieldGroup label="Hash" as="label">
            <input
              className="text-input"
              type="text"
              placeholder={t({
                zh: '例如 abcdef1234567890abcdef1234567890',
                en: 'Example abcdef1234567890abcdef1234567890',
              })}
              value={manualHash}
              onChange={(event) => updateManualHash(event.target.value)}
            />
          </FieldGroup>
        </div>
      ) : null}

      {method === 'webRequestLog' ? (
        <FieldGroup
          label={t({ zh: '日志文本', en: 'Log text' })}
          hint={t({
            zh: '当前阶段先支持文本粘贴，避免一上来就把真实文件导入和持久化绑死。',
            en: 'Text paste comes first so file import and persistence do not get coupled too early.',
          })}
          as="label"
        >
          <textarea
            className="text-area text-area--tall"
            rows={8}
            placeholder={t({
              zh: '先粘贴脱敏过的 webRequestLog.txt 片段，后续再接真实文件拖放。',
              en: 'Paste a redacted `webRequestLog.txt` snippet first. Real file drag-and-drop can come later.',
            })}
            value={webRequestLog}
            onChange={(event) => updateWebRequestLog(event.target.value)}
          />
        </FieldGroup>
      ) : null}
    </div>
  )
}
