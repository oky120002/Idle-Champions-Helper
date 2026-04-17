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
