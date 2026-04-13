import { SurfaceCard } from '../components/SurfaceCard'

export function PresetsPage() {
  return (
    <div className="page-stack">
      <SurfaceCard
        eyebrow="方案存档"
        title="最近草稿留在阵型页，命名方案再进入这里"
        description="这一页会承接用户主动保存的已命名阵容；阵型页的最近草稿继续走本地自动保存 / 恢复。"
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
              当前先把阵型页的最近草稿闭环跑通；下一步再补命名方案列表、编辑态和本地持久化。
            </p>
          </div>
        </div>
      </SurfaceCard>
    </div>
  )
}
