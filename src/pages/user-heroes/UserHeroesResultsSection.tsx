import { useEffect, useMemo, useState } from 'react'
import { WorkbenchResultsScaffold } from '../../components/workbench/WorkbenchResultsScaffold'
import { ChampionAvatar } from '../../components/ChampionAvatar'
import { getPrimaryLocalizedText } from '../../domain/localizedText'
import { ChampionRosterFlyout } from '../champions/ChampionRosterFlyout'
import { ChampionRosterSummary } from '../champions/ChampionRosterSummary'
import type { UserHeroesPageModel, UserHeroesRosterMetricFilterId } from './types'
import { getUserHeroProfileSourceLabel } from './userHeroProfileSourceLabel'

interface UserHeroesResultsSectionProps {
  readonly model: UserHeroesPageModel
}

interface OpenFlyoutState {
  championId: string
  anchorRect: DOMRect
}

export function UserHeroesResultsSection({ model }: UserHeroesResultsSectionProps) {
  const { rosterSeatColumns, state, t } = model
  const isZh = model.locale === 'zh-CN'
  const [openFlyout, setOpenFlyout] = useState<OpenFlyoutState | null>(null)
  const hasMatches = rosterSeatColumns.some((column) => column.champions.some((tile) => tile.matchesFilters))

  useEffect(() => {
    const pane = model.resultsPaneRef.current

    if (!pane || !openFlyout) {
      return
    }

    const handleScroll = () => setOpenFlyout(null)

    pane.addEventListener('scroll', handleScroll, { passive: true })
    return () => pane.removeEventListener('scroll', handleScroll)
  }, [model.resultsPaneRef, openFlyout])

  const openTile = useMemo(() => {
    if (!openFlyout || state.status !== 'ready') {
      return null
    }

    for (const column of rosterSeatColumns) {
      const match = column.champions.find((tile) => tile.champion.id === openFlyout.championId)

      if (match) {
        return match
      }
    }

    return null
  }, [openFlyout, rosterSeatColumns, state.status])

  return (
    <WorkbenchResultsScaffold
      ariaLabel={t({ zh: '用户英雄结果', en: 'User heroes results' })}
      sectionClassName="champion-roster"
      shellClassName="results-panel-shell champion-roster__shell"
      panelClassName="results-panel champion-roster__panel"
      isEmpty={false}
      emptyState={{
        children: null,
      }}
    >
      <ChampionRosterSummary
        summary={model.rosterSummary}
        sourceLabel={getUserHeroProfileSourceLabel(model.profileResolution, model.locale)}
        eyebrow={t({ zh: '账号概览', en: 'Account overview' })}
        title={t({ zh: '用户英雄矩阵', en: 'User hero roster' })}
        highlightLabel={t({ zh: '高亮已拥有', en: 'Highlight owned' })}
        activeMetricId={model.activeRosterMetricFilterId}
        onMetricToggle={(metricId) => model.toggleRosterMetricFilter(metricId as UserHeroesRosterMetricFilterId)}
      />

      {!hasMatches ? (
        <p className="champion-roster__status-note">
          {t({
            zh: '当前筛选没有命中；矩阵仍保持全量显示，已拥有但未命中的英雄会降为灰态，未拥有英雄持续保持灰态。',
            en: 'No matches for the current filters. The roster still shows all champions; owned but unfiltered ones appear dimmed, and unowned ones stay dimmed.',
          })}
        </p>
      ) : null}

      <div className="champion-roster__columns" role="list">
        {rosterSeatColumns.map((column) => {
          const ownedCount = column.champions.filter((tile) => tile.isOwned).length

          return (
            <section key={column.seat} className="champion-roster__column" role="listitem" aria-label={isZh ? `${String(column.seat)} 号位` : `Seat ${String(column.seat)}`}>
              <header className="champion-roster__column-header">
                <div>
                  <p className="champion-roster__column-eyebrow">{isZh ? `${String(column.seat)} 号位` : `Seat ${String(column.seat)}`}</p>
                  <h2 className="champion-roster__column-title">{isZh ? `${String(column.seat)}号位` : `Seat ${String(column.seat)}`}</h2>
                </div>
                <span className="champion-roster__column-count">
                  {ownedCount}/{column.champions.length}
                </span>
              </header>

              <div className="champion-roster__tile-list">
                {column.champions.map((tile) => {
                  const primaryName = getPrimaryLocalizedText(tile.champion.name, model.locale)
                  const ownershipSuffix = tile.isOwned
                    ? t({ zh: '，已拥有', en: ', owned' })
                    : t({ zh: '，未拥有', en: ', not owned' })

                  return (
                    <button
                      key={tile.champion.id}
                      type="button"
                      className={`champion-roster-tile champion-roster-tile--${tile.emphasis} ${openFlyout?.championId === tile.champion.id ? 'champion-roster-tile--open' : ''}`}
                      aria-label={`${primaryName}${ownershipSuffix}`}
                      onClick={(event) => {
                        setOpenFlyout({
                          championId: tile.champion.id,
                          anchorRect: event.currentTarget.getBoundingClientRect(),
                        })
                      }}
                    >
                      <ChampionAvatar champion={tile.champion} locale={model.locale} className="champion-avatar--slot-mini" />
                      <span className="champion-roster-tile__name">{primaryName}</span>
                      {tile.ownedHero ? (
                        <span className="champion-roster-tile__meta">
                          {isZh
                            ? `Lv.${String(tile.ownedHero.level)} · ${String(Object.keys(tile.ownedHero.lootBySlot).length)}/6 槽`
                            : `Lv.${String(tile.ownedHero.level)} · ${String(Object.keys(tile.ownedHero.lootBySlot).length)}/6 slots`}
                        </span>
                      ) : (
                        <span className="champion-roster-tile__meta">{t({ zh: '未拥有', en: 'Not owned' })}</span>
                      )}
                    </button>
                  )
                })}
              </div>
            </section>
          )
        })}
      </div>

      {openTile && openFlyout ? (
        <ChampionRosterFlyout
          champion={openTile.champion}
          ownedHero={openTile.ownedHero}
          legendaryLevelCap={model.profileResolution?.snapshot?.legendaryLevelCap ?? 20}
          locale={model.locale}
          locationSearch={model.locationSearch}
          navigationTo="/user-heroes"
          returnToPath="/user-heroes"
          returnLabel={{ zh: '返回用户英雄', en: 'Back to user heroes' }}
          anchorRect={openFlyout.anchorRect}
          onClose={() => setOpenFlyout(null)}
          onNavigate={model.saveListScroll}
        />
      ) : null}
    </WorkbenchResultsScaffold>
  )
}
