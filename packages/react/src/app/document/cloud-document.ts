import { uploadOSSFig } from '#react/app/document/oss'
import { asFigObjectPath } from '#react/app/document/oss-path'
import { revisionFromDocumentMeta } from '#react/app/document/revision'
import type { EditorStore } from '#react/app/editor/store'
import { documentAPI } from '#react/lib/client'

import { exportFigFile } from '@open-pencil/core/io'
import type { SceneGraph } from '@open-pencil/scene-graph'

export type CloudPersistResult = {
  bytes: Uint8Array
  /** Server `updated_at` after touch, when available. */
  updatedAt?: string | number
}

export async function persistSceneGraphToCloud(
  graph: SceneGraph,
  remoteURL: string,
  options?: {
    canvasKit?: Parameters<typeof exportFigFile>[1]
    renderer?: Parameters<typeof exportFigFile>[2]
    pageId?: string | null
  }
): Promise<Uint8Array> {
  // Always re-encode the live graph so kiwi blobs + images/ are written into
  // the archive (do not reuse an unmodified import snapshot).
  const bytes = await exportFigFile(
    graph,
    options?.canvasKit,
    options?.renderer,
    options?.pageId ?? undefined,
    false,
    { reuseOriginalArchive: false }
  )
  await uploadOSSFig(remoteURL, bytes)
  return bytes
}

export async function persistCloudSceneGraph(store: EditorStore): Promise<CloudPersistResult> {
  const remoteURL = store.state.documentFigURL?.trim()
  if (!remoteURL) throw new Error('No cloud document URL')
  const figURL = asFigObjectPath(remoteURL)
  if (figURL !== remoteURL) {
    store.state.documentFigURL = figURL
    store.notify()
  }
  const bytes = await persistSceneGraphToCloud(store.graph, figURL, {
    canvasKit: store.renderer?.ck,
    renderer: store.renderer ?? undefined,
    pageId: store.state.currentPageId
  })
  const key = store.state.documentKey?.trim()
  let updatedAt: string | number | undefined
  if (key) {
    try {
      const { data } = await documentAPI.touch(key)
      updatedAt = data?.updated_at ?? revisionFromDocumentMeta(data) ?? undefined
    } catch (error) {
      console.warn('[Document] Failed to bump updated_at after save', error)
    }
  }
  return { bytes, updatedAt }
}
