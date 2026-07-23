import { z } from 'zod'

/**
 * champion-details 核心 schema（阶段 9.3）。
 * 只校验 planner/simulator 依赖的核心字段；非核心字段用 passthrough 放行（防过度耦合上游字段增减）。
 * raw 上游原始对象用 z.unknown()（CNE 伪 JSON 结构多变，不强校验）。
 * CI 校验脚本：scripts/validate-data-schemas.ts；npm run data:validate-schema。
 */
const numericString = z.string().min(1)

export const championDetailsSchema = z
  .object({
    attacks: z
      .object({
        base: z
          .object({
            cooldown: z.number(),
            damageTypes: z.array(z.string()),
          })
          .passthrough(),
      })
      .passthrough(),
    baseDamage: numericString,
    baseHealth: numericString,
    costCurves: z.record(z.string(), z.number()).nullish(),
    healthCurves: z.record(z.string(), z.number()).nullish(),
    characterSheet: z
      .object({
        age: z.number().nullable(),
        abilityScores: z.record(z.string(), z.number()),
      })
      .passthrough(),
    upgrades: z.array(z.unknown()),
    feats: z.array(z.unknown()).optional(),
    loot: z.array(z.unknown()).optional(),
    legendaryEffects: z.array(z.unknown()).optional(),
    raw: z.unknown().optional(),
  })
  .passthrough()
