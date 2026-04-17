import { SurfaceCard } from '../../components/SurfaceCard'
import type { UserDataPageModel } from './types'

type UserDataIntroCardProps = {
  model: UserDataPageModel
}

export function UserDataIntroCard({ model }: UserDataIntroCardProps) {
  const { t } = model

  return (
    <SurfaceCard
      eyebrow={t({ zh: '个人数据', en: 'User data' })}
      title={t({ zh: '先把本地导入链路和安全边界立住', en: 'Establish the local import flow and safety boundary first' })}
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
  )
}
