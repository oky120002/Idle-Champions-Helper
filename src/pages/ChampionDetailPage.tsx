import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { useI18n } from '../app/i18n'
import { SurfaceCard } from '../components/SurfaceCard'
import { ChampionDetailBody } from './champion-detail/ChampionDetailBody'
import { useChampionDetailDerived } from './champion-detail/useChampionDetailDerived'
import { useChampionDetailResources } from './champion-detail/useChampionDetailResources'
import { useChampionDetailSectionState } from './champion-detail/useChampionDetailSectionState'

export function ChampionDetailPage() {
  const { championId } = useParams<{ championId: string }>()
  const location = useLocation()
  const navigate = useNavigate()
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
    upgradePresentations,
    spotlightUpgrades,
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
    sectionProgressValue,
    getSectionProgressState,
    getSectionProgressText,
    scrollToSection,
    backToChampions,
    handleBackClick,
  } = useChampionDetailSectionState(detail, location, navigate, backTarget, t)

  return (
    <div className="page-stack champion-detail-page">
      <div className="page-backlink-row">
        <Link className="page-backlink" to={backToChampions} onClick={handleBackClick}>
          {t(backLabel)}
        </Link>
      </div>

      {isLoading ? (
        <SurfaceCard
          eyebrow={t({ zh: '英雄详情', en: 'Champion detail' })}
          title={t({ zh: '正在整理英雄卷宗…', en: 'Building the champion dossier…' })}
          description={t({
            zh: '当前会加载结构化详情、成长轨道与技能信息。',
            en: 'This loads the structured profile, progression track, and combat details.',
          })}
        >
          <div className="status-banner status-banner--info">{t({ zh: '正在读取详情数据…', en: 'Loading detail data…' })}</div>
        </SurfaceCard>
      ) : null}

      {isMissingChampionId || (state.status === 'not-found' && state.championId === championId) ? (
        <SurfaceCard
          eyebrow={t({ zh: '英雄详情', en: 'Champion detail' })}
          title={t({ zh: '没有找到这个英雄', en: 'Champion not found' })}
          description={t({
            zh: '可能是链接里的英雄 ID 不存在，或当前静态数据版本还没有这份详情文件。',
            en: 'The champion id may be invalid, or this data version does not have a detail file yet.',
          })}
        >
          <div className="status-banner status-banner--info">
            {t({ zh: '你可以返回筛选页重新进入，或检查当前数据版本是否已重新生成。', en: 'Return to the champions page or regenerate the current data version.' })}
          </div>
        </SurfaceCard>
      ) : null}

      {state.status === 'error' && state.championId === championId ? (
        <SurfaceCard
          eyebrow={t({ zh: '英雄详情', en: 'Champion detail' })}
          title={t({ zh: '详情数据读取失败', en: 'Detail data failed to load' })}
          description={t({
            zh: '可能是静态文件缺失，也可能是当前数据合同和页面实现不一致。',
            en: 'The static file may be missing, or the data contract may be out of sync with the page.',
          })}
        >
          <div className="status-banner status-banner--error">
            {state.message || t({ zh: '未知错误', en: 'Unknown error' })}
          </div>
        </SurfaceCard>
      ) : null}

      {detail && effectContext ? (
        <ChampionDetailBody
          detail={detail}
          locale={locale}
          t={t}
          activeSectionId={activeSectionId}
          sectionLinks={sectionLinks}
          activeSectionLabel={activeSectionLabel}
          activeSectionIndex={activeSectionIndex}
          sectionProgressValue={sectionProgressValue}
          getSectionProgressState={getSectionProgressState}
          getSectionProgressText={getSectionProgressText}
          scrollToSection={scrollToSection}
          summaryAvailabilityBadges={summaryAvailabilityBadges}
          overviewFields={overviewFields}
          upgradeSectionBadges={upgradeSectionBadges}
          featSectionBadges={featSectionBadges}
          effectContext={effectContext}
          upgradePresentations={upgradePresentations}
          specializationGraphicsById={specializationGraphicsById}
          spotlightUpgrades={spotlightUpgrades}
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
    </div>
  )
}
