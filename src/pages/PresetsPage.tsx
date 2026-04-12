import { SurfaceCard } from '../components/SurfaceCard'

export function PresetsPage() {
  return (
    <div className="page-stack">
      <SurfaceCard
        eyebrow="方案存档"
        title="本地优先，后续接 IndexedDB"
        description="这一页会承接用户保存的阵容、常用筛选和阶段性目标。"
      >
        <div className="split-grid">
          <div>
            <h3 className="section-heading">计划保存的内容</h3>
            <ul className="bullet-list">
              <li>阵容名称与说明</li>
              <li>已选英雄与 seat 占用</li>
              <li>目标场景与限制条件</li>
              <li>个人备注和优先级</li>
            </ul>
          </div>

          <div>
            <h3 className="section-heading">当前状态</h3>
            <p className="supporting-text">
              目前仅保留页面入口与结构约定，等阵型编辑和规则层稳定后再接本地存储。
            </p>
          </div>
        </div>
      </SurfaceCard>
    </div>
  )
}
