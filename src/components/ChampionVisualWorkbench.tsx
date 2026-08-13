import { t } from '../app/i18n-messages'
import { StatusBanner } from './StatusBanner'
import { ChampionVisualWorkbenchConsole } from './champion-visual-workbench/ChampionVisualWorkbenchConsole'
import { ChampionVisualWorkbenchHeader } from './champion-visual-workbench/ChampionVisualWorkbenchHeader'
import { ChampionVisualWorkbenchStage } from './champion-visual-workbench/ChampionVisualWorkbenchStage'
import { useChampionVisualWorkbenchModel } from './champion-visual-workbench/useChampionVisualWorkbenchModel'
import type { ChampionVisualWorkbenchProps } from './champion-visual-workbench/types'

export function ChampionVisualWorkbench(props: ChampionVisualWorkbenchProps) {
  const model = useChampionVisualWorkbenchModel(props)
  const { locale, visual } = model

  return (
    <section
      className="visual-workbench"
      aria-label={t(locale, '当前英雄视觉档案')}
    >
      <ChampionVisualWorkbenchHeader model={model} onClose={props.onClose} />

      {!visual ? (
        <StatusBanner
          tone="info"
          title={t(locale, '当前数据版本还没有这名英雄的视觉资源清单')}
          detail={t(locale, '结果卡仍可继续使用本地头像；如果后续基座补到了这名英雄的立绘与皮肤资源，这里会自动接入。')}
        />
      ) : (
        <div className="visual-workbench__layout">
          <ChampionVisualWorkbenchStage model={model} />
          <ChampionVisualWorkbenchConsole model={model} />
        </div>
      )}
    </section>
  )
}
