import { uploadOSSFig } from '#react/app/document/oss'
import { asFigObjectPath } from '#react/app/document/oss-path'
import type { EditorStore } from '#react/app/editor/store'

import { exportFigFile } from '@open-pencil/core/io'
import type { SceneGraph } from '@open-pencil/scene-graph'

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

export async function persistCloudSceneGraph(store: EditorStore): Promise<Uint8Array> {
  const remoteURL = store.state.documentFigURL?.trim()
  if (!remoteURL) throw new Error('No cloud document URL')
  const figURL = asFigObjectPath(remoteURL)
  if (figURL !== remoteURL) {
    store.state.documentFigURL = figURL
    store.notify()
  }
  return persistSceneGraphToCloud(store.graph, figURL, {
    canvasKit: store.renderer?.ck,
    renderer: store.renderer ?? undefined,
    pageId: store.state.currentPageId
  })
}
