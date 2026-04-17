import { FieldGroup } from '../../components/FieldGroup'
import { ChampionIdentity } from '../../components/ChampionIdentity'
import { StatusBanner } from '../../components/StatusBanner'
import { SurfaceCard } from '../../components/SurfaceCard'
import { formatSeatLabel, getLocalizedTextPair, getRoleLabel } from '../../domain/localizedText'
import { getFormationLayoutLabel } from '../../domain/formationLayout'
import { PRESET_PRIORITY_OPTIONS, type FormationPageModel } from './types'

interface FormationPresetCardProps {
  model: FormationPageModel
}

export function FormationPresetCard({ model }: FormationPresetCardProps) {
  const {
    selectedLayout,
    selectedChampions,
    conflictingSeats,
    scenarioRef,
    presetForm,
    presetStatus,
    canSavePreset,
    isSavingPreset,
    locale,
    t,
    updatePresetForm,
    handlePriorityChange,
    handleSavePreset,
    handleOpenPresetsPage,
    getPresetPriorityLabel,
  } = model

  return (
    <SurfaceCard
      eyebrow={t({ zh: '阵型摘要', en: 'Formation summary' })}
      title={t({
        zh: '把工作草稿保存成命名方案，再交给方案存档页管理',
        en: 'Turn the working draft into a named preset',
      })}
      description={t({
        zh: '最近草稿继续留在阵型页自动保存；命名方案会进入方案存档页，后续可编辑、删除并恢复回阵型页。',
        en: 'Recent drafts stay on this page for auto-save, while named presets move into the preset library for later edit, delete, and restore.',
      })}
    >
      <div className="split-grid">
        <div className="form-stack">
          <FieldGroup label={t({ zh: '方案名称', en: 'Preset name' })} labelFor="preset-name">
            <input
              id="preset-name"
              className="text-input"
              type="text"
              value={presetForm.name}
              onChange={(event) => updatePresetForm('name', event.target.value)}
              placeholder={t({
                zh: '例如：速刷常用 10 槽波形',
                en: 'Example: Speed farm core wave 10',
              })}
            />
          </FieldGroup>

          <FieldGroup label={t({ zh: '方案备注', en: 'Preset notes' })} labelFor="preset-description">
            <textarea
              id="preset-description"
              className="text-area"
              rows={4}
              value={presetForm.description}
              onChange={(event) => updatePresetForm('description', event.target.value)}
              placeholder={t({
                zh: '记录这套阵容适合什么目标、还有哪些待补位。',
                en: 'Describe what this formation is for and what still needs tuning.',
              })}
            />
          </FieldGroup>

          <FieldGroup
            label={t({ zh: '场景标签', en: 'Scenario tags' })}
            labelFor="preset-tags"
            hint={t({
              zh: '仅作用户可读标签，不作为恢复主键；可用中英文逗号分隔。',
              en: 'These are reader-friendly tags only, not restore keys. Use commas to separate them.',
            })}
          >
            <input
              id="preset-tags"
              className="text-input"
              type="text"
              value={presetForm.scenarioTagsInput}
              onChange={(event) => updatePresetForm('scenarioTagsInput', event.target.value)}
              placeholder={t({
                zh: '例如：推图，速刷，Time Gate',
                en: 'Example: Push, speed, Time Gate',
              })}
            />
          </FieldGroup>

          <FieldGroup label={t({ zh: '优先级', en: 'Priority' })}>
            <div className="segmented-control">
              {PRESET_PRIORITY_OPTIONS.map((option) => (
                <button
                  key={option}
                  type="button"
                  className={
                    presetForm.priority === option
                      ? 'segmented-control__button segmented-control__button--active'
                      : 'segmented-control__button'
                  }
                  onClick={() => handlePriorityChange(option)}
                >
                  {getPresetPriorityLabel(option)}
                </button>
              ))}
            </div>
          </FieldGroup>

          <div className="button-row">
            <button
              type="button"
              className="action-button action-button--secondary"
              onClick={handleSavePreset}
              disabled={!canSavePreset}
            >
              {isSavingPreset ? t({ zh: '保存中…', en: 'Saving…' }) : t({ zh: '保存为方案', en: 'Save as preset' })}
            </button>
            <button type="button" className="action-button action-button--ghost" onClick={handleOpenPresetsPage}>
              {t({ zh: '查看方案存档', en: 'Open preset library' })}
            </button>
          </div>

          {presetStatus ? (
            <StatusBanner tone={presetStatus.tone} title={presetStatus.title} detail={presetStatus.detail} />
          ) : null}
        </div>

        <div className="preview-grid">
          <PreviewCard
            label={t({ zh: '当前布局', en: 'Current layout' })}
            value={selectedLayout ? getFormationLayoutLabel(selectedLayout, locale) : t({ zh: '未选择', en: 'Not selected' })}
          />
          <PreviewCard label={t({ zh: '可保存英雄数', en: 'Savable champions' })} value={selectedChampions.length} />
          <PreviewCard
            label={t({ zh: 'seat 冲突', en: 'Seat conflicts' })}
            value={conflictingSeats.length > 0 ? conflictingSeats.join(', ') : t({ zh: '无', en: 'None' })}
          />
          <PreviewCard
            label={t({ zh: '场景上下文', en: 'Scenario context' })}
            value={scenarioRef ? `${scenarioRef.kind}:${scenarioRef.id}` : t({ zh: '当前未绑定', en: 'Not linked yet' })}
          />
        </div>
      </div>

      {selectedChampions.length === 0 ? (
        <p className="supporting-text">
          {t({
            zh: '当前还没有放置英雄。先选一个布局，再逐格选择英雄，页面会自动保存最近草稿；至少放置 1 名英雄后才可保存为命名方案。',
            en: 'No champions are placed yet. Pick a layout, fill the slots, and the page will auto-save a recent draft. Place at least one champion before saving a named preset.',
          })}
        </p>
      ) : (
        <div className="results-grid">
          {selectedChampions.map(({ slotId, champion }) => (
            <article key={`${slotId}-${champion.id}`} className="result-card">
              <ChampionIdentity champion={champion} locale={locale} eyebrow={slotId} />
              <p className="supporting-text">{formatSeatLabel(champion.seat, locale)}</p>
              {champion.affiliations.length > 0 ? (
                <p className="supporting-text">
                  {t({ zh: '联动队伍', en: 'Affiliation' })}：
                  {champion.affiliations.map((affiliation) => getLocalizedTextPair(affiliation, locale)).join(' / ')}
                </p>
              ) : null}
              <div className="tag-row">
                {champion.roles.map((role) => (
                  <span key={role} className="tag-pill">
                    {getRoleLabel(role, locale)}
                  </span>
                ))}
              </div>
            </article>
          ))}
        </div>
      )}
    </SurfaceCard>
  )
}

interface PreviewCardProps {
  label: string
  value: string | number
}

function PreviewCard({ label, value }: PreviewCardProps) {
  return (
    <article className="preview-card">
      <span className="preview-card__label">{label}</span>
      <strong className="preview-card__value">{value}</strong>
    </article>
  )
}
