import { useLayoutEffect, useRef } from 'react'

const MIN_FONT_SCALE = 0.72

interface ChampionCardAffiliationTextProps {
  text: string
  title?: string | null
}

export function ChampionCardAffiliationText({
  text,
  title,
}: ChampionCardAffiliationTextProps) {
  const textRef = useRef<HTMLParagraphElement | null>(null)
  const baseFontSizeRef = useRef<number | null>(null)

  useLayoutEffect(() => {
    const element = textRef.current

    if (element === null) {
      return
    }

    const baseFontSize = baseFontSizeRef.current ?? parseFloat(window.getComputedStyle(element).fontSize)
    baseFontSizeRef.current = baseFontSize

    const applyFontSize = () => {
      const target = textRef.current

      if (target === null) {
        return
      }

      target.style.fontSize = `${baseFontSize}px`

      const availableWidth = target.clientWidth
      const naturalWidth = target.scrollWidth

      if (availableWidth <= 0 || naturalWidth <= availableWidth) {
        return
      }

      const nextFontSize = Math.max(baseFontSize * MIN_FONT_SCALE, (baseFontSize * availableWidth) / naturalWidth)
      target.style.fontSize = `${nextFontSize}px`
    }

    applyFontSize()

    if (typeof ResizeObserver === 'undefined') {
      return
    }

    const resizeObserver = new ResizeObserver(() => {
      applyFontSize()
    })
    resizeObserver.observe(element)

    return () => {
      resizeObserver.disconnect()
    }
  }, [text])

  return (
    <p ref={textRef} className="result-card__affiliation" title={title ?? text}>
      {text}
    </p>
  )
}
