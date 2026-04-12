import { SurfaceCard } from '../components/SurfaceCard'

const placeholderSlots = Array.from({ length: 10 }, (_, index) => index + 1)

export function FormationPage() {
  return (
    <div className="page-stack">
      <SurfaceCard
        eyebrow="阵型编辑"
        title="先把槽位可视化和规则层边界搭起来"
        description="正式拖拽和 seat 校验还没接入，这一页先把交互舞台留出来。"
      >
        <div className="formation-grid" aria-label="阵型槽位占位图">
          {placeholderSlots.map((slot) => (
            <div key={slot} className="formation-slot">
              <span className="formation-slot__label">槽位 {slot}</span>
              <span className="formation-slot__hint">待接布局</span>
            </div>
          ))}
        </div>
      </SurfaceCard>

      <SurfaceCard
        eyebrow="规则层"
        title="这一页后续会接到 `src/rules/`"
        description="seat 冲突、可放置性判断和限制提示都不应写死在页面组件里。"
      >
        <ul className="bullet-list">
          <li>seat 冲突单独维护</li>
          <li>布局数据来自 `public/data/v1/formations.json`</li>
          <li>页面只负责展示状态和交互结果</li>
        </ul>
      </SurfaceCard>
    </div>
  )
}
