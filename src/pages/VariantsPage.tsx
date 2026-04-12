import { SurfaceCard } from '../components/SurfaceCard'

export function VariantsPage() {
  return (
    <div className="page-stack">
      <SurfaceCard
        eyebrow="变体限制"
        title="把“限制条件”从页面文案提升为结构化规则"
        description="这一页的核心不是展示长文字，而是明确哪些限制要进入统一规则层。"
      >
        <div className="split-grid">
          <div>
            <h3 className="section-heading">需要结构化的字段</h3>
            <ul className="bullet-list">
              <li>可用英雄限制</li>
              <li>不可用英雄限制</li>
              <li>阵营、种族、职业、阵位条件</li>
              <li>奖励与解锁关系</li>
              <li>对应阵型布局</li>
            </ul>
          </div>

          <div>
            <h3 className="section-heading">当前状态</h3>
            <p className="supporting-text">
              这一页后续会优先服务“我现在这个限制到底能上谁、缺什么、怎么组”的决策场景。
            </p>
          </div>
        </div>
      </SurfaceCard>
    </div>
  )
}
