import type { EditorStore } from '#react/app/editor/store'
import { apiClient, documentAPI } from '#react/lib/client'

const AUTOSAVE_MIN_INTERVAL_MS = 120_000
const lastAutosaveAt = new WeakMap<EditorStore, number>()

export async function recordDocumentVersion(
  store: EditorStore,
  kind: 'named' | 'autosave',
  bytes: Uint8Array,
  title?: string,
  description?: string
) {
  const key = store.state.documentKey
  if (!key) throw new Error('No cloud document')
  await documentAPI.createVersion(key, { kind, bytes, title, description })
  if (kind === 'autosave') lastAutosaveAt.set(store, Date.now())
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
  const res = await apiClient.get<ArrayBuffer>('/api/oss/download', {
    params: { path: path.replace(/^\/+/, '') },
    responseType: 'arraybuffer',
    timeout: 120_000
  })
  const payload = res.data
  if (!payload) throw new Error('Empty version file')
  return new Uint8Array(payload)
}
