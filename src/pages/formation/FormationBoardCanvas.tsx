import { useState, type CSSProperties, type DragEvent, type ReactNode } from 'react'
import { Crown } from 'lucide-react'
import { ChampionAvatar } from '../../components/ChampionAvatar'
import { useI18n } from '../../app/i18n'
import type { Champion, FormationSlot } from '../../domain/types'

/**
 * 阵型棋盘纯渲染。
 *
 * 只负责格子布局 + 已放置英雄头像/seat/carry 标记；交互控件（select/tap-target/拖放）
 * 由调用方经 `slotExtras` 注入，使 formation 编辑器与 planner 结果卡片共用同一棋盘。
 * planner 结果卡片只读使用（只传 slots/placements/championById/carrySlotId）。
 */
export interface FormationBoardCanvasProps {
  readonly slots: FormationSlot[]
  readonly placements: Record<string, string>
  readonly championById: Map<string, Champion>
  /** 核心输出位所在槽位 id；命中则高亮该格并显示 carry 标记。 */
  readonly carrySlotId?: string | null
  readonly boardStyle?: CSSProperties | undefined
  readonly testId?: string
  /** 空槽位占位节点（formation 编辑器用 Plus 图标，planner 默认空）。 */
  readonly emptyIndicator?: ReactNode
  /** 每槽位的额外交互控件（tap-target/select/拖放），渲染在 summary 之后。 */
  readonly slotExtras?: (slot: FormationSlot, champion: Champion | null) => ReactNode
  /** 每槽位追加的 className（conflict/active 等状态修饰）。 */
  readonly slotClassName?: (slot: FormationSlot, champion: Champion | null) => string | undefined
  /** 槽位 drop 回调（HTML5 DnD）；planner 只读棋盘不传。 */
  readonly onSlotDrop?: (slotId: string, event: DragEvent<HTMLDivElement>) => void
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
  // 桌面 DnD 时高亮当前 dragover 槽位，给用户「可放在这里」的视觉反馈。
  // dragOver 持续触发，只在 slot 变化时 setState 避免高频渲染；dragEnd（拖出/松开）兜底清除。
  const [dragOverSlotId, setDragOverSlotId] = useState<string | null>(null)

  return (
    <div className="formation-board-wrap">
      <div
        className="formation-board"
        data-testid={testId}
        style={boardStyle}
        onDragEnd={() => setDragOverSlotId(null)}
      >
        {slots.map((slot) => (
          <FormationBoardSlot
            key={slot.id}
            slot={slot}
            placements={placements}
            championById={championById}
            carrySlotId={carrySlotId}
            isDragOver={dragOverSlotId === slot.id}
            setDragOverSlotId={setDragOverSlotId}
            emptyIndicator={emptyIndicator}
            slotClassName={slotClassName}
            slotExtras={slotExtras}
            onSlotDrop={onSlotDrop}
          />
        ))}
      </div>
    </div>
  )
}

interface FormationBoardSlotProps {
  readonly slot: FormationSlot
  readonly placements: Record<string, string>
  readonly championById: Map<string, Champion>
  readonly carrySlotId: string | null
  readonly isDragOver: boolean
  readonly setDragOverSlotId: (id: string | null) => void
  // 透传自 FormationBoardCanvasProps 的可选 prop：exactOptionalPropertyTypes 下需显式允许 undefined 值
  readonly emptyIndicator: ReactNode | undefined
  readonly slotClassName: ((slot: FormationSlot, champion: Champion | null) => string | undefined) | undefined
  readonly slotExtras: ((slot: FormationSlot, champion: Champion | null) => ReactNode) | undefined
  readonly onSlotDrop: ((slotId: string, event: DragEvent<HTMLDivElement>) => void) | undefined
}

function FormationBoardSlot({
  slot,
  placements,
  championById,
  carrySlotId,
  isDragOver,
  setDragOverSlotId,
  emptyIndicator,
  slotClassName,
  slotExtras,
  onSlotDrop,
}: FormationBoardSlotProps) {
  const { t } = useI18n()
  const championId = placements[slot.id]
  const champion = championId != null && championId !== '' ? championById.get(championId) ?? null : null
  const isCarry = carrySlotId != null && slot.id === carrySlotId
  const extraClass = slotClassName?.(slot, champion)
  const slotLabel = t("槽位 {p0}", { p0: slot.id })
  const slotClassNameValue = ['formation-slot', isCarry ? 'formation-slot--carry' : '', extraClass ?? '']
    .filter(Boolean)
    .join(' ')
  const handleDragOver = onSlotDrop !== undefined
    ? (event: DragEvent<HTMLDivElement>) => {
        event.preventDefault()
        if (!isDragOver) {
          setDragOverSlotId(slot.id)
        }
      }
    : undefined
  const handleDrop = onSlotDrop !== undefined
    ? (event: DragEvent<HTMLDivElement>) => {
        event.preventDefault()
        setDragOverSlotId(null)
        onSlotDrop(slot.id, event)
      }
    : undefined

  return (
    <div
      data-slot-id={slot.id}
      data-hero-id={championId ?? undefined}
      data-carry={isCarry ? 'true' : undefined}
      data-drag-over={isDragOver ? 'true' : undefined}
      className={slotClassNameValue}
      style={{ gridColumn: slot.column, gridRow: slot.row }}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <span className="formation-slot__label">{slotLabel}</span>
      <div className="formation-slot__summary" aria-hidden="true">
        <FormationSlotSummary
          champion={champion}
          isCarry={isCarry}
          showDragBadge={onSlotDrop !== undefined}
          emptyIndicator={emptyIndicator}
        />
      </div>
      {slotExtras?.(slot, champion)}
    </div>
  )
}

interface FormationSlotSummaryProps {
  readonly champion: Champion | null
  readonly isCarry: boolean
  readonly showDragBadge: boolean
  readonly emptyIndicator?: ReactNode
}

function FormationSlotSummary({
  champion,
  isCarry,
  showDragBadge,
  emptyIndicator,
}: FormationSlotSummaryProps) {
  const { t, locale } = useI18n()
  if (champion === null) {
    return <>{emptyIndicator}</>
  }
  return (
    <div
      className="formation-slot__summary-badge"
      {...(showDragBadge
        ? {
            draggable: true,
            onDragStart: (event: DragEvent<HTMLDivElement>) => event.dataTransfer.setData('text/plain', champion.id),
          }
        : undefined)}
    >
      <ChampionAvatar champion={champion} locale={locale} className="champion-avatar--slot-mini" />
      <span className="formation-slot__summary-seat">{champion.seat}</span>
      {isCarry ? (
        <span
          className="formation-slot__carry-mark"
          aria-label={t("核心输出位")}
        >
          <Crown aria-hidden="true" strokeWidth={1.9} />
        </span>
      ) : null}
    </div>
  )
}
