import { parseFigFile } from '@open-pencil/core/io'
import type { SceneGraph } from '@open-pencil/scene-graph'

import { downloadOSSObjectViaProxy } from '#react/app/document/oss'
import { asFigObjectPath, legacyJsonObjectPath } from '#react/app/document/oss-path'
import type { EditorStore } from '#react/app/editor/store'
import { addLib } from '#react/graph/remote-lib'
import { documentAPI, type RemoteLibraryCatalogItem } from '#react/lib/client'

async function downloadLibraryObject(path: string): Promise<Uint8Array> {
  const figPath = asFigObjectPath(path)
  try {
    return await downloadOSSObjectViaProxy(figPath)
  } catch (error) {
    const legacy = legacyJsonObjectPath(figPath)
    if (!legacy || legacy === figPath) throw error
    return downloadOSSObjectViaProxy(legacy)
  }
}

/**
 * Remote libraries are private catalog objects. Always use the authenticated `/api/oss/download`
 * proxy — `OSS_READ_MODE=direct` public/presign URLs 404 for `libraries/*` keys.
 */
export async function downloadRemoteLibraryFig(
  item: Pick<RemoteLibraryCatalogItem, 'key' | 'url'>
): Promise<SceneGraph> {
  const bytes = await downloadLibraryObject(item.url)
  return parseFigFile(bytes.slice().buffer, { populate: 'first-page' })
}

export async function addRemoteLibraryToGraph(
  graph: SceneGraph,
  item: RemoteLibraryCatalogItem
): Promise<void> {
  const imported = await downloadRemoteLibraryFig(item)
  addLib(graph, item.key, item.name, item.url, imported)
}

export async function loadDocumentLibraries(store: EditorStore, fileKey: string): Promise<void> {
  const res = await documentAPI.listLibraries(fileKey, store.state.documentVersion)
  if (!res.success || !Array.isArray(res.data)) return
  for (const item of res.data) {
    try {
      await addRemoteLibraryToGraph(store.graph, item)
    } catch (reason) {
      console.warn('[Document] Failed to load library', item.key, reason)
    }
  }
}

export async function attachRemoteLibrary(
  store: EditorStore,
  fileKey: string | undefined,
  item: RemoteLibraryCatalogItem
): Promise<void> {
  await addRemoteLibraryToGraph(store.graph, item)
  store.notify()
  if (!fileKey) return
  await documentAPI.attachLibrary(fileKey, {
    library_key: item.key,
    document_version: store.state.documentVersion,
    library_version: item.version
  })
}
