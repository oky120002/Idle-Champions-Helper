/* eslint-disable max-lines -- 单一内聚页面组件，拆分将降低一跳命中率 */
import { useMemo, useRef } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import { useI18n } from '../app/i18n'
import { ConfiguredWorkbenchPage } from '../components/workbench/ConfiguredWorkbenchPage'
import { WorkbenchContentStack } from '../components/workbench/WorkbenchScaffold'
import { createWorkbenchBadgeItem, createWorkbenchShareItem } from '../components/workbench/WorkbenchToolbarItemBuilders'
import type { WorkbenchToolbarItemConfig } from '../components/workbench/WorkbenchToolbarItems'
import { useWorkbenchScrollNavigation } from '../components/workbench/useWorkbenchScrollNavigation'
import { useWorkbenchShareLink } from '../components/workbench/useWorkbenchShareLink'
import type { ChampionAnimation } from '../domain/types'
import { AnimationAuditComparisonRow } from './animation-audit/AnimationAuditComparisonRow'
import { AnimationAuditFeedbackExportPanel } from './animation-audit/AnimationAuditFeedbackExportPanel'
import { useAnimationAuditPageModel } from './animation-audit/useAnimationAuditPageModel'
import { buildKindLabel, buildLevelLabel, KIND_FILTERS, LEVEL_FILTERS } from './animation-audit/animationAuditFilterLabels'
import type { AnimationAuditEntry, AnimationAuditState } from './animation-audit/types'

type ReadyAnimationAuditState = Extract<AnimationAuditState, { status: 'ready' }>

interface VisibleAnimationRow {
  entry: AnimationAuditEntry
  animation: ChampionAnimation
  fallbackSrc: string | null
}

function buildVisibleAnimationRows(
  visibleEntries: readonly AnimationAuditEntry[],
  readyState: ReadyAnimationAuditState | null,
): VisibleAnimationRow[] {
  if (readyState === null) {
    return []
  }
  return visibleEntries
    .map((entry) => ({
      entry,
      animation: readyState.animationsById.get(entry.id) ?? null,
      fallbackSrc: readyState.fallbackImageById.get(entry.id) ?? null,
    }))
    .filter((row): row is VisibleAnimationRow => row.animation !== null)
}

