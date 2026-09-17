import {
  deleteUnusedOSSBinaries,
  downloadOSSBinary,
  uploadOSSBinaries,
  uploadOSSFig
} from '#react/app/document/oss'
import {
  encodeSceneGraphJsonBytes,
  restoreSceneGraphFromJson
} from '#react/app/document/scene-graph-json'
import type { EditorStore } from '#react/app/editor/store'

import { SceneGraph } from '@open-pencil/scene-graph'

export type CloudPersistResult = {
  bytes: Uint8Array
  binaries: Map<string, Uint8Array>
}

export async function persistSceneGraphToCloud(
  graph: SceneGraph,
  remoteURL: string
): Promise<CloudPersistResult> {
  const { bytes, binaries } = encodeSceneGraphJsonBytes(graph)
  await uploadOSSBinaries(remoteURL, binaries)
  await uploadOSSFig(remoteURL, bytes)
  await deleteUnusedOSSBinaries(remoteURL, new Set(binaries.keys()))
  return { bytes, binaries }
}

export async function persistCloudSceneGraph(store: EditorStore): Promise<CloudPersistResult> {
  const remoteURL = store.state.documentFigURL
  if (!remoteURL) throw new Error('No cloud document URL')
  return persistSceneGraphToCloud(store.graph, remoteURL)
}

export function loadCloudBinary(documentUrl: string, hash: string): Promise<Uint8Array> {
  return downloadOSSBinary(documentUrl, hash)
}

export function restoreCloudSceneGraph(
  bytes: Uint8Array,
  documentUrl: string
): Promise<SceneGraph> {
  return restoreSceneGraphFromJson(bytes, (hash) => loadCloudBinary(documentUrl, hash))
}
