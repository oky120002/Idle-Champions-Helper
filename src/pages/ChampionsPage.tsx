import { SurfaceCard } from '../components/SurfaceCard'

export function ChampionsPage() {
  return (
    <div className="page-stack">
      <SurfaceCard
        eyebrow="英雄筛选"
        title="先把过滤维度和结果结构定义清楚"
        description="这一页会成为第一阶段最常用的入口之一。"
      >
        <div className="split-grid">
          <div>
            <h3 className="section-heading">计划支持的筛选维度</h3>
            <ul className="bullet-list">
              <li>座位冲突</li>
              <li>定位与标签</li>
              <li>Patron / Variant 限制</li>
              <li>阵营、种族、联动队伍</li>
              <li>个人拥有状态（后续接入）</li>
            </ul>
          </div>

          <div>
            <h3 className="section-heading">当前状态</h3>
            <p className="supporting-text">
              目前页面先保留结构，等第一版 `champions.json` 和规则表达落地后，再接真正的筛选面板与结果列表。
            </p>
          </div>
        </div>
      </SurfaceCard>
    </div>
  )
}
