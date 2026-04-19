import { type MouseEvent } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import type { LocaleText } from '../../app/i18n'

interface ChampionDetailNavBackLinkProps {
  backLabel: LocaleText
  backTarget: {
    pathname: string
    search: string
  }
  onBackClick: (event: MouseEvent<HTMLAnchorElement>) => void
  t: (text: LocaleText) => string
}

function BackLinkContent({ backLabel, backTarget, onBackClick, t }: ChampionDetailNavBackLinkProps) {
  return (
    <Link className="page-backlink site-nav__backlink" to={backTarget} onClick={onBackClick}>
      {t(backLabel)}
    </Link>
  )
}

export function ChampionDetailNavBackLink(props: ChampionDetailNavBackLinkProps) {
  const navSlotTarget =
    typeof document === 'undefined' ? null : document.getElementById('site-nav-leading-slot')

  return (
    <>
      {navSlotTarget ? createPortal(<BackLinkContent {...props} />, navSlotTarget) : null}
      <div className="page-backlink-row champion-detail-page__mobile-backlink">
        <BackLinkContent {...props} />
      </div>
    </>
  )
}
