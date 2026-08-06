/* eslint-disable max-lines -- 自配评估页是内聚模块：工具栏 + 场景选择 + 棋盘 + 结果 + 动作，全部围绕单一评估流程；拆文件会让常见修改跨多文件。 */
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type DragEvent as ReactDragEvent,
  type ReactNode,
  type SetStateAction,
} from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Eraser, Lock, Plus, Send, Sparkles, Unlock } from 'lucide-react'
import { BackNavigationIcon } from '../app/AppIcons'
import { useI18n } from '../app/i18n'
import { ConfiguredWorkbenchPage } from '../components/workbench/ConfiguredWorkbenchPage'
import { WorkbenchContentStack } from '../components/workbench/WorkbenchScaffold'
import type { WorkbenchToolbarConfig } from '../components/workbench/workbenchToolbarConfig'
import { createPlannerComputeRunner } from '../domain/planner/compute/plannerCompute'
import type { FormationEvaluation } from '../domain/planner/recommendationEngine'
import type { CandidateMode } from '../domain/planner/candidatePool'
import { DEFAULT_MANUAL_STACK_COUNT } from '../domain/planner/placementFit'
import type { ScoringMode } from '../domain/planner/steadyStateScoring'
import { formatSeatLabel, getLocalizedTextPair } from '../domain/localizedText'
import type { Champion, FormationSlot, Variant } from '../domain/types'
import type { UserProfileSnapshot } from '../domain/user-profile/types'
import { buildScoringBonusInputs } from '../domain/planner/scoringBonusInputs'
import { FormationBoardCanvas } from './formation/FormationBoardCanvas'
import { HeroPicker } from './formation/HeroPicker'
import { PlannerBreakdown } from './planner/PlannerBreakdown'
import { PlannerCandidateMode } from './planner/PlannerCandidateMode'
import { PlannerScenarioSelection } from './planner/PlannerScenarioSelection'
import { PlannerStackCount } from './planner/PlannerStackCount'
import { PlannerHypotheticalEquipment } from './planner/PlannerHypotheticalEquipment'
import { PlannerScoringMode } from './planner/PlannerScoringMode'
import {
  patchEvaluatePlacements,
  removeEvaluatePlacement,
  useEvaluatePlacements,
} from './planner/evaluatePlacementsStore'
import { usePlannerCollections } from './planner/usePlannerCollections'
import { usePlannerEvaluation } from './planner/usePlannerCompute'

const EMPTY_EVALUATION: FormationEvaluation = {
  result: null,
  layoutId: null,
  slots: [],
  scenarioRef: null,
  blocker: null,
}

/** 排序：seat 升序 → id 字典序。 */
function championSeatComparator(left: Champion, right: Champion): number {
  const diff = left.seat - right.seat
  return diff === 0 || Number.isNaN(diff) ? left.id.localeCompare(right.id) : diff
}

/** 锁定槽位不可拖拽覆盖（破坏锁契约）。 */
function handleEvaluateSlotDrop(
  slotId: string,
  event: ReactDragEvent<HTMLDivElement>,
  lockedSlots: Record<string, string>,
): void {
  if (lockedSlots[slotId] != null && lockedSlots[slotId] !== '') {
    return
  }
  const heroId = event.dataTransfer.getData('text/plain')
  if (heroId !== '') {
    patchEvaluatePlacements(slotId, heroId)
  }
}

/** 移除区 drop：仅删除未锁定槽位中的英雄。 */
function handleEvaluateRemoveDrop(
  event: ReactDragEvent<HTMLDivElement>,
  placements: Record<string, string>,
  lockedSlots: Record<string, string>,
): void {
  event.preventDefault()
  const heroId = event.dataTransfer.getData('text/plain')
  if (heroId === '') return
  const entry = Object.entries(placements).find(([, id]) => id === heroId)
  if (entry != null && (lockedSlots[entry[0]] == null || lockedSlots[entry[0]] === '')) {
    removeEvaluatePlacement(entry[0])
  }
}

/** 阵型槽位控件（select + lock 切换），从主组件提取以降低复杂度。 */
interface EvaluateSlotControlsProps {
  readonly slot: FormationSlot
  readonly champion: Champion | null
  readonly lockedSlotHero: string | undefined
  readonly championOptions: Champion[]
  readonly getOptionLabel: (champion: Champion) => string
  readonly onSelect: (heroId: string) => void
  readonly onRemove: () => void
  readonly onLock: (slotId: string, championId: string) => void
  readonly onUnlock: (slotId: string) => void
}

