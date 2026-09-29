import { markCloudDocumentPersisted } from '#react/app/document/cloud-persist'
import { markLocalDraftBaseline } from '#react/app/document/local-draft/baseline'
import type { EditorStore } from '#react/app/editor/store'

/**
 * After open/import, treat the live scene as already synced so autosave
 * (IndexedDB draft + timed cloud upload) does not run until the user edits.
 */
export function acknowledgeDocumentSceneBaseline(store: EditorStore): void {
  markCloudDocumentPersisted(store)
  markLocalDraftBaseline(store)
}
