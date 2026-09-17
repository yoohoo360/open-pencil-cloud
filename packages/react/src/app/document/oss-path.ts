export type OssObjectKind = 'fig' | 'img' | 'op'

export const OSS_BLOBS_DIRECTORY = 'blobs'
export const CONTENT_HASH_PATTERN = /^[0-9a-f]{40}$/

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

export function isContentHash(value: string): boolean {
  return CONTENT_HASH_PATTERN.test(value)
}

export function splitOSSObjectURL(url: string): {
  path: string
  fileName: string
} {
  const normalized = url.replace(/^\/+/, '').replace(/\/+$/, '')
  const slash = normalized.lastIndexOf('/')
  if (slash === -1) {
    return { path: '', fileName: normalized || 'document.json' }
  }
  return {
    path: normalized.slice(0, slash),
    fileName: normalized.slice(slash + 1) || 'document.json'
  }
}

function fileStem(fileName: string): string {
  return fileName.replace(/\.(json|fig)$/i, '') || 'document'
}

export const OSS_THUMBNAIL_FILE_NAME = 'thumbnail.png'

export type CloudDocumentLayout = {
  jsonDirectory: string
  jsonFileName: string
  documentDirectory: string
  blobDirectory: string
  thumbnailPath: string
}

export function cloudDocumentLayout(url: string): CloudDocumentLayout {
  const { path, fileName } = splitOSSObjectURL(url)
  const stem = fileStem(fileName)
  const nested = path === stem || path.endsWith(`/${stem}`)
  const documentDirectory = nested ? path : path ? `${path}/${stem}` : stem
  return {
    jsonDirectory: path,
    jsonFileName: fileName,
    documentDirectory,
    blobDirectory: `${documentDirectory}/${OSS_BLOBS_DIRECTORY}`,
    thumbnailPath: `${documentDirectory}/${OSS_THUMBNAIL_FILE_NAME}`
  }
}

export function ossBlobObjectPath(documentUrl: string, hash: string): string {
  if (!isContentHash(hash)) throw new Error(`Invalid content hash: ${hash}`)
  return `${cloudDocumentLayout(documentUrl).blobDirectory}/${hash}`
}

export function unusedBlobObjectPaths(
  existingPaths: readonly string[],
  keepHashes: ReadonlySet<string>
): string[] {
  const unused: string[] = []
  for (const path of existingPaths) {
    const name = path.split('/').pop() ?? ''
    if (!isContentHash(name) || keepHashes.has(name)) continue
    unused.push(path)
  }
  return unused
}
