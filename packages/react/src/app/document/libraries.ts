import { readFigFile } from '@open-pencil/core/io'
import type { SceneGraph } from '@open-pencil/scene-graph'

import type { EditorStore } from '#react/app/editor/store'
import { addLib } from '#react/graph/remote-lib'
import {
  apiClient,
  documentAPI,
  type RemoteLibraryCatalogItem
} from '#react/lib/client'

export async function downloadRemoteLibraryFig(
  item: Pick<RemoteLibraryCatalogItem, 'key' | 'url'>
): Promise<SceneGraph> {
  const res = await apiClient.get<ArrayBuffer>('/api/oss/download', {
    params: { path: item.url },
    responseType: 'arraybuffer',
    timeout: 120_000
  })
  const bytes = new Uint8Array(res.data)
  const fileBytes = new Uint8Array(bytes.byteLength)
  fileBytes.set(bytes)
  const file = new File([fileBytes.buffer], `${item.key}.fig`, {
    type: 'application/octet-stream'
  })
  return readFigFile(file, { populate: 'first-page' })
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
  if (!fileKey) return
  await documentAPI.attachLibrary(fileKey, {
    library_key: item.key,
    document_version: store.state.documentVersion,
    library_version: item.version
  })
}
