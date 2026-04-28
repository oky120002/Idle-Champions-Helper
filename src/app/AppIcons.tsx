export function MobileMenuIcon({ isOpen }: { isOpen: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      {isOpen ? (
        <>
          <path d="M6.5 6.5 17.5 17.5" strokeLinecap="round" />
          <path d="M17.5 6.5 6.5 17.5" strokeLinecap="round" />
        </>
      ) : (
        <>
          <path d="M4.5 7h15" strokeLinecap="round" />
          <path d="M4.5 12h15" strokeLinecap="round" />
          <path d="M4.5 17h15" strokeLinecap="round" />
        </>
      )}
    </svg>
  )
}

export function DisclosureCaretIcon({ isOpen }: { isOpen: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      {isOpen ? (
        <path d="M6 14.5 12 9.5 18 14.5" strokeLinecap="round" strokeLinejoin="round" />
      ) : (
        <path d="M6 9.5 12 14.5 18 9.5" strokeLinecap="round" strokeLinejoin="round" />
      )}
    </svg>
  )
}

export function SidebarToggleIcon({ isCollapsed }: { isCollapsed: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
      <path d="M5.75 5.75h12.5v12.5H5.75z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M10.25 5.75v12.5" strokeLinecap="round" strokeOpacity="0.3" />
      {isCollapsed ? (
        <path d="m13 9 3.25 3L13 15" strokeLinecap="round" strokeLinejoin="round" />
      ) : (
        <path d="m15.25 9-3.25 3 3.25 3" strokeLinecap="round" strokeLinejoin="round" />
      )}
    </svg>
  )
}

export function BackNavigationIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M14.5 6.5 9 12l5.5 5.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9.75 12h9" strokeLinecap="round" />
    </svg>
  )
}
