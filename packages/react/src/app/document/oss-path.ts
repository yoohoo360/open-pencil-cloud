export type OssObjectKind = 'fig' | 'img' | 'op'

export function quarterDirectory(date = new Date()): string {
  const year = date.getFullYear()
  const quarter = Math.floor(date.getMonth() / 3) + 1
  return `${year}Q${quarter}`
}

export function sanitizeStorageSegment(value: string): string {
  const cleaned = value
    .trim()
    .replace(/[\\/]+/g, '-')
    .replace(/\s+/g, '-')
  return cleaned || 'anonymous'
}

export function withCacheBust(url: string, revision?: string | number): string {
  if (!url) return url
  const token = revision === undefined || revision === '' ? Date.now() : revision
  const separator = url.includes('?') ? '&' : '?'
  return `${url}${separator}t=${encodeURIComponent(String(token))}`
}

export function ossObjectDirectory(
  kind: OssObjectKind,
  username: string,
  date = new Date()
): string {
  if (kind === 'op') return `op/${quarterDirectory(date)}`
  return `${kind}/${sanitizeStorageSegment(username)}/${quarterDirectory(date)}`
}

export function opDocumentDirectory(key: string, date = new Date()): string {
  return `op/${quarterDirectory(date)}/${key}`
}

export function splitOSSObjectURL(url: string): {
  path: string
  fileName: string
} {
  const normalized = asFigObjectPath(url)
  const slash = normalized.lastIndexOf('/')
  if (slash === -1) {
    return { path: '', fileName: normalized || 'document.fig' }
  }
  return {
    path: normalized.slice(0, slash),
    fileName: normalized.slice(slash + 1) || 'document.fig'
  }
}

/**
 * Cloud documents are always stored as `.fig`. Legacy rows may still point at
 * `.json` — rewrite the object key so uploads/opens target the fig path.
 */
export function asFigObjectPath(url: string): string {
  const normalized = url.replace(/^\/+/, '').replace(/\/+$/, '').trim()
  if (!normalized) return 'document.fig'
  if (/\.fig$/i.test(normalized)) return normalized.replace(/\.fig$/i, '.fig')
  if (/\.json$/i.test(normalized)) return normalized.replace(/\.json$/i, '.fig')
  return `${normalized}.fig`
}

/** Prefer `.fig`; fall back to a legacy `.json` object if the fig key is missing. */
export function legacyJsonObjectPath(figPath: string): string | null {
  if (!/\.fig$/i.test(figPath)) return null
  return figPath.replace(/\.fig$/i, '.json')
}
