const WORKBENCH_ROUTE_PATHS = new Set([
  '/champions',
  '/user-heroes',
  '/illustrations',
  '/pets',
  '/variants',
  '/formation',
  '/presets',
  '/planner',
  '/user-data',
  '/search',
])

export function isWorkbenchRoute(pathname: string): boolean {
  return (
    WORKBENCH_ROUTE_PATHS.has(pathname) ||
    pathname.startsWith('/champions/') ||
    pathname.startsWith('/illustrations/') ||
    pathname.startsWith('/planner/')
  )
}
