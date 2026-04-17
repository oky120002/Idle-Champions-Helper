import { StatusBanner } from '../../components/StatusBanner'
import type { UserDataPageModel } from './types'

type UserImportResultPanelProps = {
  model: UserDataPageModel
}

export function UserImportResultPanel({ model }: UserImportResultPanelProps) {
  const { locale, t, parseState, importMethodLabels, maskedCredentials } = model

  return (
    <>
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
            <span className="preview-card__label">{locale === 'zh-CN' ? '脱敏 User ID' : 'Masked User ID'}</span>
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
    </>
  )
}
