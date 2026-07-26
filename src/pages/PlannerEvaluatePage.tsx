import { useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Eraser, Plus } from 'lucide-react'
import { BackNavigationIcon } from '../app/AppIcons'
import { useI18n } from '../app/i18n'
import { ConfiguredWorkbenchPage } from '../components/workbench/ConfiguredWorkbenchPage'
import { WorkbenchContentStack } from '../components/workbench/WorkbenchScaffold'
import { evaluateFormation } from '../domain/planner/recommendationEngine'
import type { CandidateMode } from '../domain/planner/candidatePool'
import type { ScoringMode } from '../domain/planner/steadyStateScoring'
import { formatSeatLabel, getLocalizedTextPair } from '../domain/localizedText'
import type { Champion } from '../domain/types'
import { FormationBoardCanvas } from './formation/FormationBoardCanvas'
import { HeroPicker } from './formation/HeroPicker'
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
  const {
    collections,
    profileSnapshot,
    championById,
    selectedVariantId,
    selectVariantId,
    loadState,
    loadError,
  } = usePlannerCollections()
  const [placements] = useEvaluatePlacements()
  const [candidateMode, setCandidateMode] = useState<CandidateMode>('owned-only')
  const [scoringMode, setScoringMode] = useState<ScoringMode>('carry-dps')

  const locationState = location.state as
    | { returnTo?: { pathname: string; search: string }; returnLabel?: { zh: string; en: string } }
    | null
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
                  carrySlotId={evaluation.result?.carryHeroId
                    ? Object.entries(placements).find(([, id]) => id === evaluation.result?.carryHeroId)?.[0] ?? null
                    : null}
                  testId="planner-evaluate-board"
                  emptyIndicator={
                    <span className="formation-slot__summary-empty">
                      <Plus aria-hidden="true" strokeWidth={2} />
                    </span>
                  }
                  onSlotDrop={(slotId, event) => {
                    const heroId = event.dataTransfer?.getData('text/plain')
                    if (heroId) {
                      patchEvaluatePlacements(slotId, heroId)
                    }
                  }}
                  slotExtras={(slot, champion) => (
                    <div className="formation-slot__controls">
                      <select
                        className="slot-select"
                        aria-label={t({ zh: `槽位 ${slot.id} 英雄选择`, en: `Champion for slot ${slot.id}` })}
                        value={champion?.id ?? ''}
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
                        {championOptions.map((champion) => (
                          <option key={champion.id} value={champion.id}>
                            {getOptionLabel(champion)}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                />

                <div
                  className="formation-remove-zone"
                  data-testid="planner-evaluate-remove-zone"
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => {
                    event.preventDefault()
                    const heroId = event.dataTransfer?.getData('text/plain')
                    if (!heroId) return
                    const entry = Object.entries(placements).find(([, id]) => id === heroId)
                    if (entry) {
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
