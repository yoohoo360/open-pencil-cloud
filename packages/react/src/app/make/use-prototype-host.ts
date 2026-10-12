import { useEffect } from 'react'

import { renderNodesToImage } from '@open-pencil/core/io'

import type { EditorStore } from '#react/app/editor/store'
import {
  fileKeyFromPayload,
  MakeBridgeType,
  publishMakeBridgeMessage,
  publishMakeSelection,
  requestIdFromPayload,
  subscribeMakeBridge,
  type MakeBaselineResponse,
  type MakeNodePreviewsResponse,
  type MakeSelectionNode,
  type MakeSelectionPayload
} from '#react/app/make/bridge'
import { buildMakeJsxBaseline } from '#react/app/make/jsx'

const HEARTBEAT_MS = 2000
const PREVIEW_SCALE = 0.35

function selectionPayload(store: EditorStore, fileKey: string): MakeSelectionPayload {
  const nodeIds = [...store.state.selectedIds]
  return {
    fileKey,
    nodeIds,
    nodes: nodeIds.map((id) => nodeMeta(store, id))
  }
}

function nodeMeta(store: EditorStore, id: string): MakeSelectionNode {
  const node = store.graph.getNode(id)
  return {
    id,
    name: node?.name?.trim() || id,
    type: node?.type ?? 'UNKNOWN'
  }
}

function findPageId(store: EditorStore, nodeId: string): string {
  let cursor = store.graph.getNode(nodeId)
  while (cursor) {
    if (cursor.type === 'CANVAS') return cursor.id
    cursor = cursor.parentId ? store.graph.getNode(cursor.parentId) : undefined
  }
  return store.state.currentPageId
}

function bytesToDataUrl(bytes: Uint8Array): Promise<string> {
  const copy = new Uint8Array(bytes.byteLength)
  copy.set(bytes)
  const blob = new Blob([copy], { type: 'image/png' })
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error ?? new Error('Failed to encode preview'))
    reader.readAsDataURL(blob)
  })
}

async function renderNodeDataUrl(store: EditorStore, nodeId: string): Promise<string | undefined> {
  const renderer = store.renderer
  if (!renderer) return undefined
  if (!store.graph.getNode(nodeId)) return undefined
  try {
    const bytes = await Promise.resolve(
      renderNodesToImage(renderer.ck, renderer, store.graph, findPageId(store, nodeId), [nodeId], {
        scale: PREVIEW_SCALE,
        format: 'PNG'
      })
    )
    if (!bytes || bytes.byteLength === 0) return undefined
    return await bytesToDataUrl(bytes)
  } catch {
    return undefined
  }
}

/** Design tab host: selection sync, heartbeat, baseline + node previews for Make. */
export function useMakePrototypeHost(
  store: EditorStore,
  fileKey: string | undefined,
  enabled: boolean
) {
  useEffect(() => {
    if (!enabled || !fileKey) return
    const activeFileKey = fileKey

    function publishSelection() {
      publishMakeSelection(selectionPayload(store, activeFileKey))
    }

    function publishHeartbeat() {
      publishMakeBridgeMessage(MakeBridgeType.Heartbeat, { fileKey: activeFileKey })
    }

    async function replyBaseline(nodeIds: string[], requestId: string) {
      const response: MakeBaselineResponse = {
        fileKey: activeFileKey,
        requestId,
        code: '',
        error: undefined
      }
      try {
        const ids = nodeIds.length > 0 ? nodeIds : [...store.state.selectedIds]
        response.code = buildMakeJsxBaseline(store.graph, ids).code
      } catch (cause) {
        response.error = cause instanceof Error ? cause.message : String(cause)
      }
      publishMakeBridgeMessage(MakeBridgeType.BaselineResponse, response)
    }

    async function replyPreviews(nodeIds: string[], requestId: string) {
      const ids = nodeIds.length > 0 ? nodeIds : [...store.state.selectedIds]
      const nodes: MakeSelectionNode[] = []
      for (const id of ids) {
        const meta = nodeMeta(store, id)
        meta.imageDataUrl = await renderNodeDataUrl(store, id)
        nodes.push(meta)
      }
      const response: MakeNodePreviewsResponse = {
        fileKey: activeFileKey,
        requestId,
        nodes
      }
      publishMakeBridgeMessage(MakeBridgeType.NodePreviewsResponse, response)
    }

    publishSelection()
    publishHeartbeat()
    const heartbeat = window.setInterval(publishHeartbeat, HEARTBEAT_MS)
    const stopSelection = store.onEditorEvent('selection:changed', publishSelection)
    const stopBridge = subscribeMakeBridge((message) => {
      const key = fileKeyFromPayload(message.payload)
      if (key && key !== activeFileKey) return

      if (message.type === MakeBridgeType.RequestSelection || message.type === MakeBridgeType.Ping) {
        publishSelection()
        publishMakeBridgeMessage(MakeBridgeType.Pong, { fileKey: activeFileKey })
        publishHeartbeat()
        return
      }

      if (message.type === MakeBridgeType.RequestBaseline) {
        const requestId = requestIdFromPayload(message.payload)
        const nodeIds =
          message.payload &&
          typeof message.payload === 'object' &&
          Array.isArray((message.payload as { nodeIds?: unknown }).nodeIds)
            ? ((message.payload as { nodeIds: string[] }).nodeIds)
            : []
        void replyBaseline(nodeIds, requestId)
        return
      }

      if (message.type === MakeBridgeType.RequestNodePreviews) {
        const requestId = requestIdFromPayload(message.payload)
        const nodeIds =
          message.payload &&
          typeof message.payload === 'object' &&
          Array.isArray((message.payload as { nodeIds?: unknown }).nodeIds)
            ? ((message.payload as { nodeIds: string[] }).nodeIds)
            : []
        void replyPreviews(nodeIds, requestId)
      }
    })

    return () => {
      window.clearInterval(heartbeat)
      stopSelection()
      stopBridge()
    }
  }, [store, fileKey, enabled])
}
