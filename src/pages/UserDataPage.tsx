import { useMemo, useState } from 'react'
import { useI18n } from '../app/i18n'
import { FieldGroup } from '../components/FieldGroup'
import { StatusBanner } from '../components/StatusBanner'
import { SurfaceCard } from '../components/SurfaceCard'
import {
  buildMaskedCredentials,
  getSupportUrlNetwork,
  parseManualCredentials,
  parseSupportUrl,
  parseWebRequestLog,
  SUPPORT_URL_SAMPLE,
  type UserImportMessages,
  WEB_REQUEST_LOG_SAMPLE,
} from '../data/userImport'
import type { UserCredentials, UserImportMethod } from '../domain/types'

type ParseState =
  | { status: 'idle' }
  | {
      status: 'success'
      credentials: UserCredentials
      method: UserImportMethod
      network: string | null
    }
  | { status: 'error'; message: string }

export function UserDataPage() {
  const { locale, t } = useI18n()
  const [method, setMethod] = useState<UserImportMethod>('supportUrl')
  const [supportUrl, setSupportUrl] = useState('')
  const [manualUserId, setManualUserId] = useState('')
  const [manualHash, setManualHash] = useState('')
  const [webRequestLog, setWebRequestLog] = useState('')
  const [parseState, setParseState] = useState<ParseState>({ status: 'idle' })

  const messages: UserImportMessages = useMemo(
    () => ({
      invalidUserId: t({ zh: 'User ID 格式不对，当前仅接受纯数字。', en: 'User ID must contain digits only.' }),
      invalidHash: t({
        zh: 'Hash 格式不对，当前仅接受十六进制字符串。',
        en: 'Hash must be a hexadecimal string.',
      }),
      missingSupportUrl: t({ zh: '请先粘贴 Support URL。', en: 'Paste a Support URL first.' }),
      invalidSupportUrl: t({ zh: 'Support URL 不是合法链接。', en: 'The Support URL is not a valid link.' }),
      missingManualCredentials: t({
        zh: '请同时填写 User ID 和 Hash。',
        en: 'Fill in both User ID and Hash.',
      }),
      missingLogText: t({ zh: '请先粘贴日志文本。', en: 'Paste the log text first.' }),
      logMissingCredentials: t({
        zh: '没在日志里找到 user_id 和 hash/device_hash。',
        en: 'No user_id and hash/device_hash pair was found in the log.',
      }),
      logIncompleteCredentials: t({
        zh: '日志里提取到的凭证不完整。',
        en: 'The credentials extracted from the log are incomplete.',
      }),
    }),
    [t],
  )

  const importMethods = useMemo(
    () =>
      [
        {
          id: 'supportUrl' as const,
          label: 'Support URL',
          description: t({
            zh: '最贴近真实使用方式，适合移动端和大多数平台。',
            en: 'Closest to the real user flow and a good fit for mobile plus most platforms.',
          }),
        },
        {
          id: 'manual' as const,
          label: t({ zh: '手动填写', en: 'Manual entry' }),
          description: t({
            zh: '适合已经知道 User ID 和 Hash，但不想贴完整链接的时候。',
            en: 'Best when you already know the User ID and Hash and do not want to paste the full link.',
          }),
        },
        {
          id: 'webRequestLog' as const,
          label: t({ zh: '日志文本', en: 'Log text' }),
          description: t({
            zh: '后续接 Steam / Epic 本地日志导入时，可以沿用同一套解析逻辑。',
            en: 'This keeps the parsing model aligned with the future Steam / Epic local log import flow.',
          }),
        },
      ] satisfies Array<{ id: UserImportMethod; label: string; description: string }>,
    [t],
  )

  const importMethodLabels = useMemo(
    () =>
      Object.fromEntries(importMethods.map((item) => [item.id, item.label])) as Record<UserImportMethod, string>,
    [importMethods],
  )

  const selectedMethod = importMethods.find((item) => item.id === method) ?? importMethods[0]
  const maskedCredentials =
    parseState.status === 'success' ? buildMaskedCredentials(parseState.credentials) : null

  function getParseResult() {
    return (
      method === 'supportUrl'
        ? parseSupportUrl(supportUrl, messages)
        : method === 'manual'
          ? parseManualCredentials(manualUserId, manualHash, messages)
          : parseWebRequestLog(webRequestLog, messages)
    )
  }

  function handleParse() {
    const result = getParseResult()

    if (result.ok) {
      setParseState({
        status: 'success',
        credentials: result.value,
        method,
        network: method === 'supportUrl' ? getSupportUrlNetwork(supportUrl) : null,
      })
      return
    }

    setParseState({
      status: 'error',
      message: result.error,
    })
  }

  function handleFillSample() {
    if (method === 'supportUrl') {
      setSupportUrl(SUPPORT_URL_SAMPLE)
      return
    }

    if (method === 'manual') {
      setManualUserId('123456789')
      setManualHash('abcdef1234567890abcdef1234567890')
      return
    }

    setWebRequestLog(WEB_REQUEST_LOG_SAMPLE)
  }

  function handleClear() {
    if (method === 'supportUrl') {
      setSupportUrl('')
    } else if (method === 'manual') {
      setManualUserId('')
      setManualHash('')
    } else {
      setWebRequestLog('')
    }

    setParseState({ status: 'idle' })
  }

  function handleSelectMethod(nextMethod: UserImportMethod) {
    setMethod(nextMethod)
    setParseState({ status: 'idle' })
  }

  return (
    <div className="page-stack">
      <SurfaceCard
        eyebrow={t({ zh: '个人数据', en: 'User data' })}
        title={t({
          zh: '先把本地导入链路和安全边界立住',
          en: 'Establish the local import flow and safety boundary first',
        })}
        description={t({
          zh: '当前这一步只做浏览器内解析和校验，不会联网请求官方接口，也不会把凭证上传到任何地方。',
          en: 'This step only parses and validates inside the browser. It does not call official endpoints or upload credentials anywhere.',
        })}
      >
        <div className="split-grid">
          <div>
            <h3 className="section-heading">{t({ zh: '当前已经支持的骨架', en: 'What already exists' })}</h3>
            <ul className="bullet-list">
              <li>{t({ zh: 'Support URL 本地解析', en: 'Local Support URL parsing' })}</li>
              <li>{t({ zh: '手动输入 User ID + Hash 校验', en: 'Manual User ID + Hash validation' })}</li>
              <li>{t({ zh: '日志文本提取 user_id / hash', en: 'Extracting user_id / hash from log text' })}</li>
              <li>{t({ zh: '脱敏预览结果展示', en: 'Masked preview output' })}</li>
            </ul>
          </div>

          <div>
            <h3 className="section-heading">{t({ zh: '当前明确不做', en: 'What it explicitly does not do' })}</h3>
            <ul className="bullet-list">
              <li>{t({ zh: '不调用真实账号接口', en: 'No live account API calls' })}</li>
              <li>{t({ zh: '不在页面自动持久化敏感凭证', en: 'No automatic persistence of sensitive credentials' })}</li>
              <li>{t({ zh: '不上传到你的服务端', en: 'No upload to your server' })}</li>
              <li>{t({ zh: '不做隐式后台同步', en: 'No implicit background sync' })}</li>
            </ul>
          </div>
        </div>
      </SurfaceCard>

      <SurfaceCard
        eyebrow={t({ zh: '导入工作台', en: 'Import workbench' })}
        title={t({
          zh: '先在本地浏览器里验证导入方式',
          en: 'Validate import modes inside the local browser first',
        })}
        description={selectedMethod.description}
        footer={
          <div className="button-row">
            <button type="button" className="action-button" onClick={handleParse}>
              {t({ zh: '读取并校验', en: 'Parse and validate' })}
            </button>
            <button type="button" className="action-button action-button--secondary" onClick={handleFillSample}>
              {t({ zh: '填入脱敏示例', en: 'Fill sample input' })}
            </button>
            <button type="button" className="action-button action-button--ghost" onClick={handleClear}>
              {t({ zh: '清空当前输入', en: 'Clear current input' })}
            </button>
          </div>
        }
      >
        <div
          className="segmented-control"
          role="tablist"
          aria-label={t({ zh: '个人数据导入方式', en: 'User data import mode' })}
        >
          {importMethods.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={item.id === method}
              className={
                item.id === method
                  ? 'segmented-control__button segmented-control__button--active'
                  : 'segmented-control__button'
              }
              onClick={() => handleSelectMethod(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>

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
                onChange={(event) => setSupportUrl(event.target.value)}
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
                  onChange={(event) => setManualUserId(event.target.value)}
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
                  onChange={(event) => setManualHash(event.target.value)}
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
                onChange={(event) => setWebRequestLog(event.target.value)}
              />
            </FieldGroup>
          ) : null}
        </div>

        {parseState.status === 'success' ? (
          <StatusBanner tone="success">
            {t({
              zh: '已在本地解析出一组合法凭证，当前页面仅展示脱敏结果，不会自动保存。',
              en: 'A valid credential pair was parsed locally. This page only shows the masked result and does not save it automatically.',
            })}
          </StatusBanner>
        ) : null}

        {parseState.status === 'error' ? <StatusBanner tone="error">{parseState.message}</StatusBanner> : null}

        {parseState.status === 'idle' ? (
          <StatusBanner tone="info">
            {t({
              zh: '这里适合先用脱敏样本验证格式，再考虑接真实导入和本地同步。',
              en: 'Use masked samples here to validate the format first, then move on to real imports and local sync.',
            })}
          </StatusBanner>
        ) : null}

        {parseState.status === 'success' && maskedCredentials ? (
          <div className="preview-grid">
            <article className="preview-card">
              <span className="preview-card__label">{t({ zh: '导入方式', en: 'Import mode' })}</span>
              <strong className="preview-card__value">{importMethodLabels[parseState.method]}</strong>
            </article>
            <article className="preview-card">
              <span className="preview-card__label">
                {locale === 'zh-CN' ? '脱敏 User ID' : 'Masked User ID'}
              </span>
              <strong className="preview-card__value">{maskedCredentials.userId}</strong>
            </article>
            <article className="preview-card">
              <span className="preview-card__label">{locale === 'zh-CN' ? '脱敏 Hash' : 'Masked Hash'}</span>
              <strong className="preview-card__value preview-card__value--mono">{maskedCredentials.hash}</strong>
            </article>
            {parseState.method === 'supportUrl' ? (
              <article className="preview-card">
                <span className="preview-card__label">{t({ zh: '推断 network', en: 'Detected network' })}</span>
                <strong className="preview-card__value">
                  {parseState.network ?? t({ zh: '当前输入未包含 network', en: 'No network value found in the input' })}
                </strong>
              </article>
            ) : null}
          </div>
        ) : null}
      </SurfaceCard>

      <SurfaceCard
        eyebrow={t({ zh: '下一阶段', en: 'Next stage' })}
        title={t({
          zh: '接真实本地同步时，仍然不需要把凭证交给服务端',
          en: 'Even with real local sync, credentials still never need to touch a server',
        })}
        description={t({
          zh: '后续真正接个人数据，也应该继续沿用 local-first 路线。',
          en: 'When personal data gets wired in for real, it should still stay on a local-first path.',
        })}
      >
        <ol className="ordered-list">
          <li>{t({ zh: '浏览器里解析 Support URL / 日志文本，拿到 `user_id + hash`', en: 'Parse the Support URL / log text in the browser to get `user_id + hash`' })}</li>
          <li>{t({ zh: '前端本地调用 `getPlayServerForDefinitions`、`getuserdetails`、`getcampaigndetails`', en: 'Call `getPlayServerForDefinitions`, `getuserdetails`, and `getcampaigndetails` locally from the frontend' })}</li>
          <li>{t({ zh: '把已归一化的个人数据写入 `IndexedDB`，而不是上传到后端', en: 'Write normalized personal data to `IndexedDB` instead of uploading it to a backend' })}</li>
          <li>{t({ zh: '页面再消费本地画像做英雄可用性、拥有状态和阵型建议', en: 'Let the UI consume the local profile for availability, ownership state, and formation suggestions' })}</li>
        </ol>
      </SurfaceCard>
    </div>
  )
}
