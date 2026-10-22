import { noteAutosaveOpenOrFocus } from '#react/app/document/autosave-gate'
import { markCloudDocumentPersisted } from '#react/app/document/cloud-persist'
import { markLocalDraftBaseline } from '#react/app/document/local-draft/baseline'
import type { EditorStore } from '#react/app/editor/store'

/**
 * After open/import, treat the live scene as already synced and gate autosave
 * for 1 minute so open/import work does not upload or draft immediately.
 */
export function acknowledgeDocumentSceneBaseline(store: EditorStore): void {
  markCloudDocumentPersisted(store)
  markLocalDraftBaseline(store)
  noteAutosaveOpenOrFocus(store)
}
