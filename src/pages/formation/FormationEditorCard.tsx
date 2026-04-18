import { PageTabHeader } from '../../components/PageTabHeader'
import { StatusBanner } from '../../components/StatusBanner'
import { SurfaceCard } from '../../components/SurfaceCard'
import { FormationBoardEditor } from './FormationBoardEditor'
import { FormationDraftBanner } from './FormationDraftBanner'
import { FormationLayoutFilters } from './FormationLayoutFilters'
import type { FormationPageModel } from './types'

interface FormationEditorCardProps {
  model: FormationPageModel
}

export function FormationEditorCard({ model }: FormationEditorCardProps) {
  const { state, t } = model

  return (
    <SurfaceCard
      headerContent={
        <PageTabHeader
          eyebrow={t({ zh: '阵型编辑', en: 'Formation editor' })}
          accentLabel="FORMATION"
          title={t({ zh: '在本地草稿里编辑阵型并校验站位', en: 'Edit formations locally and validate slot placement' })}
          description={t({
            zh: '布局库来自官方 definitions，最近草稿自动写入当前浏览器；先选版型，再摆位，再决定要不要保存成正式方案。',
            en: 'The layout library comes from official definitions and recent drafts stay browser-local. Pick a layout, place champions, then decide whether the draft is worth saving as a preset.',
          })}
        />
      }
    >
      {state.status === 'loading' ? (
        <StatusBanner tone="info">
          {t({ zh: '正在读取阵型布局和英雄数据…', en: 'Loading layouts and champion data…' })}
        </StatusBanner>
      ) : null}

      {state.status === 'error' ? (
        <StatusBanner
          tone="error"
          title={t({ zh: '阵型数据读取失败', en: 'Formation data failed to load' })}
          detail={state.message}
        />
      ) : null}

      {state.status === 'ready' ? (
        <>
          <FormationDraftBanner model={model} />
          <FormationLayoutFilters model={model} />
          <FormationBoardEditor model={model} />
        </>
      ) : null}
    </SurfaceCard>
  )
}
