/** Build the Make page URL for a design file + selection (for a new browser tab). */
export function makePageHref(fileKey: string, nodeIds: readonly string[]): string {
  const url = new URL(`/design/${encodeURIComponent(fileKey)}/make`, window.location.origin)
  if (nodeIds.length > 0) url.searchParams.set('nodes', nodeIds.join(','))
  return url.toString()
}

/** Read node ids from the Make page query string. */
export function parseMakeNodeIdsFromSearch(search: string): string[] {
  const raw = new URLSearchParams(search).get('nodes')
  if (!raw) return []
  return raw
    .split(',')
    .map((id) => id.trim())
    .filter((id) => id.length > 0)
}
