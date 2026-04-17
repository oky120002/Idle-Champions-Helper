import { pickLocaleText } from '../app/i18n'
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
      aria-label={pickLocaleText(locale, {
        zh: '当前英雄视觉档案',
        en: 'Current champion visual dossier',
      })}
    >
      <ChampionVisualWorkbenchHeader model={model} onClose={props.onClose} />

      {!visual ? (
        <StatusBanner
          tone="info"
          title={pickLocaleText(locale, {
            zh: '当前数据版本还没有这名英雄的视觉资源清单',
            en: 'This data version does not expose a visual asset catalog for this champion yet',
          })}
          detail={pickLocaleText(locale, {
            zh: '结果卡仍可继续使用本地头像；如果后续基座补到了这名英雄的立绘与皮肤资源，这里会自动接入。',
            en: 'The result card can still rely on the local portrait, and the dossier will light up automatically once future data builds include this champion visual catalog.',
          })}
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
