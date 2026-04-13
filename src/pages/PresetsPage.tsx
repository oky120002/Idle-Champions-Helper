import { useI18n } from '../app/i18n'
import { SurfaceCard } from '../components/SurfaceCard'

export function PresetsPage() {
  const { t } = useI18n()

  return (
    <div className="page-stack">
      <SurfaceCard
        eyebrow={t({ zh: '方案存档', en: 'Presets' })}
        title={t({ zh: '本地优先，后续接 IndexedDB', en: 'Local-first now, IndexedDB next' })}
        description={t({
          zh: '这一页会承接用户保存的阵容、常用筛选和阶段性目标。',
          en: 'This page will hold saved formations, favorite filters, and milestone targets.',
        })}
      >
        <div className="split-grid">
          <div>
            <h3 className="section-heading">{t({ zh: '计划保存的内容', en: 'What will be saved' })}</h3>
            <ul className="bullet-list">
              <li>{t({ zh: '阵容名称与说明', en: 'Preset name and notes' })}</li>
              <li>{t({ zh: '已选英雄与 seat 占用', en: 'Chosen champions and seat usage' })}</li>
              <li>{t({ zh: '目标场景与限制条件', en: 'Target scenario and restrictions' })}</li>
              <li>{t({ zh: '个人备注和优先级', en: 'Personal notes and priority' })}</li>
            </ul>
          </div>

          <div>
            <h3 className="section-heading">{t({ zh: '当前状态', en: 'Current state' })}</h3>
            <p className="supporting-text">
              {t({
                zh: '目前仅保留页面入口与结构约定，等阵型编辑和规则层稳定后再接本地存储。',
                en: 'Right now this is only the entry point and structure. Local storage lands after the formation editor and rule layer settle down.',
              })}
            </p>
          </div>
        </div>
      </SurfaceCard>
    </div>
  )
}
