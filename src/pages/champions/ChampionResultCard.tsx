import { useLayoutEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { ChampionIdentity } from '../../components/ChampionIdentity'
import { resolveDataUrl } from '../../data/client'
import { getChampionAttributeGroupLabel, getChampionAttributeGroups, getChampionTagLabel } from '../../domain/championTags'
import { getLocalizedTextPair, getPrimaryLocalizedText, getRoleLabel } from '../../domain/localizedText'
import type { Champion } from '../../domain/types'
import { ChampionCardAffiliationText } from './ChampionCardAffiliationText'
import { buildChampionCardAttributePills } from './champion-card-model'
import type { ChampionsPageModel } from './types'

interface ChampionResultCardProps {
  champion: Champion
  model: ChampionsPageModel
}

export function ChampionResultCard({ champion, model }: ChampionResultCardProps) {
  const { locale, t, locationSearch, saveListScroll, heroIllustrationByChampionId } = model
  const roleRowRef = useRef<HTMLDivElement | null>(null)
  const attributeTrailRef = useRef<HTMLDivElement | null>(null)
  const attributePills = buildChampionCardAttributePills(getChampionAttributeGroups(champion.tags), {
    selectedAcquisitions: model.selectedAcquisitions,
    selectedMechanics: model.selectedMechanics,
  })
  const heroIllustration = heroIllustrationByChampionId.get(champion.id) ?? null
  const seatLabel = t({ zh: `${champion.seat}位`, en: `Seat ${champion.seat}` })
  const affiliationText =
    champion.affiliations.length > 0
      ? champion.affiliations.map((affiliation) => getPrimaryLocalizedText(affiliation, locale)).join(' / ')
      : null
  const affiliationTitle =
    champion.affiliations.length > 0
      ? champion.affiliations.map((affiliation) => getLocalizedTextPair(affiliation, locale)).join(' / ')
      : null

  useLayoutEffect(() => {
    const element = roleRowRef.current

    if (element === null) {
      return
    }

    const MIN_SCALE = 0.58
    let currentScale = 1

    const applyScale = () => {
      const target = roleRowRef.current

      if (target === null) {
        return
      }

      target.style.setProperty('--champion-card-role-scale', '1')

      const availableWidth = target.clientWidth
      const naturalWidth = target.scrollWidth

      if (availableWidth <= 0 || naturalWidth <= availableWidth) {
        if (currentScale !== 1) {
          currentScale = 1
          target.style.setProperty('--champion-card-role-scale', '1')
        }

        return
      }

      const nextScale = Math.max(MIN_SCALE, availableWidth / naturalWidth)

      if (Math.abs(nextScale - currentScale) < 0.01) {
        return
      }

      currentScale = nextScale
      target.style.setProperty('--champion-card-role-scale', `${nextScale}`)
    }

    applyScale()

    if (typeof ResizeObserver === 'undefined') {
      return
    }

    let frameId: number | null = null
    const scheduleScale = () => {
      if (frameId !== null) {
        window.cancelAnimationFrame(frameId)
      }

      frameId = window.requestAnimationFrame(() => {
        frameId = null
        applyScale()
      })
    }

    const resizeObserver = new ResizeObserver(() => {
      scheduleScale()
    })
    resizeObserver.observe(element)

    return () => {
      if (frameId !== null) {
        window.cancelAnimationFrame(frameId)
      }

      resizeObserver.disconnect()
    }
  }, [champion.id, champion.roles.join('|'), locale])

  useLayoutEffect(() => {
    const element = attributeTrailRef.current

    if (element === null) {
      return
    }

    const MIN_SCALE = 0.5
    let currentScale = 1

    const applyScale = () => {
      const target = attributeTrailRef.current

      if (target === null) {
        return
      }

      let nextScale = 1

      for (let iteration = 0; iteration < 4; iteration += 1) {
        target.style.setProperty('--champion-card-attribute-scale', `${nextScale}`)

        const availableHeight = target.clientHeight
        const naturalHeight = target.scrollHeight

        if (availableHeight <= 0 || naturalHeight <= availableHeight) {
          break
        }

        const candidateScale = Math.max(MIN_SCALE, availableHeight / naturalHeight)

        if (Math.abs(candidateScale - nextScale) < 0.01) {
          nextScale = candidateScale
          target.style.setProperty('--champion-card-attribute-scale', `${nextScale}`)
          break
        }

        nextScale = candidateScale
      }

      if (Math.abs(nextScale - currentScale) < 0.01) {
        return
      }

      currentScale = nextScale
      target.style.setProperty('--champion-card-attribute-scale', `${nextScale}`)
    }

    applyScale()

    if (typeof ResizeObserver === 'undefined') {
      return
    }

    let frameId: number | null = null
    const scheduleScale = () => {
      if (frameId !== null) {
        window.cancelAnimationFrame(frameId)
      }

      frameId = window.requestAnimationFrame(() => {
        frameId = null
        applyScale()
      })
    }

    const resizeObserver = new ResizeObserver(() => {
      scheduleScale()
    })
    resizeObserver.observe(element)

    return () => {
      if (frameId !== null) {
        window.cancelAnimationFrame(frameId)
      }

      resizeObserver.disconnect()
    }
  }, [attributePills.map((pill) => pill.key).join('|'), champion.id, locale])

  return (
    <article
      className="result-card result-card--champion result-card--interactive"
      data-grid-motion-key={champion.id}
    >
      <Link
        className="result-card--link"
        to={{
          pathname: `/champions/${champion.id}`,
          search: locationSearch,
        }}
        state={{ activeNavigationTo: '/champions' }}
        aria-label={t({
          zh: `查看详情：${getPrimaryLocalizedText(champion.name, locale)}`,
          en: `Open details for ${getPrimaryLocalizedText(champion.name, locale)}`,
        })}
        onClick={saveListScroll}
      >
        {heroIllustration ? (
          <div className="result-card__artbackdrop" aria-hidden="true">
            <img
              className="result-card__artbackdrop-image"
              src={resolveDataUrl(heroIllustration.image.path)}
              alt=""
              loading="lazy"
              width={heroIllustration.image.width}
              height={heroIllustration.image.height}
            />
          </div>
        ) : null}

        <div className="result-card__hero-shell">
          <ChampionIdentity
            champion={champion}
            locale={locale}
            eyebrow={seatLabel}
            avatarClassName="champion-avatar--spotlight"
            supporting={
              affiliationText ? (
                <ChampionCardAffiliationText
                  text={affiliationText}
                  title={affiliationTitle ?? affiliationText}
                />
              ) : null
            }
            variant="spotlight"
          />

          <div className="result-card__meta-strip">
            <div ref={roleRowRef} className="tag-row result-card__role-row">
              <span className="tag-pill tag-pill--seat">{seatLabel}</span>
              {champion.roles.map((role) => (
                <span key={role} className="tag-pill">
                  {getRoleLabel(role, locale)}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="result-card__attributes">
          {attributePills.length > 0 ? (
            <div ref={attributeTrailRef} className="tag-row result-card__attribute-trail">
              {attributePills.map((attribute) => {
                const tagLabel = getChampionTagLabel(attribute.tag, locale)
                const groupLabel = getChampionAttributeGroupLabel(attribute.groupId, locale)

                return (
                  <span
                    key={attribute.key}
                    className={`tag-pill tag-pill--muted result-card__attribute-pill result-card__attribute-pill--${attribute.groupId}`}
                    title={`${groupLabel} · ${tagLabel}`}
                  >
                    {tagLabel}
                  </span>
                )
              })}
            </div>
          ) : (
            <p className="supporting-text result-card__attributes-empty">
              {t({
                zh: '当前数据里还没有更多属性标签。',
                en: 'No extra attribute tags are exposed in the current dataset yet.',
              })}
            </p>
          )}
        </div>
      </Link>
    </article>
  )
}
