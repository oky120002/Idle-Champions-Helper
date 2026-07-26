import { useCallback, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Eraser, Lock, Plus, Send, Sparkles, Unlock } from 'lucide-react'
import { BackNavigationIcon } from '../app/AppIcons'
import { useI18n } from '../app/i18n'
import { ConfiguredWorkbenchPage } from '../components/workbench/ConfiguredWorkbenchPage'
import { WorkbenchContentStack } from '../components/workbench/WorkbenchScaffold'
import { buildPlannerRecommendation, evaluateFormation } from '../domain/planner/recommendationEngine'
import type { CandidateMode } from '../domain/planner/candidatePool'
import type { ScoringMode } from '../domain/planner/steadyStateScoring'
import { formatSeatLabel, getLocalizedTextPair } from '../domain/localizedText'
import type { Champion } from '../domain/types'
import { FormationBoardCanvas } from './formation/FormationBoardCanvas'
import { HeroPicker } from './formation/HeroPicker'
import { PlannerBreakdown } from './planner/PlannerBreakdown'
import { PlannerCandidateMode } from './planner/PlannerCandidateMode'
import { PlannerScenarioSelection } from './planner/PlannerScenarioSelection'
import { PlannerScoringMode } from './planner/PlannerScoringMode'
import {
  patchEvaluatePlacements,
  removeEvaluatePlacement,
  useEvaluatePlacements,
} from './planner/evaluatePlacementsStore'
import { usePlannerCollections } from './planner/usePlannerCollections'

