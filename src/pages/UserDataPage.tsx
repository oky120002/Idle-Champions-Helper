import { useState } from 'react'
import { SurfaceCard } from '../components/SurfaceCard'
import {
  buildMaskedCredentials,
  getSupportUrlNetwork,
  getImportMethodLabel,
  parseManualCredentials,
  parseSupportUrl,
  parseWebRequestLog,
  SUPPORT_URL_SAMPLE,
  WEB_REQUEST_LOG_SAMPLE,
} from '../data/userImport'
import type { UserCredentials, UserImportMethod } from '../domain/types'

const importMethods: Array<{ id: UserImportMethod; label: string; description: string }> = [
  {
    id: 'supportUrl',
    label: 'Support URL',
    description: '最贴近真实使用方式，适合移动端和大多数平台。',
  },
  {
    id: 'manual',
    label: '手动填写',
    description: '适合已经知道 User ID 和 Hash，但不想贴完整链接的时候。',
  },
  {
    id: 'webRequestLog',
    label: '日志文本',
    description: '后续接 Steam / Epic 本地日志导入时，可以沿用同一套解析逻辑。',
  },
]

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
  const [method, setMethod] = useState<UserImportMethod>('supportUrl')
  const [supportUrl, setSupportUrl] = useState('')
  const [manualUserId, setManualUserId] = useState('')
  const [manualHash, setManualHash] = useState('')
  const [webRequestLog, setWebRequestLog] = useState('')
  const [parseState, setParseState] = useState<ParseState>({ status: 'idle' })

  const selectedMethod = importMethods.find((item) => item.id === method) ?? importMethods[0]
  const maskedCredentials =
    parseState.status === 'success' ? buildMaskedCredentials(parseState.credentials) : null

  function handleParse() {
    const result =
      method === 'supportUrl'
        ? parseSupportUrl(supportUrl)
        : method === 'manual'
          ? parseManualCredentials(manualUserId, manualHash)
          : parseWebRequestLog(webRequestLog)

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
        eyebrow="个人数据"
        title="先把本地导入链路和安全边界立住"
        description="当前这一步只做浏览器内解析和校验，不会联网请求官方接口，也不会把凭证上传到任何地方。"
      >
        <div className="split-grid">
          <div>
            <h3 className="section-heading">当前已经支持的骨架</h3>
            <ul className="bullet-list">
              <li>Support URL 本地解析</li>
              <li>手动输入 User ID + Hash 校验</li>
              <li>日志文本提取 user_id / hash</li>
              <li>脱敏预览结果展示</li>
            </ul>
          </div>

          <div>
            <h3 className="section-heading">当前明确不做</h3>
            <ul className="bullet-list">
              <li>不调用真实账号接口</li>
              <li>不在页面自动持久化敏感凭证</li>
              <li>不上传到你的服务端</li>
              <li>不做隐式后台同步</li>
            </ul>
          </div>
        </div>
      </SurfaceCard>

      <SurfaceCard
        eyebrow="导入工作台"
        title="先在本地浏览器里验证导入方式"
        description={selectedMethod.description}
        footer={
          <div className="button-row">
            <button type="button" className="action-button" onClick={handleParse}>
              读取并校验
            </button>
            <button type="button" className="action-button action-button--secondary" onClick={handleFillSample}>
              填入脱敏示例
            </button>
            <button type="button" className="action-button action-button--ghost" onClick={handleClear}>
              清空当前输入
            </button>
          </div>
        }
      >
        <div className="segmented-control" role="tablist" aria-label="个人数据导入方式">
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
            <label className="form-field">
              <span className="field-label">Support URL</span>
              <textarea
                className="text-area"
                rows={5}
                placeholder="粘贴游戏内 Support 按钮打开后的完整链接。"
                value={supportUrl}
                onChange={(event) => setSupportUrl(event.target.value)}
              />
              <span className="field-hint">
                当前只在浏览器本地解析 `user_id` 和 `device_hash/hash`，不会出站。
              </span>
            </label>
          ) : null}

          {method === 'manual' ? (
            <div className="split-grid">
              <label className="form-field">
                <span className="field-label">User ID</span>
                <input
                  className="text-input"
                  type="text"
                  inputMode="numeric"
                  placeholder="例如 123456789"
                  value={manualUserId}
                  onChange={(event) => setManualUserId(event.target.value)}
                />
              </label>

              <label className="form-field">
                <span className="field-label">Hash</span>
                <input
                  className="text-input"
                  type="text"
                  placeholder="例如 abcdef1234567890abcdef1234567890"
                  value={manualHash}
                  onChange={(event) => setManualHash(event.target.value)}
                />
              </label>
            </div>
          ) : null}

          {method === 'webRequestLog' ? (
            <label className="form-field">
              <span className="field-label">日志文本</span>
              <textarea
                className="text-area text-area--tall"
                rows={8}
                placeholder="先粘贴脱敏过的 webRequestLog.txt 片段，后续再接真实文件拖放。"
                value={webRequestLog}
                onChange={(event) => setWebRequestLog(event.target.value)}
              />
              <span className="field-hint">
                当前阶段先支持文本粘贴，避免一上来就把真实文件导入和持久化绑死。
              </span>
            </label>
          ) : null}
        </div>

        {parseState.status === 'success' ? (
          <div className="status-banner status-banner--success">
            已在本地解析出一组合法凭证，当前页面仅展示脱敏结果，不会自动保存。
          </div>
        ) : null}

        {parseState.status === 'error' ? (
          <div className="status-banner status-banner--error">{parseState.message}</div>
        ) : null}

        {parseState.status === 'idle' ? (
          <div className="status-banner status-banner--info">
            这里适合先用脱敏样本验证格式，再考虑接真实导入和本地同步。
          </div>
        ) : null}

        {parseState.status === 'success' && maskedCredentials ? (
          <div className="preview-grid">
            <article className="preview-card">
              <span className="preview-card__label">导入方式</span>
              <strong className="preview-card__value">{getImportMethodLabel(parseState.method)}</strong>
            </article>
            <article className="preview-card">
              <span className="preview-card__label">脱敏 User ID</span>
              <strong className="preview-card__value">{maskedCredentials.userId}</strong>
            </article>
            <article className="preview-card">
              <span className="preview-card__label">脱敏 Hash</span>
              <strong className="preview-card__value preview-card__value--mono">{maskedCredentials.hash}</strong>
            </article>
            {parseState.method === 'supportUrl' ? (
              <article className="preview-card">
                <span className="preview-card__label">推断 network</span>
                <strong className="preview-card__value">
                  {parseState.network ?? '当前输入未包含 network'}
                </strong>
              </article>
            ) : null}
          </div>
        ) : null}
      </SurfaceCard>

      <SurfaceCard
        eyebrow="下一阶段"
        title="接真实本地同步时，仍然不需要把凭证交给服务端"
        description="后续真正接个人数据，也应该继续沿用 local-first 路线。"
      >
        <ol className="ordered-list">
          <li>浏览器里解析 Support URL / 日志文本，拿到 `user_id + hash`</li>
          <li>前端本地调用 `getPlayServerForDefinitions`、`getuserdetails`、`getcampaigndetails`</li>
          <li>把已归一化的个人数据写入 `IndexedDB`，而不是上传到后端</li>
          <li>页面再消费本地画像做英雄可用性、拥有状态和阵型建议</li>
        </ol>
      </SurfaceCard>
    </div>
  )
}
