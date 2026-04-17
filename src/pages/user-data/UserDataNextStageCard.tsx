import { SurfaceCard } from '../../components/SurfaceCard'
import type { UserDataPageModel } from './types'

type UserDataNextStageCardProps = {
  model: UserDataPageModel
}

export function UserDataNextStageCard({ model }: UserDataNextStageCardProps) {
  const { t } = model

  return (
    <SurfaceCard
      eyebrow={t({ zh: '下一阶段', en: 'Next stage' })}
      title={t({
        zh: '接真实本地同步时，也不要让静态站直连官方接口',
        en: 'Keep official endpoints out of the static site even when local sync grows up',
      })}
      description={t({
        zh: '后续真正接个人数据，也应该继续沿用 local-first + 用户主动导入，不把官方请求链路放进静态站。',
        en: 'When personal data gets wired in for real, it should still stay local-first and user-imported instead of embedding official request flows in the static site.',
      })}
    >
      <ol className="ordered-list">
        <li>{t({ zh: '浏览器里解析 Support URL / 日志文本，拿到 `user_id + hash`', en: 'Parse the Support URL / log text in the browser to get `user_id + hash`' })}</li>
        <li>{t({ zh: '继续扩展用户主动提供的本地导入源，例如脱敏日志片段、离线导出文本或手动补充字段', en: 'Expand only user-provided local inputs such as redacted log snippets, offline exports, or manual field entry' })}</li>
        <li>{t({ zh: '把已归一化的个人数据写入 `IndexedDB`，而不是上传到后端', en: 'Write normalized personal data to `IndexedDB` instead of uploading it to a backend' })}</li>
        <li>{t({ zh: '页面再消费本地画像做英雄可用性、拥有状态和阵型建议', en: 'Let the UI consume the local profile for availability, ownership state, and formation suggestions' })}</li>
      </ol>
    </SurfaceCard>
  )
}
