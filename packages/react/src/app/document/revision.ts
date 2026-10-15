import { documentAPI, type PencilDocument } from '#react/lib/client'

/**
 * Pick a cache-bust / freshness token from document metadata.
 * Prefer `updated_at` (epoch millis from GET /api/document/{key}), then other time fields / version.
 */
export function revisionFromDocumentMeta(
  meta: PencilDocument | undefined | null
): string | number | undefined {
  if (!meta) return undefined
  const extra = meta as PencilDocument & Record<string, unknown>
  const candidates: unknown[] = [
    meta.updated_at,
    extra.updatedAt,
    extra.content_updated_at,
    extra.last_modified_at,
    extra.modified_at,
    extra.update_time,
    meta.version
  ]
  for (const value of candidates) {
    if (value === undefined || value === null || value === '') continue
    if (typeof value === 'string' || typeof value === 'number') return value
  }
  return undefined
}

function isTimeLikeRevision(value: string | number): boolean {
  if (typeof value === 'number' && Number.isFinite(value)) return true
  if (typeof value !== 'string') return false
  if (/^\d+$/.test(value)) return true
  return Number.isFinite(Date.parse(value))
}

/**
 * Resolve a revision for .fig cache-bust and local-draft comparison.
 * When the document GET has no update time, fall back to versions `current_updated_at`.
 */
export async function resolveDocumentRevision(
  meta: PencilDocument | undefined,
  documentKey: string,
  signal?: AbortSignal
): Promise<{ revision: string | number; updatedAt?: string | number }> {
  const fromMeta = revisionFromDocumentMeta(meta)
  if (fromMeta !== undefined && isTimeLikeRevision(fromMeta)) {
    return { revision: fromMeta, updatedAt: fromMeta }
  }

  const key = documentKey.trim()
  if (key) {
    try {
      signal?.throwIfAborted()
      const { data } = await documentAPI.listVersions(key, { named_limit: 1 })
      signal?.throwIfAborted()
      const current = data?.current_updated_at
      if (current) {
        return {
          revision: current,
          updatedAt: current
        }
      }
    } catch (error) {
      if (signal?.aborted || (error instanceof DOMException && error.name === 'AbortError')) {
        throw error
      }
      // Versions endpoint is optional for open; continue with weaker tokens.
    }
  }

  if (fromMeta !== undefined) {
    // Non-time `version` string — fine for CDN bust, not for draft clock compare.
    return { revision: fromMeta }
  }

  return { revision: Date.now() }
}
