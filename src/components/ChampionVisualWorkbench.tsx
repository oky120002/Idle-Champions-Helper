import { useEffect, useMemo, useState } from 'react'
import { pickLocaleText, type AppLocale } from '../app/i18n'
import { loadRemoteGraphicAssetUrl } from '../data/remoteGraphicAsset'
import {
  formatSeatLabel,
  getPrimaryLocalizedText,
  getSecondaryLocalizedText,
} from '../domain/localizedText'
import type {
  Champion,
  ChampionSkinVisual,
  ChampionVisual,
  RemoteGraphicAsset,
  RemoteGraphicDelivery,
} from '../domain/types'
import { ChampionAvatar } from './ChampionAvatar'
import { StatusBanner } from './StatusBanner'

type AssetSelection = 'hero-base' | 'hero-portrait' | 'skin-base' | 'skin-large' | 'skin-xl' | 'skin-portrait'

type PreviewState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ready'; src: string }
  | { status: 'error'; message: string }

type PreviewResolution =
  | { key: string; status: 'ready'; src: string }
  | { key: string; status: 'error'; message: string }

interface AssetOption {
  id: AssetSelection
  label: string
  hint: string
  asset: RemoteGraphicAsset | null
  stageVariant: 'art' | 'portrait' | 'xl'
}

interface ChampionVisualWorkbenchProps {
  champion: Champion
  visual: ChampionVisual | null
  locale: AppLocale
  onClose: () => void
}

function getDeliveryLabel(delivery: RemoteGraphicDelivery, locale: AppLocale): string {
  if (delivery === 'wrapped-png') {
    return pickLocaleText(locale, {
      zh: '包装头 + PNG',
      en: 'Wrapped header + PNG',
    })
  }

  if (delivery === 'zlib-png') {
    return pickLocaleText(locale, {
      zh: 'zlib 解压 + PNG',
      en: 'zlib inflate + PNG',
    })
  }

  return pickLocaleText(locale, {
    zh: '未知传输格式',
    en: 'Unknown delivery',
  })
}

function buildAssetOptions(
  visual: ChampionVisual | null,
  selectedSkin: ChampionSkinVisual | null,
  locale: AppLocale,
): AssetOption[] {
  return [
    {
      id: 'hero-base',
      label: pickLocaleText(locale, { zh: '本体立绘', en: 'Base art' }),
      hint: pickLocaleText(locale, { zh: '英雄本体远端立绘', en: 'Champion base remote art' }),
      asset: visual?.base ?? null,
      stageVariant: 'art',
    },
    {
      id: 'hero-portrait',
      label: pickLocaleText(locale, { zh: '官方头像', en: 'Official portrait' }),
      hint: pickLocaleText(locale, { zh: '官方 portrait 资源', en: 'Official portrait asset' }),
      asset: visual?.portrait?.remote ?? null,
      stageVariant: 'portrait',
    },
    {
      id: 'skin-base',
      label: pickLocaleText(locale, { zh: '皮肤立绘', en: 'Skin art' }),
      hint: selectedSkin
        ? getPrimaryLocalizedText(selectedSkin.name, locale)
        : pickLocaleText(locale, { zh: '选择一套皮肤后可查看', en: 'Pick a skin to inspect this slot' }),
      asset: selectedSkin?.base ?? null,
      stageVariant: 'art',
    },
    {
      id: 'skin-large',
      label: pickLocaleText(locale, { zh: '皮肤 large', en: 'Skin large' }),
      hint: selectedSkin
        ? getPrimaryLocalizedText(selectedSkin.name, locale)
        : pickLocaleText(locale, { zh: '选择一套皮肤后可查看', en: 'Pick a skin to inspect this slot' }),
      asset: selectedSkin?.large ?? null,
      stageVariant: 'art',
    },
    {
      id: 'skin-xl',
      label: pickLocaleText(locale, { zh: '皮肤 xl', en: 'Skin xl' }),
      hint: selectedSkin
        ? getPrimaryLocalizedText(selectedSkin.name, locale)
        : pickLocaleText(locale, { zh: '选择一套皮肤后可查看', en: 'Pick a skin to inspect this slot' }),
      asset: selectedSkin?.xl ?? null,
      stageVariant: 'xl',
    },
    {
      id: 'skin-portrait',
      label: pickLocaleText(locale, { zh: '皮肤头像', en: 'Skin portrait' }),
      hint: selectedSkin
        ? getPrimaryLocalizedText(selectedSkin.name, locale)
        : pickLocaleText(locale, { zh: '选择一套皮肤后可查看', en: 'Pick a skin to inspect this slot' }),
      asset: selectedSkin?.portrait ?? null,
      stageVariant: 'portrait',
    },
  ]
}

