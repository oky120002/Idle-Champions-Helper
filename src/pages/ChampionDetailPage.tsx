import { useRef } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { BackNavigationIcon } from '../app/AppIcons'
import { useI18n } from '../app/i18n'
import { SurfaceCardStatusStack, type SurfaceCardStatusStackItem } from '../components/SurfaceCardStatusStack'
import { ConfiguredWorkbenchPage } from '../components/workbench/ConfiguredWorkbenchPage'
import {
  WorkbenchSidebarHeader,
  WorkbenchToolbarLeadStatus,
} from '../components/workbench/WorkbenchScaffold'
import { WorkbenchToolbarItems } from '../components/workbench/WorkbenchToolbarItems'
import { useWorkbenchScrollNavigation } from '../components/workbench/useWorkbenchScrollNavigation'
import { useWorkbenchShareLink } from '../components/workbench/useWorkbenchShareLink'
import { getPrimaryLocalizedText, getRoleLabel } from '../domain/localizedText'
import { ChampionDetailBody } from './champion-detail/ChampionDetailBody'
import { ChampionDetailToolbarPrimary } from './champion-detail/ChampionDetailToolbar'
import { buildChampionDetailToolbarItems } from './champion-detail/champion-detail-toolbar-items'
import { DossierSection } from './champion-detail/DossierSection'
import { DETAIL_HASH_PREFIX } from './champion-detail/types'
import { useChampionDetailDerived } from './champion-detail/useChampionDetailDerived'
import { useChampionDetailResources } from './champion-detail/useChampionDetailResources'
import { useChampionDetailSectionState } from './champion-detail/useChampionDetailSectionState'

