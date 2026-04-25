import type { ReactNode } from 'react'
import { SurfaceCard } from './SurfaceCard'

type SurfaceCardSectionListVariant = 'bullet' | 'ordered'
type SurfaceCardSectionLayout = 'stack' | 'split'

export interface SurfaceCardContentSectionItem {
  id: string
  content: ReactNode
  hidden?: boolean
}

export interface SurfaceCardContentSection {
  id: string
  title?: ReactNode
  detail?: ReactNode
  detailClassName?: string
  items?: SurfaceCardContentSectionItem[]
  listVariant?: SurfaceCardSectionListVariant
  hidden?: boolean
}

interface SurfaceCardContentSectionsProps {
  eyebrow?: string
  title?: string
  description?: string
  sections: SurfaceCardContentSection[]
  layout?: SurfaceCardSectionLayout
  className?: string
}

function getListClassName(listVariant: SurfaceCardSectionListVariant | undefined): string {
  return listVariant === 'ordered' ? 'ordered-list' : 'bullet-list'
}

export function SurfaceCardContentSections({
  eyebrow,
  title,
  description,
  sections,
  layout = 'stack',
  className,
}: SurfaceCardContentSectionsProps) {
  const visibleSections = sections
    .filter((section) => !section.hidden)
    .map((section) => ({
      ...section,
      items: section.items?.filter((item) => !item.hidden) ?? [],
    }))
    .filter((section) => section.title !== undefined || section.detail !== undefined || section.items.length > 0)

  if (visibleSections.length === 0) {
    return null
  }

  const content = visibleSections.map((section) => {
    const ListTag = section.listVariant === 'ordered' ? 'ol' : 'ul'

    return (
      <div key={section.id}>
        {section.title !== undefined ? <h3 className="section-heading">{section.title}</h3> : null}
        {section.detail !== undefined ? (
          <p className={section.detailClassName ?? 'supporting-text'}>{section.detail}</p>
        ) : null}
        {section.items.length > 0 ? (
          <ListTag className={getListClassName(section.listVariant)}>
            {section.items.map((item) => (
              <li key={item.id}>{item.content}</li>
            ))}
          </ListTag>
        ) : null}
      </div>
    )
  })

  return (
    <SurfaceCard
      {...(eyebrow !== undefined ? { eyebrow } : {})}
      {...(title !== undefined ? { title } : {})}
      {...(description !== undefined ? { description } : {})}
      {...(className !== undefined ? { className } : {})}
    >
      {layout === 'split' ? <div className="split-grid">{content}</div> : content}
    </SurfaceCard>
  )
}