function countVisualSlots(visual: ChampionVisual | null): number {
  if (!visual) {
    return 0
  }

  const heroSlots = Number(Boolean(visual.base)) + Number(Boolean(visual.portrait?.remote))
  const skinSlots = visual.skins.reduce((total, skin) => {
    return total + Number(Boolean(skin.portrait)) + Number(Boolean(skin.base)) + Number(Boolean(skin.large)) + Number(Boolean(skin.xl))
  }, 0)

  return heroSlots + skinSlots
}

function buildPreviewAlt(primaryName: string, assetLabel: string, locale: AppLocale): string {
  return pickLocaleText(locale, {
    zh: `${primaryName}${assetLabel}预览`,
    en: `${primaryName} ${assetLabel} preview`,
  })
}

function getPreviewStageClassName(option: AssetOption | null): string {
  if (!option) {
    return 'visual-workbench__stage'
  }

  return `visual-workbench__stage visual-workbench__stage--${option.stageVariant}`
}

export function ChampionVisualWorkbench({ champion, visual, locale, onClose }: ChampionVisualWorkbenchProps) {
  const primaryName = getPrimaryLocalizedText(champion.name, locale)
  const secondaryName = getSecondaryLocalizedText(champion.name, locale)
  const [selectedSkinId, setSelectedSkinId] = useState<string | null>(visual?.skins[0]?.id ?? null)
  const [selectedAssetId, setSelectedAssetId] = useState<AssetSelection>('hero-base')
  const [previewResolution, setPreviewResolution] = useState<PreviewResolution | null>(null)

  const selectedSkin = useMemo(() => {
    if (!visual?.skins.length || !selectedSkinId) {
      return null
    }

    return visual.skins.find((skin) => skin.id === selectedSkinId) ?? visual.skins[0] ?? null
  }, [selectedSkinId, visual])

  const assetOptions = useMemo(() => buildAssetOptions(visual, selectedSkin, locale), [visual, selectedSkin, locale])
  const availableAssetOptions = useMemo(() => assetOptions.filter((option) => option.asset), [assetOptions])
  const selectedAssetOption =
    availableAssetOptions.find((option) => option.id === selectedAssetId) ?? availableAssetOptions[0] ?? null
  const selectedAsset = selectedAssetOption?.asset ?? null
  const selectedAssetKey = selectedAsset
    ? [selectedAsset.remoteUrl, selectedAsset.sourceVersion ?? 'null', selectedAsset.delivery].join('|')
    : null

  const previewState = useMemo<PreviewState>(() => {
    if (!selectedAssetKey) {
      return { status: 'idle' }
    }

    if (!previewResolution || previewResolution.key !== selectedAssetKey) {
      return { status: 'loading' }
    }

    if (previewResolution.status === 'ready') {
      return { status: 'ready', src: previewResolution.src }
    }

    return { status: 'error', message: previewResolution.message }
  }, [previewResolution, selectedAssetKey])

  useEffect(() => {
    if (!selectedAsset || !selectedAssetKey) {
      return
    }

    let disposed = false

    loadRemoteGraphicAssetUrl(selectedAsset)
      .then((src) => {
        if (disposed) {
          return
        }

        setPreviewResolution({ key: selectedAssetKey, status: 'ready', src })
      })
      .catch((error: unknown) => {
        if (disposed) {
          return
        }

        setPreviewResolution({
          key: selectedAssetKey,
          status: 'error',
          message:
            error instanceof Error && error.message
              ? error.message
              : pickLocaleText(locale, {
                  zh: '当前环境暂时无法实时解包这个官方资源。',
                  en: 'This environment cannot decode the official remote asset right now.',
                }),
        })
      })

    return () => {
      disposed = true
    }
  }, [locale, selectedAsset, selectedAssetKey])

  const skinCount = visual?.skins.length ?? 0
  const visualSlotCount = countVisualSlots(visual)

  return (
    <section
      className="visual-workbench"
      aria-label={pickLocaleText(locale, {
        zh: '当前英雄视觉档案',
        en: 'Current champion visual dossier',
      })}
    >
      <div className="visual-workbench__header">
        <div className="visual-workbench__copy">
          <p className="visual-workbench__eyebrow">{pickLocaleText(locale, { zh: '英雄视觉档案', en: 'Champion visual dossier' })}</p>
          <div className="visual-workbench__title-row">
            <h3 className="visual-workbench__title">{primaryName}</h3>
            <span className="visual-workbench__seat-chip">{formatSeatLabel(champion.seat, locale)}</span>
          </div>
          {secondaryName ? <p className="visual-workbench__secondary">{secondaryName}</p> : null}
          <p className="visual-workbench__description">
            {pickLocaleText(locale, {
              zh: `已登记 ${visualSlotCount} 个远端视觉槽位，涵盖本体立绘、官方头像与 ${skinCount} 套皮肤资源。面板会按需尝试实时解包；如果当前浏览器环境拦截跨域读取，下方仍保留完整的 graphic id、remote path 与原始地址。`,
              en: `The catalog currently tracks ${visualSlotCount} remote visual slots across base art, portraits, and ${skinCount} skin sets. The panel will attempt a live decode on demand, and if the current browser environment blocks cross-origin reads, the full graphic id, remote path, and raw URL remain available below.`,
            })}
          </p>
        </div>

        <div className="visual-workbench__summary-strip" aria-label={pickLocaleText(locale, { zh: '视觉档案概况', en: 'Visual dossier summary' })}>
          <div className="visual-workbench__summary-pill">
            <span className="visual-workbench__summary-label">{pickLocaleText(locale, { zh: '皮肤数', en: 'Skins' })}</span>
            <strong className="visual-workbench__summary-value">{skinCount}</strong>
          </div>
          <div className="visual-workbench__summary-pill">
            <span className="visual-workbench__summary-label">{pickLocaleText(locale, { zh: '远端槽位', en: 'Remote slots' })}</span>
            <strong className="visual-workbench__summary-value">{visualSlotCount}</strong>
          </div>
          <button type="button" className="action-button action-button--ghost visual-workbench__close" onClick={onClose}>
            {pickLocaleText(locale, { zh: '收起档案', en: 'Hide dossier' })}
          </button>
        </div>
      </div>

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
          <div className="visual-workbench__stage-shell">
            <div className={getPreviewStageClassName(selectedAssetOption)}>
              <div className="visual-workbench__stage-grid" aria-hidden="true" />
              <div className="visual-workbench__stage-orb visual-workbench__stage-orb--warm" aria-hidden="true" />
              <div className="visual-workbench__stage-orb visual-workbench__stage-orb--cool" aria-hidden="true" />

              {previewState.status === 'ready' && selectedAssetOption ? (
                <img
                  className={`visual-workbench__preview visual-workbench__preview--${selectedAssetOption.stageVariant}`}
                  src={previewState.src}
                  alt={buildPreviewAlt(primaryName, selectedAssetOption.label, locale)}
                />
              ) : (
                <div className="visual-workbench__stage-empty">
                  <strong className="visual-workbench__stage-empty-title">
                    {selectedAssetOption
                      ? pickLocaleText(locale, {
                          zh: '等待远端资源接入当前环境',
                          en: 'Waiting for the remote asset to become available here',
                        })
                      : pickLocaleText(locale, {
                          zh: '当前英雄没有更多远端视觉资源',
                          en: 'No additional remote visual slots are available for this champion',
                        })}
                  </strong>
                  <p className="visual-workbench__stage-empty-copy">
                    {previewState.status === 'loading'
                      ? pickLocaleText(locale, {
                          zh: '正在尝试实时解包官方远端资源…',
                          en: 'Attempting to decode the official remote asset in real time…',
                        })
                      : pickLocaleText(locale, {
                          zh: '这里优先尝试拉取远端立绘；如果浏览器环境不允许跨域读取，右侧会保留完整元数据，后续仍可用于离线脚本、代理链路或手工抓取。',
                          en: 'This stage tries to pull the remote art first. If the browser environment refuses cross-origin reads, the full metadata remains available on the right for offline scripts, proxy work, or manual retrieval later.',
                        })}
                  </p>
                </div>
              )}

              <div className="visual-workbench__reference-chip">
                <ChampionAvatar champion={champion} locale={locale} className="visual-workbench__reference-avatar" loading="eager" />
                <div className="visual-workbench__reference-copy">
                  <span className="visual-workbench__reference-label">{pickLocaleText(locale, { zh: '卡片参考头像', en: 'Card portrait reference' })}</span>
                  <strong className="visual-workbench__reference-value">{pickLocaleText(locale, { zh: '本地同步资源', en: 'Local synced asset' })}</strong>
                </div>
              </div>
            </div>

            <div className="visual-workbench__stage-footer">
              <span className="visual-workbench__stage-pill">{selectedAssetOption?.label ?? pickLocaleText(locale, { zh: '暂无远端槽位', en: 'No remote slot yet' })}</span>
              {selectedAsset ? <span className="visual-workbench__stage-pill visual-workbench__stage-pill--muted">graphic #{selectedAsset.graphicId}</span> : null}
              {selectedAsset ? <span className="visual-workbench__stage-pill visual-workbench__stage-pill--muted">{getDeliveryLabel(selectedAsset.delivery, locale)}</span> : null}
            </div>
          </div>

          <div className="visual-workbench__console">
            <div className="visual-workbench__resource-panel">
              <div className="visual-workbench__resource-panel-header">
                <strong className="visual-workbench__panel-title">{pickLocaleText(locale, { zh: '资源槽位', en: 'Asset slots' })}</strong>
                <span className="visual-workbench__panel-hint">
                  {pickLocaleText(locale, {
                    zh: '只会按需尝试当前选中的资源，不会批量请求整列结果卡。',
                    en: 'Only the currently selected asset is requested on demand, not the entire result list.',
                  })}
                </span>
              </div>

              <div className="visual-workbench__resource-tabs">
                {assetOptions.map((option) => {
                  const isActive = selectedAssetOption?.id === option.id
                  const isAvailable = Boolean(option.asset)

                  return (
                    <button
                      key={option.id}
                      type="button"
                      className={isActive ? 'visual-workbench__resource-button visual-workbench__resource-button--active' : 'visual-workbench__resource-button'}
                      aria-label={option.label}
                      aria-pressed={isActive}
                      disabled={!isAvailable}
                      onClick={() => setSelectedAssetId(option.id)}
                    >
                      <span className="visual-workbench__resource-label">{option.label}</span>
                      <span className="visual-workbench__resource-meta">{isAvailable ? option.hint : pickLocaleText(locale, { zh: '当前无此槽位', en: 'This slot is unavailable' })}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {visual.skins.length > 0 ? (
              <div className="visual-workbench__skin-panel">
                <div className="visual-workbench__resource-panel-header">
                  <strong className="visual-workbench__panel-title">{pickLocaleText(locale, { zh: '皮肤库', en: 'Skin library' })}</strong>
                  <span className="visual-workbench__panel-hint">
                    {pickLocaleText(locale, {
                      zh: '切换皮肤后，皮肤立绘 / large / xl / 头像槽位会同步更新。',
                      en: 'Switching skins updates the art, large, xl, and portrait slots together.',
                    })}
                  </span>
                </div>
                <div className="visual-workbench__skin-strip">
                  {visual.skins.map((skin) => {
                    const isActive = selectedSkin?.id === skin.id
                    const skinPrimaryName = getPrimaryLocalizedText(skin.name, locale)
                    const skinSecondaryName = getSecondaryLocalizedText(skin.name, locale)
                    const availableCount = [skin.portrait, skin.base, skin.large, skin.xl].filter(Boolean).length

                    return (
                      <button
                        key={skin.id}
                        type="button"
                        className={isActive ? 'visual-workbench__skin-button visual-workbench__skin-button--active' : 'visual-workbench__skin-button'}
                        aria-pressed={isActive}
                        onClick={() => setSelectedSkinId(skin.id)}
                      >
                        <span className="visual-workbench__skin-kicker">skin #{skin.id}</span>
                        <strong className="visual-workbench__skin-name">{skinPrimaryName}</strong>
                        {skinSecondaryName ? <span className="visual-workbench__skin-secondary">{skinSecondaryName}</span> : null}
                        <span className="visual-workbench__skin-meta">
                          {pickLocaleText(locale, {
                            zh: `已登记 ${availableCount} 个资源槽位`,
                            en: `${availableCount} asset slots registered`,
                          })}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            ) : null}

            {previewState.status === 'error' ? (
              <StatusBanner
                tone="info"
                title={pickLocaleText(locale, {
                  zh: '当前环境没有直接拉起这个官方远端资源',
                  en: 'The current environment could not load this official remote asset directly',
                })}
                detail={previewState.message}
                meta={pickLocaleText(locale, {
                  zh: '这通常意味着浏览器环境无法直接读取跨域二进制资源；不过完整元数据已经保留下来，后续仍能接代理、离线脚本或调试链路。',
                  en: 'This usually means the browser environment cannot read the cross-origin binary directly. The full metadata stays available below for a future proxy, offline script, or debugging flow.',
                })}
              />
            ) : null}

            {selectedAsset ? (
              <div className="visual-workbench__meta-grid">
                <div className="visual-workbench__meta-item">
                  <span className="visual-workbench__meta-key">graphic id</span>
                  <strong className="visual-workbench__meta-value">{selectedAsset.graphicId}</strong>
                </div>
                <div className="visual-workbench__meta-item">
                  <span className="visual-workbench__meta-key">delivery</span>
                  <strong className="visual-workbench__meta-value">{getDeliveryLabel(selectedAsset.delivery, locale)}</strong>
                </div>
                <div className="visual-workbench__meta-item visual-workbench__meta-item--wide">
                  <span className="visual-workbench__meta-key">source graphic</span>
                  <strong className="visual-workbench__meta-value visual-workbench__meta-value--mono">{selectedAsset.sourceGraphic}</strong>
                </div>
                <div className="visual-workbench__meta-item">
                  <span className="visual-workbench__meta-key">source version</span>
                  <strong className="visual-workbench__meta-value">{selectedAsset.sourceVersion ?? 'null'}</strong>
                </div>
                <div className="visual-workbench__meta-item visual-workbench__meta-item--wide">
                  <span className="visual-workbench__meta-key">remote path</span>
                  <strong className="visual-workbench__meta-value visual-workbench__meta-value--mono">{selectedAsset.remotePath}</strong>
                </div>
                <div className="visual-workbench__meta-item visual-workbench__meta-item--wide">
                  <span className="visual-workbench__meta-key">remote url</span>
                  <strong className="visual-workbench__meta-value visual-workbench__meta-value--mono">{selectedAsset.remoteUrl}</strong>
                </div>
                <div className="visual-workbench__meta-item visual-workbench__meta-item--wide">
                  <span className="visual-workbench__meta-key">uses</span>
                  <strong className="visual-workbench__meta-value">{selectedAsset.uses.join(', ') || '—'}</strong>
                </div>
              </div>
            ) : null}

            {selectedAsset ? (
              <div className="visual-workbench__link-row">
                <a className="action-button action-button--secondary" href={selectedAsset.remoteUrl} target="_blank" rel="noreferrer">
                  {pickLocaleText(locale, { zh: '打开原始地址', en: 'Open raw URL' })}
                </a>
                <a className="action-button action-button--ghost" href={selectedAsset.remoteUrl} download>
                  {pickLocaleText(locale, { zh: '尝试直接下载', en: 'Try direct download' })}
                </a>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </section>
  )
}
