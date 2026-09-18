import { downloadOSSFig, uploadOSSFig } from '#react/app/document/oss'
import { asFigObjectPath } from '#react/app/document/oss-path'
import type { EditorStore } from '#react/app/editor/store'
import { documentAPI } from '#react/lib/client'

const AUTOSAVE_MIN_INTERVAL_MS = 120_000
const lastAutosaveAt = new WeakMap<EditorStore, number>()

/**
 * Create version metadata, then upload the .fig snapshot via OSS.
 * Uses OSS_UPLOAD_MODE (direct presign vs /api/oss proxy) — never posts the
 * binary through /api/document/.../versions (avoids Content Too Large).
 */
export async function recordDocumentVersion(
  store: EditorStore,
  kind: 'named' | 'autosave',
  bytes: Uint8Array,
  title?: string,
  description?: string
) {
  const key = store.state.documentKey
  if (!key) throw new Error('No cloud document')
  const { data } = await documentAPI.createVersion(key, { kind, title, description })
  if (!data?.url) throw new Error('Version create returned no URL')
  await uploadOSSFig(asFigObjectPath(data.url), bytes)
  if (kind === 'autosave') lastAutosaveAt.set(store, Date.now())
  return data
}

export async function maybeRecordAutosave(store: EditorStore, bytes: Uint8Array): Promise<void> {
  if (!store.state.documentKey || store.state.historyPreviewId) return
  const last = lastAutosaveAt.get(store) ?? 0
  if (Date.now() - last < AUTOSAVE_MIN_INTERVAL_MS) return
  try {
    await recordDocumentVersion(store, 'autosave', bytes)
  } catch (error) {
    console.warn('[Version history] Autosave snapshot failed', error)
  }
}

export async function downloadVersionFig(path: string): Promise<Uint8Array> {
  const payload = await downloadOSSFig(path)
  if (payload.byteLength === 0) throw new Error('Empty version file')
  return payload
}
