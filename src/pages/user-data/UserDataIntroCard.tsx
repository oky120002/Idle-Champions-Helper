import { SurfaceCard } from '../../components/SurfaceCard'
import type { UserDataPageModel } from './types'

type UserDataIntroCardProps = {
  model: UserDataPageModel
}

export function UserDataIntroCard({ model }: UserDataIntroCardProps) {
  const { t } = model

  return (
    <SurfaceCard
      eyebrow={t({ zh: '导入边界', en: 'Import boundary' })}
      title={t({ zh: '先把本地优先的数据导入骨架搭稳', en: 'Stabilize the local-first import skeleton first' })}
      description={t({ zh: '这一页先验证浏览器内可完成的解析与脱敏预览，不把敏感凭证带到站外。', en: 'This page validates browser-side parsing and masked previews first so sensitive credentials never need to leave the local app.' })}
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