function EvaluateSlotControls({
  slot,
  champion,
  lockedSlotHero,
  championOptions,
  getOptionLabel,
  onSelect,
  onRemove,
  onLock,
  onUnlock,
}: EvaluateSlotControlsProps) {
  const { t } = useI18n()
  const isLocked = lockedSlotHero != null && lockedSlotHero !== ''
  return (
    <div className="formation-slot__controls">
      <select
        className="slot-select"
        aria-label={t({ zh: `槽位 ${slot.id} 英雄选择`, en: `Champion for slot ${slot.id}` })}
        value={champion?.id ?? ''}
        disabled={isLocked}
        onChange={(event) => {
          const heroId = event.target.value
          if (heroId !== '') {
            onSelect(heroId)
          } else {
            onRemove()
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
      {champion != null ? (
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
              onUnlock(slot.id)
            } else {
              onLock(slot.id, champion.id)
            }
          }}
        >
          {isLocked ? <Unlock aria-hidden="true" strokeWidth={1.9} /> : <Lock aria-hidden="true" strokeWidth={1.9} />}
        </button>
      ) : null}
    </div>
  )
}

/** 评估结果区域（error / loading / score / breakdown / warnings），各条件独立渲染保持原行为。 */
interface EvaluateResultsProps {
  readonly evaluation: FormationEvaluation
  readonly evaluateError: string | null
  readonly evaluateLoading: boolean
  readonly scoreLabel: string
  readonly heroNameById: Map<string, string>
}

