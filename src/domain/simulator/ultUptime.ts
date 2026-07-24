/**
 * Ult/主动技能 buff 的 modron uptime 折算（阶段 14.4）。
 *
 * ability_defines（10 条，id===hero_id 对齐）含 carryDps signal（Commander 全队 DPS ×2、
 * Pact Weapon hero_dps、Cunning Action attack_speed、Channel Divinity buff_upgrades 等）。
 * modron 满级自动施放 → ult buff 有效值 = value × (duration / base_cooldown)。
 * 无 modron / 未满级 → uptime=0（保守不计，避免高估）。
 *
 * 边界：duration/base_cooldown 是 steady-state 近似（长期平均覆盖率）；
 * step simulation（长期扩展）会用逐窗口实际激活状态替代。
 */

/**
 * 计算 ult buff uptime（有效时间占比）。
 * @param duration ult 持续时间（秒）
 * @param baseCooldown ult 冷却（秒）
 * @param modronActive modron 是否满级自动施放
 * @returns uptime ∈ [0, 1]；modron 未激活或参数非法 → 0
 */
export function computeUltUptime(
  duration: number,
  baseCooldown: number,
  modronActive: boolean,
): number {
  if (!modronActive) return 0
  if (!Number.isFinite(duration) || duration <= 0) return 0
  if (!Number.isFinite(baseCooldown) || baseCooldown <= 0) return 0
  return Math.min(1, duration / baseCooldown)
}

/**
 * 把 ult buff 的原始 value 按 uptime 折算为 steady-state 有效值。
 * `effectiveValue = value × uptime`。
 */
export function foldUltBuffValue(value: number, uptime: number): number {
  return value * uptime
}
