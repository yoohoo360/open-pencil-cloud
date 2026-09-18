import { readLocalDraft, removeLocalDraft } from '#react/app/document/local-draft/idb'
import { promptRestoreLocalDraft } from '#react/app/document/local-draft/prompt'
import type { LocalDraft } from '#react/app/document/local-draft/types'

function toMillis(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined || value === '') return null
  if (typeof value === 'number' && Number.isFinite(value)) {
    // Seconds vs milliseconds
    return value < 1e12 ? value * 1000 : value
  }
  const parsed = Date.parse(String(value))
  return Number.isFinite(parsed) ? parsed : null
}

function isLocalNewer(
  localSavedAt: string,
  remoteSavedAt: string | number | null | undefined
): boolean {
  const localTime = toMillis(localSavedAt)
  const remoteTime = toMillis(remoteSavedAt)
  if (localTime === null) return false
  if (remoteTime === null) return true
  // Require a meaningful skew so equal cloud/local sync clocks do not re-prompt.
  return localTime - remoteTime > 1_500
}

/**
 * If IndexedDB has a newer .fig draft for this document key than the remote
 * timestamp, ask (in-app dialog) whether to restore it.
 * Discard / cancel deletes the cached draft.
 */
export async function maybeRestoreLocalDraft(
  documentKey: string,
  remoteSavedAt: string | number | null | undefined
): Promise<LocalDraft | null> {
  const key = documentKey.trim()
  if (!key) return null
  const draft = await readLocalDraft(key)
  if (!draft) return null
  if (!isLocalNewer(draft.savedAt, remoteSavedAt)) {
    // Stale or already synced — drop so it cannot keep prompting.
    await removeLocalDraft(key)
    return null
  }
  const restore = await promptRestoreLocalDraft(draft.documentName)
  if (!restore) {
    await removeLocalDraft(key)
    return null
  }
  return draft
}
