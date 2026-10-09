import { exportFigFile, parseFigFile } from '@open-pencil/core/io'
import type { ComponentLibraryRevision } from '@open-pencil/core/library'
import type { SceneGraph } from '@open-pencil/scene-graph'

import { downloadOSSObjectViaProxy, uploadOSSFig } from '#react/app/document/oss'
import {
  asFigObjectPath,
  legacyJsonObjectPath,
  libraryFigObjectPath
} from '#react/app/document/oss-path'
import type { EditorStore } from '#react/app/editor/store'
import { addLib, removeLib } from '#react/graph/remote-lib'
import { documentAPI, libraryAPI, type RemoteLibraryCatalogItem } from '#react/lib/client'

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

export async function detachRemoteLibrary(
  store: EditorStore,
  fileKey: string | undefined,
  libraryKey: string
): Promise<void> {
  const documentKey = fileKey?.trim() || store.state.documentKey?.trim()
  removeLib(store.graph, libraryKey)
  store.notify()
  if (!documentKey) {
    throw new Error('Missing document key; library detach was not saved')
  }
  const res = await documentAPI.detachLibrary(documentKey, {
    library_key: libraryKey,
    document_version: store.state.documentVersion || undefined
  })
  if (!res.success) {
    throw new Error(res.message ?? 'Failed to detach library')
  }
}

/**
 * Publish a Vue-style library revision to the existing OSS + `/api/libraries` catalog so other
 * files can add it with {@link attachRemoteLibrary}.
 */
export async function publishLibraryRevisionToCloud(
  store: EditorStore,
  revision: ComponentLibraryRevision
): Promise<RemoteLibraryCatalogItem> {
  // Relative key; upload returns the env-prefixed object key (e.g. pencil-dev/libraries/….fig).
  const relativeUrl = libraryFigObjectPath(revision.manifest.libraryId)
  const bytes = await exportFigFile(
    revision.graph,
    store.renderer?.ck,
    store.renderer ?? undefined,
    undefined,
    false,
    { reuseOriginalArchive: false }
  )
  const url = await uploadOSSFig(relativeUrl, bytes)
  const version = revision.manifest.revisionId.slice(0, 12)
  const res = await libraryAPI.publish({
    key: revision.manifest.libraryId,
    name: revision.manifest.name,
    url,
    version,
    description: revision.manifest.description || undefined
  })
  if (!res.success || !res.data) {
    throw new Error(res.message ?? 'Failed to register published library')
  }
  return res.data
}