function EvaluateResults({
  evaluation,
  evaluateError,
  evaluateLoading,
  scoreLabel,
  heroNameById,
}: EvaluateResultsProps) {
  const { t } = useI18n()
  return (
    <>
      {evaluateError != null && evaluateError !== '' ? (
        <section className="surface-card planner-result-card" role="alert" data-testid="planner-evaluate-error">
          <div className="surface-card__header">
            <div className="surface-card__header-copy">
              <p className="surface-card__description">
                {t({ zh: `计算失败：${evaluateError}`, en: `Compute failed: ${evaluateError}` })}
              </p>
            </div>
          </div>
        </section>
      ) : null}
      {evaluateLoading ? (
        <section className="surface-card planner-result-card" role="status" aria-busy="true" data-testid="planner-evaluate-loading">
          <div className="surface-card__header">
            <div className="surface-card__header-copy">
              <p className="surface-card__description">
                {t({ zh: '正在重新计算…', en: 'Recomputing…' })}
              </p>
            </div>
          </div>
        </section>
      ) : null}
      {evaluation.result ? (
        <section className="surface-card planner-result-card" data-testid="planner-evaluate-score">
          <div className="surface-card__header">
            <div className="surface-card__header-copy">
              <p className="surface-card__eyebrow">{scoreLabel}</p>
              <p className="planner-result-card__score">
                <strong>{evaluation.result.objectiveValue}</strong>
              </p>
              {evaluation.result.carryHeroId != null && evaluation.result.carryHeroId !== '' ? (
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
    </>
  )
}

/** 就绪内容：场景面板 + 棋盘 + 结果 + 动作 + 移除区，从主组件提取以降低复杂度。 */
interface EvaluateReadyContentProps {
  readonly evaluation: FormationEvaluation
  readonly blockerCopy: string | null
  readonly evaluateError: string | null
  readonly evaluateLoading: boolean
  readonly scoreLabel: string
  readonly heroNameById: Map<string, string>
  readonly variants: Variant[]
  readonly selectedVariantId: string | null
  readonly selectVariantId: (id: string | null) => void
  readonly scoringMode: ScoringMode
  readonly setScoringMode: (mode: ScoringMode) => void
  readonly candidateMode: CandidateMode
  readonly setCandidateMode: (mode: CandidateMode) => void
  readonly manualStackCount: number
  readonly setManualStackCount: (count: number) => void
  readonly profileSnapshot: UserProfileSnapshot | null
  readonly equipmentRarity: number
  readonly setEquipmentRarity: (rarity: number) => void
  readonly equipmentEnchant: number
  readonly setEquipmentEnchant: (enchant: number) => void
  readonly placements: Record<string, string>
  readonly lockedSlots: Record<string, string>
  readonly setLockedSlots: Dispatch<SetStateAction<Record<string, string>>>
  readonly championOptions: Champion[]
  readonly getOptionLabel: (champion: Champion) => string
  readonly championById: Map<string, Champion>
  readonly filling: boolean
  readonly canFillRemaining: boolean
  readonly onFillRemaining: () => void
}

function EvaluateReadyContent({
  evaluation,
  blockerCopy,
  evaluateError,
  evaluateLoading,
  scoreLabel,
  heroNameById,
  variants,
  selectedVariantId,
  selectVariantId,
  scoringMode,
  setScoringMode,
  candidateMode,
  setCandidateMode,
  manualStackCount,
  setManualStackCount,
  profileSnapshot,
  equipmentRarity,
  setEquipmentRarity,
  equipmentEnchant,
  setEquipmentEnchant,
  placements,
  lockedSlots,
  setLockedSlots,
  championOptions,
  getOptionLabel,
  championById,
  filling,
  canFillRemaining,
  onFillRemaining,
}: EvaluateReadyContentProps) {
  const { t } = useI18n()
  const navigate = useNavigate()
  const lockedCount = String(Object.keys(lockedSlots).length)

  let blockerNotice: ReactNode = null
  if (blockerCopy != null && blockerCopy !== '') {
    blockerNotice = (
      <section className="surface-card page-shell" role="status">
        <div className="surface-card__header">
          <div className="surface-card__header-copy">
            <p className="surface-card__description">{blockerCopy}</p>
          </div>
        </div>
      </section>
    )
  } else if (evaluation.slots.length === 0) {
    blockerNotice = (
      <section className="surface-card page-shell" role="status">
        <div className="surface-card__header">
          <div className="surface-card__header-copy">
            <p className="surface-card__description">
              {t({ zh: '当前场景没有可摆放的槽位。', en: 'No placeable slots for this scenario.' })}
            </p>
          </div>
        </div>
      </section>
    )
  }

  return (
    <>
      <section className="surface-card page-shell planner-evaluate-page__scenario-panel">
        <div className="surface-card__body">
          <PlannerScenarioSelection
            variants={variants}
            selectedId={selectedVariantId}
            onSelectedIdChange={selectVariantId}
          />
          <PlannerScoringMode value={scoringMode} onChange={setScoringMode} />
          <PlannerCandidateMode value={candidateMode} onChange={setCandidateMode} />
          <PlannerStackCount value={manualStackCount} onChange={setManualStackCount} />
          {!profileSnapshot ? (
            <PlannerHypotheticalEquipment
              rarity={equipmentRarity}
              enchant={equipmentEnchant}
              onRarityChange={setEquipmentRarity}
              onEnchantChange={setEquipmentEnchant}
            />
          ) : null}
        </div>
      </section>

      {blockerNotice ?? (
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
        onSlotDrop={(slotId, event) => handleEvaluateSlotDrop(slotId, event, lockedSlots)}
        slotExtras={(slot, champion) => (
          <EvaluateSlotControls
            slot={slot}
            champion={champion}
            lockedSlotHero={lockedSlots[slot.id]}
            championOptions={championOptions}
            getOptionLabel={getOptionLabel}
            onSelect={(heroId) => patchEvaluatePlacements(slot.id, heroId)}
            onRemove={() => removeEvaluatePlacement(slot.id)}
            onLock={(slotId, championId) => {
              setLockedSlots((current) => ({ ...current, [slotId]: championId }))
            }}
            onUnlock={(slotId) => setLockedSlots((current) => Object.fromEntries(Object.entries(current).filter(([key]) => key !== slotId)))}
          />
        )}
      />

      <EvaluateResults
        evaluation={evaluation}
        evaluateError={evaluateError}
        evaluateLoading={evaluateLoading}
        scoreLabel={scoreLabel}
        heroNameById={heroNameById}
      />

      <div className="button-row planner-evaluate-page__actions">
        <button
          type="button"
          className="action-button action-button--secondary action-button--with-icon"
          data-testid="planner-evaluate-fill-remaining"
          disabled={!canFillRemaining || filling}
          onClick={onFillRemaining}
        >
          <span className="action-button__icon" aria-hidden="true">
            <Sparkles strokeWidth={1.9} />
          </span>
          <span className="action-button__label">
            {filling
              ? t({ zh: '计算中…', en: 'Computing…' })
              : t({ zh: `算剩余最优（已锁 ${lockedCount} 格）`, en: `Fill remaining (${lockedCount} locked)` })}
          </span>
        </button>
        <button
          type="button"
          className="action-button action-button--ghost action-button--with-icon"
          disabled={Object.keys(lockedSlots).length === 0}
          onClick={() => navigate('/planner', {
            state: { lockedSlotsFromEvaluate: lockedSlots, variantIdFromEvaluate: selectedVariantId },
          })}
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
        onDrop={(event) => handleEvaluateRemoveDrop(event, placements, lockedSlots)}
      >
        <Eraser aria-hidden="true" strokeWidth={1.9} />
        {t({ zh: '拖到此处移除', en: 'Drop here to remove' })}
      </div>
        </>
      )}
    </>
  )
}

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
    lootCatalog,
    patronPerkCatalog,
    effectDefinitions,
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
  const [manualStackCount, setManualStackCount] = useState(DEFAULT_MANUAL_STACK_COUNT)
  const [equipmentRarity, setEquipmentRarity] = useState(4)
  const [equipmentEnchant, setEquipmentEnchant] = useState(2000)

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
  const runner = useMemo(() => createPlannerComputeRunner(), [])
  useEffect(() => () => runner.dispose(), [runner])

  const { equipmentAdjustmentByHero, equipmentHealthByHero, equipmentGlobalDpsByHero, equipmentGoldByHero, equipmentCritByHero, equipmentBuffsByHero, globalBuffMultiplier, externalHeroDpsContributions } = useMemo(
    () => buildScoringBonusInputs({
      profileSnapshot,
      lootCatalog,
      effectDefinitions,
      patronPerkCatalog,
      hypotheticalEquipment: {
        heroIds: collections.plannerHeroes.map((hero) => hero.heroId),
        rarity: equipmentRarity,
        enchant: equipmentEnchant,
      },
      featCatalog: collections.featCatalog ?? null,
    }),
    [profileSnapshot, lootCatalog, effectDefinitions, patronPerkCatalog, collections.plannerHeroes, collections.featCatalog, equipmentRarity, equipmentEnchant],
  )
  const evaluateOptions = useMemo(
    () => ({ candidateMode, scoringMode, manualStackCount, equipmentAdjustmentByHero, equipmentHealthByHero, equipmentGlobalDpsByHero, equipmentGoldByHero, equipmentCritByHero, equipmentBuffsByHero, globalBuffMultiplier, externalHeroDpsContributions }),
    [candidateMode, scoringMode, manualStackCount, equipmentAdjustmentByHero, equipmentHealthByHero, equipmentGlobalDpsByHero, equipmentGoldByHero, equipmentCritByHero, equipmentBuffsByHero, globalBuffMultiplier, externalHeroDpsContributions],
  )
  const { result: evaluationResult, loading: evaluateLoading, error: evaluateError } = usePlannerEvaluation(
    runner,
    collections,
    selectedVariant,
    profileSnapshot,
    placements,
    evaluateOptions,
  )
  const evaluation: FormationEvaluation = evaluationResult ?? EMPTY_EVALUATION
  const championOptions = useMemo(
    () => Array.from(championById.values()).sort(championSeatComparator),
    [championById],
  )

  const getOptionLabel = useCallback(
    (champion: Champion): string => `${formatSeatLabel(champion.seat, locale)} · ${getLocalizedTextPair(champion.name, locale)}`,
    [locale],
  )

  const scoreLabel = scoringMode === 'team-gold'
    ? t({ zh: '金币收益', en: 'Team gold find' })
    : t({ zh: '核心英雄 DPS', en: 'Carry DPS' })
  const heroNameById = useMemo(
    () => new Map((evaluation.result?.placementEntries ?? []).map((entry) => [entry.heroId, entry.heroName])),
    [evaluation.result],
  )

  const [filling, setFilling] = useState(false)
  async function handleFillRemaining() {
    setFilling(true)
    try {
      const recommendation = await runner.recommend({
        profileSnapshot,
        variant: selectedVariant,
        options: {
          scoringMode,
          candidateMode,
          lockedSlots,
          manualStackCount,
          equipmentAdjustmentByHero,
          equipmentHealthByHero,
          equipmentGlobalDpsByHero,
          equipmentGoldByHero,
          equipmentCritByHero,
          equipmentBuffsByHero,
          globalBuffMultiplier,
          externalHeroDpsContributions,
        },
      })
      if (recommendation.result) {
        setEvaluatePlacements({ ...lockedSlots, ...recommendation.result.placements })
      }
    } finally {
      setFilling(false)
    }
  }

  const canFillRemaining = Object.keys(lockedSlots).length > 0 && evaluation.blocker === null && !evaluateLoading

  const ariaLabel = t({ zh: '自配评估工作台', en: 'Formation evaluate workbench' })
  const toolbarConfig: WorkbenchToolbarConfig = {
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
  }

  const renderShell = (content: ReactNode): ReactNode => (
    <ConfiguredWorkbenchPage
      pageClassName="planner-evaluate-page"
      storageKey="planner-evaluate"
      ariaLabel={ariaLabel}
      shellClassName="workbench-page__shell planner-evaluate-workbench"
      contentScrollRef={contentScrollRef}
      toolbar={toolbarConfig}
    >
      <WorkbenchContentStack>{content}</WorkbenchContentStack>
    </ConfiguredWorkbenchPage>
  )

  if (loadState === 'error') {
    return renderShell(
      <section className="surface-card page-shell" role="alert">
        <div className="surface-card__header">
          <div className="surface-card__header-copy">
            <p className="surface-card__description">
              {t({ zh: `加载数据失败：${loadError ?? '未知错误'}`, en: `Failed to load: ${loadError ?? 'unknown error'}` })}
            </p>
          </div>
        </div>
      </section>,
    )
  }
  if (loadState === 'loading') {
    return renderShell(
      <section className="surface-card page-shell" role="status" aria-busy="true">
        <div className="surface-card__header">
          <div className="surface-card__header-copy">
            <p className="surface-card__description">
              {t({ zh: '正在加载场景与英雄数据…', en: 'Loading scenarios and champions…' })}
            </p>
          </div>
        </div>
      </section>,
    )
  }

  let blockerCopy: string | null = null
  if (evaluation.blocker === 'missing-profile') {
    blockerCopy = t({
      zh: '当前候选范围为「仅已拥有」但未导入个人数据。导入后效果最准，或将候选范围切到「全部英雄（假设基线）」继续评估。',
      en: 'Candidate pool is "owned only" but no profile is imported. Import for best accuracy, or switch to "All hypothetical" to keep evaluating.',
    })
  } else if (evaluation.blocker === 'missing-formation') {
    blockerCopy = t({
      zh: '当前场景没有匹配的阵型布局，请换一个场景。',
      en: 'No matching formation layout for this scenario. Pick another scenario.',
    })
  }

  return renderShell(
    <EvaluateReadyContent
      evaluation={evaluation}
      blockerCopy={blockerCopy}
      evaluateError={evaluateError}
      evaluateLoading={evaluateLoading}
      scoreLabel={scoreLabel}
      heroNameById={heroNameById}
      variants={collections.variants}
      selectedVariantId={selectedVariantId}
      selectVariantId={selectVariantId}
      scoringMode={scoringMode}
      setScoringMode={setScoringMode}
      candidateMode={candidateMode}
      setCandidateMode={setCandidateMode}
      manualStackCount={manualStackCount}
      setManualStackCount={setManualStackCount}
      profileSnapshot={profileSnapshot}
      equipmentRarity={equipmentRarity}
      setEquipmentRarity={setEquipmentRarity}
      equipmentEnchant={equipmentEnchant}
      setEquipmentEnchant={setEquipmentEnchant}
      placements={placements}
      lockedSlots={lockedSlots}
      setLockedSlots={setLockedSlots}
      championOptions={championOptions}
      getOptionLabel={getOptionLabel}
      championById={championById}
      filling={filling}
      canFillRemaining={canFillRemaining}
      onFillRemaining={handleFillRemaining}
    />,
  )
}
