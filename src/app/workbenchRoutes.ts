const WORKBENCH_ROUTE_PATHS = new Set([
  '/champions',
  '/illustrations',
  '/pets',
  '/variants',
  '/formation',
  '/presets',
  '/user-data',
])

export function isWorkbenchRoute(pathname: string): boolean {
  return (
    WORKBENCH_ROUTE_PATHS.has(pathname) ||
    pathname.startsWith('/champions/') ||
    pathname.startsWith('/illustrations/')
  )
}
