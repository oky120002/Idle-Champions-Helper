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
      eyebrow={t({ zh: '阵型编辑', en: 'Formation editor' })}
      title={t({
        zh: '把最近草稿保存 / 恢复接回阵型页闭环',
        en: 'Close the loop on recent-draft save and restore',
      })}
      description={t({
        zh: '当前布局库已改为官方 definitions 自动提取；最近草稿会自动写入当前浏览器的 IndexedDB，不上传到外部。',
        en: 'The layout library now comes from official definitions, and recent drafts are still auto-saved to IndexedDB in the current browser only.',
      })}
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
