import type { CSSProperties, DragEvent, ReactNode } from 'react'
import { Crown } from 'lucide-react'
import { ChampionAvatar } from '../../components/ChampionAvatar'
import { useI18n } from '../../app/i18n'
import type { Champion, FormationSlot } from '../../domain/types'

/**
 * 阵型棋盘纯渲染（阶段 15.1 抽取）。
 *
 * 只负责格子布局 + 已放置英雄头像/seat/carry 标记；交互控件（select/tap-target/拖放）
 * 由调用方经 `slotExtras` 注入，使 formation 编辑器与 planner 结果卡片共用同一棋盘。
 * planner 结果卡片只读使用（只传 slots/placements/championById/carrySlotId）。
 */
export interface FormationBoardCanvasProps {
  slots: FormationSlot[]
  placements: Record<string, string>
  championById: Map<string, Champion>
  /** 核心输出位所在槽位 id；命中则高亮该格并显示 carry 标记。 */
  carrySlotId?: string | null
  boardStyle?: CSSProperties | undefined
  testId?: string
  /** 空槽位占位节点（formation 编辑器用 Plus 图标，planner 默认空）。 */
  emptyIndicator?: ReactNode
  /** 每槽位的额外交互控件（tap-target/select/拖放），渲染在 summary 之后。 */
  slotExtras?: (slot: FormationSlot, champion: Champion | null) => ReactNode
  /** 每槽位追加的 className（conflict/active 等状态修饰）。 */
  slotClassName?: (slot: FormationSlot, champion: Champion | null) => string | undefined
  /** 阶段 16.2：槽位 drop 回调（HTML5 DnD）；planner 只读棋盘不传。 */
  onSlotDrop?: (slotId: string, event: DragEvent<HTMLDivElement>) => void
}

export function FormationBoardCanvas({
  slots,
  placements,
  championById,
  carrySlotId = null,
  boardStyle,
  testId = 'formation-board',
  emptyIndicator = null,
  slotExtras,
  slotClassName,
  onSlotDrop,
}: FormationBoardCanvasProps) {
  const { t, locale } = useI18n()

  return (
    <div className="formation-board-wrap">
      <div className="formation-board" data-testid={testId} style={boardStyle}>
        {slots.map((slot) => {
          const championId = placements[slot.id]
          const champion = championId ? championById.get(championId) ?? null : null
          const isCarry = carrySlotId != null && slot.id === carrySlotId
          const extraClass = slotClassName?.(slot, champion)
          const slotLabel = t({ zh: `槽位 ${slot.id}`, en: `Slot ${slot.id}` })

          return (
            <div
              key={slot.id}
              data-slot-id={slot.id}
              data-hero-id={championId ?? undefined}
              data-carry={isCarry ? 'true' : undefined}
              className={[
                'formation-slot',
                isCarry ? 'formation-slot--carry' : '',
                extraClass ?? '',
              ]
                .filter(Boolean)
                .join(' ')}
              style={{ gridColumn: slot.column, gridRow: slot.row }}
              {...(onSlotDrop
                ? {
                    onDragOver: (event: DragEvent<HTMLDivElement>) => event.preventDefault(),
                    onDrop: (event: DragEvent<HTMLDivElement>) => {
                      event.preventDefault()
                      onSlotDrop(slot.id, event)
                    },
                  }
                : null)}
            >
              <span className="formation-slot__label">{slotLabel}</span>
              <div className="formation-slot__summary" aria-hidden="true">
                {champion ? (
                  <div
                    className="formation-slot__summary-badge"
                    {...(onSlotDrop
                      ? {
                          draggable: true,
                          onDragStart: (event: DragEvent<HTMLDivElement>) => {
                            event.dataTransfer?.setData('text/plain', champion.id)
                          },
                        }
                      : null)}
                  >
                    <ChampionAvatar champion={champion} locale={locale} className="champion-avatar--slot-mini" />
                    <span className="formation-slot__summary-seat">{champion.seat}</span>
                    {isCarry ? (
                      <span
                        className="formation-slot__carry-mark"
                        aria-label={t({ zh: '核心输出位', en: 'Carry slot' })}
                      >
                        <Crown aria-hidden="true" strokeWidth={1.9} />
                      </span>
                    ) : null}
                  </div>
                ) : (
                  emptyIndicator
                )}
              </div>
              {slotExtras?.(slot, champion)}
            </div>
          )
        })}
      </div>
    </div>
  )
}
