const FILTER_WORKBENCH_ROUTE_PATHS = new Set(['/champions', '/illustrations', '/pets', '/variants'])

export function isFilterWorkbenchRoute(pathname: string): boolean {
  return FILTER_WORKBENCH_ROUTE_PATHS.has(pathname)
}
