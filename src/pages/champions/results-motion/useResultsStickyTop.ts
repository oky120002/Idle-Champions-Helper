import { useSiteHeaderOffset } from '../../../app/useSiteHeaderOffset'

export function useResultsStickyTop(): number {
  return useSiteHeaderOffset()
}