export function AnimationAuditPage() {
  const { locale, t } = useI18n()
  const model = useAnimationAuditPageModel()
  const location = useLocation()
  const contentScrollRef = useRef<HTMLDivElement | null>(null)
  const { showScrollTop, scrollToTop } = useWorkbenchScrollNavigation({ scrollRef: contentScrollRef })
  const { shareLinkState, copyCurrentLink } = useWorkbenchShareLink(location.pathname, location.search, location.hash)
  const toolbarItems: WorkbenchToolbarItemConfig[] = [
    createWorkbenchBadgeItem({ id: 'flagged', label: t({ zh: `待复核 ${String(model.summary.flagged)}`, en: `Flagged ${String(model.summary.flagged)}` }) }),
    createWorkbenchBadgeItem({ id: 'high', tone: 'muted', label: t({ zh: `高疑似 ${String(model.summary.high)}`, en: `High ${String(model.summary.high)}` }) }),
    createWorkbenchBadgeItem({ id: 'medium', tone: 'muted', label: t({ zh: `中疑似 ${String(model.summary.medium)}`, en: `Medium ${String(model.summary.medium)}` }) }),
    createWorkbenchShareItem({ t, state: shareLinkState, onCopy: copyCurrentLink }),
  ]
  const readyState = model.state.status === 'ready' ? model.state : null
  const visibleRows = useMemo(
    () => buildVisibleAnimationRows(model.visibleEntries, readyState),
    [model.visibleEntries, readyState],
  )
  const missingAnimationCount = readyState ? model.visibleEntries.length - visibleRows.length : 0
  const showAllIcon = model.showAll ? <EyeOff aria-hidden="true" strokeWidth={1.9} /> : <Eye aria-hidden="true" strokeWidth={1.9} />
  const showAllLabel = model.showAll ? t({ zh: '收回短名单', en: 'Collapse shortlist' }) : t({ zh: '展开全部结果', en: 'Show all results' })

  return (
    <ConfiguredWorkbenchPage
      pageClassName="animation-audit-page"
      storageKey="animation-audit"
      ariaLabel={t({ zh: '英雄动图审片台', en: 'Hero animation audit' })}
      shellClassName="workbench-page__shell animation-audit-workbench"
      contentScrollRef={contentScrollRef}
      floatingTopButton={showScrollTop ? { onClick: scrollToTop, detailLabel: t({ zh: '动图审片内容', en: 'Audit content' }) } : undefined}
      toolbar={{
        sections: [
          {
            region: 'lead',
            section: { kind: 'mark', label: 'IDLE AUDIT' },
          },
          {
            region: 'primary',
            section: {
              kind: 'copy',
              kicker: t({ zh: '人工审片', en: 'Human review' }),
              title: t({ zh: '英雄动图审片台', en: 'Hero animation audit' }),
              detail: t({ zh: '把当前默认 sequence 与更像 idle 的候选并排放在一起，只看短名单。', en: 'Compare the current default sequence against idle-like candidates side by side on a short list.' }),
            },
          },
          {
            region: 'actions',
            section: {
              kind: 'items',
              items: toolbarItems,
            },
          },
        ],
      }}
    >
      <WorkbenchContentStack>
        <section className="surface-card animation-audit-controls">
          <div className="surface-card__header">
            <div className="surface-card__header-copy">
              <p className="surface-card__eyebrow">{t({ zh: '审片控制', en: 'Review controls' })}</p>
              <h2 className="surface-card__title">{t({ zh: '先看高疑似，再决定要不要扩表', en: 'Start with the likely-bad rows first' })}</h2>
              <p className="surface-card__description">
                {t({ zh: '每行只有当前默认、推荐候选和一个备选。点“播放这一行”后，就能并排看哪一个更接近游戏里的待机。', en: 'Each row only keeps the current default, one recommended candidate, and one alternate. Press play on a row to compare them side by side.' })}
              </p>
            </div>
          </div>
          <div className="surface-card__body animation-audit-controls__body">
            <div className="animation-audit-summary-grid">
              <div className="animation-audit-summary-card">
                <span>{t({ zh: '总条目', en: 'Total' })}</span>
                <strong>{model.summary.total}</strong>
              </div>
              <div className="animation-audit-summary-card">
                <span>{t({ zh: '待复核', en: 'Flagged' })}</span>
                <strong>{model.summary.flagged}</strong>
              </div>
              <div className="animation-audit-summary-card">
                <span>{t({ zh: '英雄本体', en: 'Hero base' })}</span>
                <strong>{model.summary.heroBase}</strong>
              </div>
              <div className="animation-audit-summary-card">
                <span>{t({ zh: '皮肤', en: 'Skins' })}</span>
                <strong>{model.summary.skin}</strong>
              </div>
            </div>

            <label className="animation-audit-search">
              <span>{t({ zh: '搜索英雄 / 皮肤 / ID', en: 'Search hero / skin / ID' })}</span>
              <input
                type="search"
                value={model.search}
                onChange={(event) => {
                  model.setSearch(event.target.value)
                  model.setShowAll(false)
                }}
                placeholder={t({ zh: '例如：Strix、斯崔克丝、hero:38', en: 'For example: Strix, hero:38' })}
              />
            </label>

            <div className="animation-audit-filter-stack">
              <div className="animation-audit-filter-group">
                <span>{t({ zh: '疑似等级', en: 'Suspicion level' })}</span>
                <div className="animation-audit-pill-row">
                  {LEVEL_FILTERS.map((filter) => (
                    <button
                      key={filter}
                      type="button"
                      className={model.levelFilter === filter ? 'animation-audit-pill animation-audit-pill--active' : 'animation-audit-pill'}
                      onClick={() => {
                        model.setLevelFilter(filter)
                        model.setShowAll(false)
                      }}
                    >
                      {buildLevelLabel(filter, t)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="animation-audit-filter-group">
                <span>{t({ zh: '资源类型', en: 'Kind' })}</span>
                <div className="animation-audit-pill-row">
                  {KIND_FILTERS.map((filter) => (
                    <button
                      key={filter}
                      type="button"
                      className={model.kindFilter === filter ? 'animation-audit-pill animation-audit-pill--active' : 'animation-audit-pill'}
                      onClick={() => {
                        model.setKindFilter(filter)
                        model.setShowAll(false)
                      }}
                    >
                      {buildKindLabel(filter, t)}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <AnimationAuditFeedbackExportPanel
              feedbackSummary={model.feedbackSummary}
              hasFeedback={model.hasFeedback}
              feedbackCopyState={model.feedbackCopyState}
              feedbackPreviewJson={model.feedbackPreviewJson}
              onCopy={model.copyFeedbackJson}
              onClearAll={model.clearAllFeedback}
              t={t}
            />
          </div>
        </section>

        {model.state.status === 'loading' ? (
          <section className="surface-card animation-audit-state-card">
            <div className="surface-card__body">{t({ zh: '正在加载动图审计清单…', en: 'Loading the animation audit manifest…' })}</div>
          </section>
        ) : null}

        {model.state.status === 'error' ? (
          <section className="surface-card animation-audit-state-card">
            <div className="surface-card__body">
              {t({ zh: `无法读取动图审计清单：${model.state.message}`, en: `Failed to read the animation audit manifest: ${model.state.message}` })}
            </div>
          </section>
        ) : null}

        {model.state.status === 'ready' ? (
          <section className="animation-audit-results">
            <div className="animation-audit-results__header">
              <div>
                <p className="animation-audit-results__eyebrow">{t({ zh: '短名单', en: 'Shortlist' })}</p>
                <h2 className="animation-audit-results__title">
                  {t({ zh: `当前显示 ${String(visibleRows.length)} 行`, en: `Showing ${String(visibleRows.length)} rows` })}
                </h2>
                <p className="animation-audit-results__description">
                  {t({ zh: '默认先只给你短名单；如果这一轮不够，再点展开。', en: 'The page starts with a short list first; expand only when you need more.' })}
                </p>
              </div>
              {model.canShowMore ? (
                <button
                  type="button"
                  className="animation-audit-results__show-more"
                  onClick={() => model.setShowAll((value) => !value)}
                >
                  {showAllIcon}
                  {showAllLabel}
                </button>
              ) : null}
            </div>

            {missingAnimationCount > 0 ? (
              <p className="animation-audit-results__notice">
                {t({ zh: `${String(missingAnimationCount)} 行缺少基础动画清单，已跳过展示。`, en: `${String(missingAnimationCount)} rows are missing a base animation manifest and were skipped.` })}
              </p>
            ) : null}

            <div className="animation-audit-results__stack">
              {visibleRows.map(({ entry, animation, fallbackSrc }) => (
                <AnimationAuditComparisonRow
                  key={entry.id}
                  entry={entry}
                  animation={animation}
                  fallbackSrc={fallbackSrc}
                  locale={locale}
                  t={t}
                  feedback={model.feedbackById[entry.id] ?? { verdict: null, tags: [], note: '' }}
                  onVerdictChange={model.setFeedbackVerdict}
                  onTagToggle={model.toggleFeedbackTagById}
                  onNoteChange={model.setFeedbackNote}
                  onClearFeedback={model.clearFeedback}
                />
              ))}
            </div>
          </section>
        ) : null}
      </WorkbenchContentStack>
    </ConfiguredWorkbenchPage>
  )
}