export function ChampionDetailPage() {
  const { championId } = useParams<{ championId: string }>()
  const location = useLocation()
  const navigate = useNavigate()
  const contentScrollRef = useRef<HTMLDivElement | null>(null)
  const { showScrollTop, scrollToTop } = useWorkbenchScrollNavigation({ scrollRef: contentScrollRef })
  const { locale, t } = useI18n()
  const locationState = location.state as
    | {
        returnTo?: {
          pathname: string
          search: string
        }
        returnLabel?: {
          zh: string
          en: string
        }
      }
    | null
  const backTarget = locationState?.returnTo ?? { pathname: '/champions', search: location.search }
  const backLabel = locationState?.returnLabel ?? { zh: '返回英雄筛选', en: 'Back to champions' }
  const {
    state,
    detail,
    isMissingChampionId,
    isLoading,
    heroIllustration,
    specializationGraphicsById,
    isArtworkDialogOpen,
    selectedSkin,
    selectedSkinAnimation,
    selectedSkinArtworkIds,
    selectedSkinIllustration,
    selectedSkinPreviewUrl,
    openArtworkDialog,
    closeArtworkDialog,
    setSelectedSkinId,
  } = useChampionDetailResources(championId)
  const {
    effectContext,
    specializationColumns,
    ledgerRows,
    ledgerFilterOptions,
    activeLedgerFilterKeySet,
    visibleLedgerRows,
    hiddenLedgerSummary,
    hasCustomLedgerFilterState,
    isShowingAllLedgerTypes,
    upgradeSectionBadges,
    featSectionBadges,
    overviewFields,
    summaryAvailabilityBadges,
    toggleLedgerFilter,
    resetLedgerFilters,
    enableAllLedgerFilters,
  } = useChampionDetailDerived(detail, locale, t)
  const {
    activeSectionId,
    sectionLinks,
    activeSectionLabel,
    activeSectionIndex,
    scrollToSection,
    backToChampions,
    handleBackClick,
  } = useChampionDetailSectionState(detail, location, navigate, backTarget, contentScrollRef, t)
  const shareHash = detail ? `#${DETAIL_HASH_PREFIX}${activeSectionId}` : location.hash
  const { shareLinkState, copyCurrentLink } = useWorkbenchShareLink(location.pathname, location.search, shareHash)
  const toolbarTitle = detail ? getPrimaryLocalizedText(detail.summary.name, locale) : t({ zh: '英雄详情', en: 'Champion detail' })
  const sidebarTitle = toolbarTitle
  const sidebarDetail = detail
    ? t({
        zh: `${detail.summary.seat} 号位 · ${detail.summary.roles.map((role) => getRoleLabel(role, locale)).join(' / ') || '未标注定位'}`,
        en: `Seat ${detail.summary.seat} · ${detail.summary.roles.map((role) => getRoleLabel(role, locale)).join(' / ') || 'No roles'}`,
      })
    : t({ zh: '正在读取英雄资料', en: 'Loading champion dossier' })
  const toolbarDetail = detail
    ? t({ zh: `${detail.summary.seat} 号位 · ${activeSectionLabel}`, en: `Seat ${detail.summary.seat} · ${activeSectionLabel}` })
    : t({ zh: '战术卷宗与章节索引', en: 'Tactical dossier and section index' })
  const toolbarItems = buildChampionDetailToolbarItems({
    detail,
    activeSectionId,
    activeSectionIndex,
    sectionCount: sectionLinks.length,
    upgradeSectionBadges,
    featSectionBadges,
    ledgerRowsCount: ledgerRows.length,
    visibleLedgerRowsCount: visibleLedgerRows.length,
    overviewFields,
    shareLinkState,
    copyCurrentLink,
    t,
  })
  const statusCardItems: SurfaceCardStatusStackItem[] = [
    {
      id: 'loading',
      eyebrow: t({ zh: '英雄详情', en: 'Champion detail' }),
      title: t({ zh: '正在整理英雄卷宗…', en: 'Building the champion dossier…' }),
      description: t({
        zh: '当前会加载结构化详情、成长轨道与技能信息。',
        en: 'This loads the structured profile, progression track, and combat details.',
      }),
      statusItems: [
        {
          id: 'loading-banner',
          tone: 'info',
          children: t({ zh: '正在读取详情数据…', en: 'Loading detail data…' }),
        },
      ],
      hidden: !isLoading,
    },
    {
      id: 'missing-champion',
      eyebrow: t({ zh: '英雄详情', en: 'Champion detail' }),
      title: t({ zh: '没有找到这个英雄', en: 'Champion not found' }),
      description: t({
        zh: '可能是链接里的英雄 ID 不存在，或当前静态数据版本还没有这份详情文件。',
        en: 'The champion id may be invalid, or this data version does not have a detail file yet.',
      }),
      statusItems: [
        {
          id: 'missing-banner',
          tone: 'info',
          children: t({
            zh: '你可以返回筛选页重新进入，或检查当前数据版本是否已重新生成。',
            en: 'Return to the champions page or regenerate the current data version.',
          }),
        },
      ],
      hidden: !(isMissingChampionId || (state.status === 'not-found' && state.championId === championId)),
    },
    {
      id: 'error',
      eyebrow: t({ zh: '英雄详情', en: 'Champion detail' }),
      title: t({ zh: '详情数据读取失败', en: 'Detail data failed to load' }),
      description: t({
        zh: '可能是静态文件缺失，也可能是当前数据合同和页面实现不一致。',
        en: 'The static file may be missing, or the data contract may be out of sync with the page.',
      }),
      statusItems: [
        {
          id: 'error-banner',
          tone: 'error',
          ...(state.status === 'error' && state.championId === championId
            ? { children: state.message || t({ zh: '未知错误', en: 'Unknown error' }) }
            : {}),
        },
      ],
      hidden: state.status !== 'error' || state.championId !== championId,
    },
  ]

  return (
    <ConfiguredWorkbenchPage
      pageClassName="champion-detail-page"
      storageKey="champion-detail"
      ariaLabel={t({ zh: '英雄详情工作台', en: 'Champion detail workbench' })}
      shellClassName="workbench-page__shell champion-detail-workbench"
      contentScrollRef={contentScrollRef}
      floatingTopButton={
        showScrollTop
          ? {
              onClick: scrollToTop,
              detailLabel: t({ zh: '英雄卷宗', en: 'Champion dossier' }),
            }
          : undefined
      }
      toolbarLead={(
        <WorkbenchToolbarLeadStatus
          label="CHAMPION"
          status={detail ? t({ zh: `${detail.summary.seat} 号位`, en: `Seat ${detail.summary.seat}` }) : t({ zh: '读取中', en: 'Loading' })}
          statusTitle={sidebarDetail}
        />
      )}
      toolbarPrimary={(
        <div className="champion-detail-workbench__toolbar-main">
          <Link
            className="action-button action-button--compact action-button--ghost workbench-page__toolbar-action champion-detail-workbench__toolbar-back"
            to={backToChampions}
            onClick={handleBackClick}
            aria-label={t(backLabel)}
            title={t(backLabel)}
          >
            <BackNavigationIcon />
          </Link>
          <ChampionDetailToolbarPrimary
            kicker={t({ zh: '战术卷宗', en: 'Tactical dossier' })}
            title={toolbarTitle}
            detail={toolbarDetail}
            activeSectionId={activeSectionId}
            sectionLinks={sectionLinks}
            tabAriaLabel={t({ zh: '详情页签', en: 'Detail tabs' })}
            scrollToSection={scrollToSection}
          />
        </div>
      )}
      toolbarActions={(
        <div className="champion-detail-workbench__toolbar-actions">
          <WorkbenchToolbarItems items={toolbarItems} />
        </div>
      )}
      sidebar={detail ? (
        <DossierSection
          detail={detail}
          locale={locale}
          t={t}
          heroIllustration={heroIllustration}
          openArtworkDialog={openArtworkDialog}
        />
      ) : undefined}
      sidebarHeader={detail ? (
        <WorkbenchSidebarHeader
          kicker={t({ zh: '英雄卷宗', en: 'Champion dossier' })}
          title={sidebarTitle}
          description={sidebarDetail}
          statusLabel={t({ zh: '英雄状态', en: 'Champion status' })}
          status={summaryAvailabilityBadges.length > 0 ? (
            <div className="champion-dossier__sidebar-status">
              {summaryAvailabilityBadges.map((badge) => (
                <span key={badge.key} className={badge.active ? 'filter-sidebar-panel__badge champion-dossier__sidebar-badge--active' : 'filter-sidebar-panel__badge'}>
                  {badge.label}
                </span>
              ))}
            </div>
          ) : null}
        />
      ) : undefined}
    >
      <SurfaceCardStatusStack items={statusCardItems} />

      {detail && effectContext ? (
        <ChampionDetailBody
          detail={detail}
          locale={locale}
          t={t}
          activeSectionId={activeSectionId}
          overviewFields={overviewFields}
          effectContext={effectContext}
          specializationGraphicsById={specializationGraphicsById}
          specializationColumns={specializationColumns}
          ledgerRows={ledgerRows}
          ledgerFilterOptions={ledgerFilterOptions}
          activeLedgerFilterKeySet={activeLedgerFilterKeySet}
          visibleLedgerRows={visibleLedgerRows}
          hiddenLedgerSummary={hiddenLedgerSummary}
          hasCustomLedgerFilterState={hasCustomLedgerFilterState}
          isShowingAllLedgerTypes={isShowingAllLedgerTypes}
          toggleLedgerFilter={toggleLedgerFilter}
          resetLedgerFilters={resetLedgerFilters}
          enableAllLedgerFilters={enableAllLedgerFilters}
          openArtworkDialog={openArtworkDialog}
          isArtworkDialogOpen={isArtworkDialogOpen}
          selectedSkin={selectedSkin}
          selectedSkinAnimation={selectedSkinAnimation}
          selectedSkinArtworkIds={selectedSkinArtworkIds}
          selectedSkinIllustration={selectedSkinIllustration}
          selectedSkinPreviewUrl={selectedSkinPreviewUrl}
          closeArtworkDialog={closeArtworkDialog}
          setSelectedSkinId={setSelectedSkinId}
        />
      ) : null}
    </ConfiguredWorkbenchPage>
  )
}
