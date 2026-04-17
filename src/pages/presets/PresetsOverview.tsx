import type { PresetsPageModel } from './types'

type PresetsOverviewProps = {
  model: PresetsPageModel
}

export function PresetsOverview({ model }: PresetsOverviewProps) {
  const { t } = model

  return (
    <div className="split-grid">
      <div>
        <h3 className="section-heading">{t({ zh: '当前范围', en: 'What works now' })}</h3>
        <ul className="bullet-list">
          <li>{t({ zh: '查看命名方案列表', en: 'Browse named presets' })}</li>
          <li>{t({ zh: '编辑方案名、备注、标签与优先级', en: 'Edit names, notes, tags, and priority' })}</li>
          <li>{t({ zh: '删除不再需要的方案', en: 'Delete presets you no longer need' })}</li>
          <li>{t({ zh: '把方案恢复回阵型页继续编辑', en: 'Restore a preset back to the formation page' })}</li>
        </ul>
      </div>
      <div>
        <h3 className="section-heading">{t({ zh: '当前边界', en: 'Current boundary' })}</h3>
        <p className="supporting-text">
          {t({
            zh: '最近草稿继续留在阵型页自动保存；这里管理的是已命名方案。若要新增方案，请回到阵型页点击“保存为方案”。',
            en: 'Recent drafts remain on the formation page for auto-save; this page manages only named presets. To add one, go back to the formation page and choose “Save as preset.”',
          })}
        </p>
      </div>
    </div>
  )
}
