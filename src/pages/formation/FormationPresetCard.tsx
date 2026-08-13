import { Archive, Save } from 'lucide-react'
import { ActionButtons } from '../../components/ActionButtons'
import { LabeledValueCardGrid } from '../../components/LabeledValueCardGrid'
import { ChampionIdentity } from '../../components/ChampionIdentity'
import { PresetFormFields } from '../../components/PresetFormFields'
import { StatusMessageBanner } from '../../components/StatusMessageBanner'
import { SurfaceCard } from '../../components/SurfaceCard'
import { useScenarioLabelLookup } from '../../data/useScenarioLabelLookup'
import { formatSeatLabel, getLocalizedTextPair, getRoleLabel } from '../../domain/localizedText'
import { getFormationLayoutLabel } from '../../domain/formationLayout'
import { PRESET_PRIORITY_OPTIONS, type FormationPageModel } from './types'

interface FormationPresetCardProps {
  readonly model: FormationPageModel
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
    handleSavePreset,
    handleOpenPresetsPage,
    getPresetPriorityLabel,
  } = model
  const getScenarioLabel = useScenarioLabelLookup()
  const saveDisabledReason = computeSaveDisabledReason({
    canSavePreset, isSavingPreset, selectedChampions, t,
  })
  const previewItems = [
    {
      id: 'selected-layout',
      label: t("当前布局"),
      value: selectedLayout ? getFormationLayoutLabel(selectedLayout, locale) : t("未选择"),
    },
    { id: 'savable-champions', label: t("可保存英雄数"), value: selectedChampions.length },
    {
      id: 'seat-conflicts',
      label: t("seat 冲突"),
      value: conflictingSeats.length > 0 ? conflictingSeats.join(', ') : t("无"),
    },
    {
      id: 'scenario-context',
      label: t("场景上下文"),
      value: scenarioRef
        ? (getScenarioLabel(scenarioRef) ?? `${scenarioRef.kind}:${scenarioRef.id}`)
        : t("当前未绑定"),
    },
  ]

  return (
    <SurfaceCard
      eyebrow={t("阵型摘要")}
      title={t("把工作草稿保存成命名方案，再交给方案存档页管理")}
      description={t("最近草稿继续留在阵型页自动保存；命名方案会进入方案存档页，后续可编辑、删除并恢复回阵型页。")}
    >
      <div className="split-grid">
        <div className="form-stack">
          <PresetFormFields
            value={presetForm}
            priorityOptions={PRESET_PRIORITY_OPTIONS}
            nameInputId="preset-name"
            descriptionInputId="preset-description"
            tagsInputId="preset-tags"
            namePlaceholder={t("例如：速刷常用 10 槽波形")}
            descriptionPlaceholder={t("记录这套阵容适合什么目标、还有哪些待补位。")}
            tagsHint={t("仅作用户可读标签，不作为恢复主键；可用中英文逗号分隔。")}
            tagsPlaceholder={t("例如：推图，速刷，Time Gate")}
            nameLabel={t("方案名称")}
            descriptionLabel={t("方案备注")}
            tagsLabel={t("场景标签")}
            priorityLabel={t("优先级")}
            getPriorityOptionLabel={getPresetPriorityLabel}
            onChange={updatePresetForm}
            includeStackClass={false}
          />

          <ActionButtons
            items={[
              {
                id: 'save-preset',
                label: isSavingPreset ? t("保存中…") : t("保存为方案"),
                icon: <Save aria-hidden="true" strokeWidth={1.9} />,
                tone: 'secondary',
                disabled: !canSavePreset,
                disabledReason: saveDisabledReason,
                onClick: handleSavePreset,
              },
              {
                id: 'open-preset-library',
                label: t("查看方案存档"),
                icon: <Archive aria-hidden="true" strokeWidth={1.9} />,
                tone: 'ghost',
                onClick: handleOpenPresetsPage,
              },
            ]}
          />

          <StatusMessageBanner message={presetStatus} />
        </div>

        <LabeledValueCardGrid
          items={previewItems}
          gridClassName="preview-grid"
          cardClassName="preview-card"
          labelClassName="preview-card__label"
          valueClassName="preview-card__value"
        />
      </div>

      {selectedChampions.length === 0 ? (
        <p className="supporting-text">
          {t("当前还没有放置英雄。先选一个布局，再逐格选择英雄，页面会自动保存最近草稿；至少放置 1 名英雄后才可保存为命名方案。")}
        </p>
      ) : (
        <div className="results-grid">
          {selectedChampions.map(({ slotId, champion }) => (
            <article key={`${slotId}-${champion.id}`} className="result-card">
              <ChampionIdentity champion={champion} locale={locale} eyebrow={slotId} />
              <p className="supporting-text">{formatSeatLabel(champion.seat, locale)}</p>
              {champion.affiliations.length > 0 ? (
                <p className="supporting-text">
                  {t("联动队伍")}：
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

interface SaveDisabledReasonContext {
  canSavePreset: boolean
  isSavingPreset: boolean
  selectedChampions: FormationPageModel['selectedChampions']
  t: FormationPageModel['t']
}

function computeSaveDisabledReason({
  canSavePreset, isSavingPreset, selectedChampions, t,
}: SaveDisabledReasonContext): string | undefined {
  if (canSavePreset || isSavingPreset) {
    return
  }
  if (selectedChampions.length === 0) {
    return t("先放置至少 1 名英雄")
  }
  return t("先填写方案名称")
}