export function PlannerEvaluatePage() {
  const { t, locale } = useI18n()
  const location = useLocation()
  const navigate = useNavigate()
  const contentScrollRef = useRef<HTMLDivElement | null>(null)
  const locationState = location.state as
    | {
        returnTo?: { pathname: string; search: string }
        returnLabel?: { zh: string; en: string }
        initialVariantId?: string | null
      }
    | null
  const {
    collections,
    profileSnapshot,
    championById,
    selectedVariantId,
    selectVariantId: selectVariantIdBase,
    loadState,
    loadError,
  } = usePlannerCollections(locationState?.initialVariantId ?? null)
  const [placements, setEvaluatePlacements] = useEvaluatePlacements()
  const [lockedSlots, setLockedSlots] = useState<Record<string, string>>({})
  const [candidateMode, setCandidateMode] = useState<CandidateMode>('owned-only')
  const [scoringMode, setScoringMode] = useState<ScoringMode>('carry-dps')

  // 切场景 = 换阵型拓扑，旧 slotId 失效；清锁与已摆阵型，避免 stale slotId 复活（fill-remaining 会回填 lockedSlots）。
  const selectVariantId = useCallback((variantId: string | null) => {
    selectVariantIdBase(variantId)
    setLockedSlots({})
    setEvaluatePlacements({})
  }, [selectVariantIdBase, setEvaluatePlacements])

  const backTarget = locationState?.returnTo ?? { pathname: '/planner', search: '' }
  const backLabel = locationState?.returnLabel ?? { zh: '返回自动计划', en: 'Back to auto plan' }

  const selectedVariant = useMemo(
    () => collections.variants.find((variant) => variant.id === selectedVariantId) ?? null,
    [collections.variants, selectedVariantId],
  )
  const evaluation = useMemo(
    () => evaluateFormation(selectedVariant, collections, profileSnapshot, placements, {
      candidateMode,
      scoringMode,
    }),
    [selectedVariant, collections, profileSnapshot, placements, candidateMode, scoringMode],
  )
  const championOptions = useMemo(
    () =>
      Array.from(championById.values()).sort(
        (left, right) => left.seat - right.seat || left.id.localeCompare(right.id),
      ),
    [championById],
  )

  function getOptionLabel(champion: Champion): string {
    return `${formatSeatLabel(champion.seat, locale)} · ${getLocalizedTextPair(champion.name, locale)}`
  }

  const scoreLabel = scoringMode === 'team-gold'
    ? t({ zh: '金币收益', en: 'Team gold find' })
    : t({ zh: '核心英雄 DPS', en: 'Carry DPS' })
  const heroNameById = useMemo(
    () => new Map((evaluation.result?.placementEntries ?? []).map((entry) => [entry.heroId, entry.heroName])),
    [evaluation.result],
  )

  // 半自动：锁定的槽位 + 系统搜出的剩余 = 完整阵型。owned-only + 无快照时 buildPlannerRecommendation
  // 会返回 missing-profile blocker（rec.result 为 null），按钮此时禁用，文案提示切到全部英雄。
  function handleFillRemaining() {
    const recommendation = buildPlannerRecommendation(selectedVariant, collections, profileSnapshot, {
      scoringMode,
      candidateMode,
      lockedSlots,
    })
    if (recommendation.result) {
      setEvaluatePlacements({ ...lockedSlots, ...recommendation.result.placements })
    }
  }

  const canFillRemaining = Object.keys(lockedSlots).length > 0 && !evaluation.blocker

  const blockerCopy = evaluation.blocker === 'missing-profile'
    ? t({
        zh: '当前候选范围为「仅已拥有」但未导入个人数据。导入后效果最准，或将候选范围切到「全部英雄（假设基线）」继续评估。',
        en: 'Candidate pool is "owned only" but no profile is imported. Import for best accuracy, or switch to "All hypothetical" to keep evaluating.',
      })
    : evaluation.blocker === 'missing-formation'
      ? t({
        zh: '当前场景没有匹配的阵型布局，请换一个场景。',
        en: 'No matching formation layout for this scenario. Pick another scenario.',
      })
      : null

  return (
    <ConfiguredWorkbenchPage
      pageClassName="planner-evaluate-page"
      storageKey="planner-evaluate"
      ariaLabel={t({ zh: '自配评估工作台', en: 'Formation evaluate workbench' })}
      shellClassName="workbench-page__shell planner-evaluate-workbench"
      contentScrollRef={contentScrollRef}
      toolbar={{
        sections: [
          { region: 'lead', section: { kind: 'mark', label: 'EVALUATE' } },
          {
            region: 'primary',
            section: {
              kind: 'copy',
              kicker: t({ zh: '自配评估', en: 'Evaluate' }),
              title: t({ zh: '自配评估', en: 'Formation Evaluate' }),
              detail: t({ zh: '自摆阵型，查看核心英雄 DPS', en: 'Place champions and see carry DPS' }),
            },
          },
          {
            region: 'actions',
            section: {
              kind: 'items',
              items: [
                {
                  id: 'back-to-planner',
                  kind: 'button',
                  label: '',
                  title: t(backLabel),
                  icon: <BackNavigationIcon />,
                  tone: 'share',
                  className: 'planner-evaluate-workbench__toolbar-back',
                  onClick: () => navigate(backTarget.pathname + backTarget.search),
                },
              ],
            },
          },
        ],
      }}
    >
      <WorkbenchContentStack>
        {loadState === 'error' ? (
          <section className="surface-card page-shell" role="alert">
            <div className="surface-card__header">
              <div className="surface-card__header-copy">
                <p className="surface-card__description">
                  {t({ zh: `加载数据失败：${loadError ?? '未知错误'}`, en: `Failed to load: ${loadError ?? 'unknown error'}` })}
                </p>
              </div>
            </div>
          </section>
        ) : loadState === 'loading' ? (
          <section className="surface-card page-shell" role="status" aria-busy="true">
            <div className="surface-card__header">
              <div className="surface-card__header-copy">
                <p className="surface-card__description">
                  {t({ zh: '正在加载场景与英雄数据…', en: 'Loading scenarios and champions…' })}
                </p>
              </div>
            </div>
          </section>
        ) : (
          <>
            <section className="surface-card page-shell planner-evaluate-page__scenario-panel">
              <div className="surface-card__body">
                <PlannerScenarioSelection
                  variants={collections.variants}
                  selectedId={selectedVariantId}
                  onSelectedIdChange={selectVariantId}
                />
                <PlannerScoringMode value={scoringMode} onChange={setScoringMode} />
                <PlannerCandidateMode value={candidateMode} onChange={setCandidateMode} />
              </div>
            </section>

            {blockerCopy ? (
              <section className="surface-card page-shell" role="status">
                <div className="surface-card__header">
                  <div className="surface-card__header-copy">
                    <p className="surface-card__description">{blockerCopy}</p>
                  </div>
                </div>
              </section>
            ) : evaluation.slots.length === 0 ? (
              <section className="surface-card page-shell" role="status">
                <div className="surface-card__header">
                  <div className="surface-card__header-copy">
                    <p className="surface-card__description">
                      {t({ zh: '当前场景没有可摆放的槽位。', en: 'No placeable slots for this scenario.' })}
                    </p>
                  </div>
                </div>
              </section>
            ) : (
              <>
                <HeroPicker champions={championOptions} className="hero-picker--source" />

                <FormationBoardCanvas
                  slots={evaluation.slots}
                  placements={placements}
                  championById={championById}
                  carrySlotId={evaluation.result?.breakdown?.carrySlotId ?? null}
                  testId="planner-evaluate-board"
                  emptyIndicator={
                    <span className="formation-slot__summary-empty">
                      <Plus aria-hidden="true" strokeWidth={2} />
                    </span>
                  }
                  onSlotDrop={(slotId, event) => {
                    // 锁定槽位不可变（拖拽覆盖会破坏锁契约，且让锁按钮消失无法解锁）。
                    if (lockedSlots[slotId]) {
                      return
                    }
                    const heroId = event.dataTransfer?.getData('text/plain')
                    if (heroId) {
                      patchEvaluatePlacements(slotId, heroId)
                    }
                  }}
                  slotExtras={(slot, champion) => {
                    const lockedHero = lockedSlots[slot.id]
                    const isLocked = Boolean(lockedHero)
                    return (
                      <div className="formation-slot__controls">
                        <select
                          className="slot-select"
                          aria-label={t({ zh: `槽位 ${slot.id} 英雄选择`, en: `Champion for slot ${slot.id}` })}
                          value={champion?.id ?? ''}
                          disabled={isLocked}
                          onChange={(event) => {
                            const heroId = event.target.value
                            if (heroId) {
                              patchEvaluatePlacements(slot.id, heroId)
                            } else {
                              removeEvaluatePlacement(slot.id)
                            }
                          }}
                        >
                          <option value="">{t({ zh: '未放置', en: 'Empty' })}</option>
                          {championOptions.map((option) => (
                            <option key={option.id} value={option.id}>
                              {getOptionLabel(option)}
                            </option>
                          ))}
                        </select>
                        {champion ? (
                          <button
                            type="button"
                            className={['slot-lock-toggle', isLocked ? 'is-locked' : ''].filter(Boolean).join(' ')}
                            aria-pressed={isLocked}
                            aria-label={
                              isLocked
                                ? t({ zh: `解锁槽位 ${slot.id}`, en: `Unlock slot ${slot.id}` })
                                : t({ zh: `锁定槽位 ${slot.id}`, en: `Lock slot ${slot.id}` })
                            }
                            data-testid={`planner-evaluate-lock-${slot.id}`}
                            onClick={() => {
                              if (isLocked) {
                                setLockedSlots((current) => {
                                  const next = { ...current }
                                  delete next[slot.id]
                                  return next
                                })
                              } else {
                                setLockedSlots((current) => ({ ...current, [slot.id]: champion.id }))
                              }
                            }}
                          >
                            {isLocked ? <Unlock aria-hidden="true" strokeWidth={1.9} /> : <Lock aria-hidden="true" strokeWidth={1.9} />}
                          </button>
                        ) : null}
                      </div>
                    )
                  }}
                />

                {evaluation.result ? (
                  <section className="surface-card planner-result-card" data-testid="planner-evaluate-score">
                    <div className="surface-card__header">
                      <div className="surface-card__header-copy">
                        <p className="surface-card__eyebrow">{scoreLabel}</p>
                        <p className="planner-result-card__score">
                          <strong>{evaluation.result.score}</strong>
                        </p>
                        {evaluation.result.carryHeroId ? (
                          <p className="surface-card__description">
                            {t({
                              zh: `核心：${heroNameById.get(evaluation.result.carryHeroId) ?? evaluation.result.carryHeroId}`,
                              en: `Carry: ${heroNameById.get(evaluation.result.carryHeroId) ?? evaluation.result.carryHeroId}`,
                            })}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </section>
                ) : null}

                {evaluation.result?.breakdown ? (
                  <PlannerBreakdown breakdown={evaluation.result.breakdown} heroNameById={heroNameById} />
                ) : null}

                {evaluation.result && evaluation.result.warnings.length > 0 ? (
                  <section className="surface-card page-shell" data-testid="planner-evaluate-warnings">
                    <div className="surface-card__header">
                      <div className="surface-card__header-copy">
                        <h3 className="surface-card__title">{t({ zh: '当前警告', en: 'Warnings' })}</h3>
                        <ul>
                          {evaluation.result.warnings.map((text, index) => (
                            <li key={index}>{text}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </section>
                ) : null}

                <div className="button-row planner-evaluate-page__actions">
                  <button
                    type="button"
                    className="action-button action-button--secondary action-button--with-icon"
                    data-testid="planner-evaluate-fill-remaining"
                    disabled={!canFillRemaining}
                    onClick={handleFillRemaining}
                  >
                    <span className="action-button__icon" aria-hidden="true">
                      <Sparkles strokeWidth={1.9} />
                    </span>
                    <span className="action-button__label">
                      {t({ zh: `算剩余最优（已锁 ${Object.keys(lockedSlots).length} 格）`, en: `Fill remaining (${Object.keys(lockedSlots).length} locked)` })}
                    </span>
                  </button>
                  <button
                    type="button"
                    className="action-button action-button--ghost action-button--with-icon"
                    disabled={Object.keys(lockedSlots).length === 0}
                    onClick={() =>
                      navigate('/planner', {
                        state: { lockedSlotsFromEvaluate: lockedSlots, variantIdFromEvaluate: selectedVariantId },
                      })
                    }
                  >
                    <span className="action-button__icon" aria-hidden="true">
                      <Send strokeWidth={1.9} />
                    </span>
                    <span className="action-button__label">
                      {t({ zh: '回填到自动计划', en: 'Send to auto plan' })}
                    </span>
                  </button>
                </div>

                <div
                  className="formation-remove-zone"
                  data-testid="planner-evaluate-remove-zone"
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => {
                    event.preventDefault()
                    const heroId = event.dataTransfer?.getData('text/plain')
                    if (!heroId) return
                    const entry = Object.entries(placements).find(([, id]) => id === heroId)
                    if (entry && !lockedSlots[entry[0]]) {
                      removeEvaluatePlacement(entry[0])
                    }
                  }}
                >
                  <Eraser aria-hidden="true" strokeWidth={1.9} />
                  {t({ zh: '拖到此处移除', en: 'Drop here to remove' })}
                </div>
              </>
            )}
          </>
        )}
      </WorkbenchContentStack>
    </ConfiguredWorkbenchPage>
  )
}
