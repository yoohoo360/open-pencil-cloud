import { hasRemoteCollaborators } from '#react/app/collab/awareness'
import { connectCollabRoom } from '#react/app/collab/room'
import type { CollabRoomTransport } from '#react/app/collab/transport/types'
import { bindCollabGraphEvents, registerYjsObservers } from '#react/app/collab/yjs-sync'
import type { EditorStore } from '#react/app/editor/store'
import * as awarenessProtocol from 'y-protocols/awareness'
import * as Y from 'yjs'

export type CollabRuntime = {
  roomId: string | null
  ydoc: Y.Doc | null
  awareness: awarenessProtocol.Awareness | null
  ynodes: Y.Map<Y.Map<unknown>> | null
  yimages: Y.Map<Uint8Array> | null
  room: CollabRoomTransport | null
  suppressGraphSync: boolean
  suppressYjsEvents: boolean
  /**
   * When false, the room is presence-only: no graph↔Yjs sync.
   * Enabled on the first remote collaborator; disabled again when alone.
   */
  documentSyncEnabled: boolean
  unbindGraphEvents: (() => void) | null
  stopZoomWatch: (() => void) | null
}

export function createCollabRuntime(): CollabRuntime {
  return {
    roomId: null,
    ydoc: null,
    awareness: null,
    ynodes: null,
    yimages: null,
    room: null,
    suppressGraphSync: false,
    suppressYjsEvents: false,
    documentSyncEnabled: false,
    unbindGraphEvents: null,
    stopZoomWatch: null
  }
}

/** Turn document sync on when peers are present (or forced by peer-join). */
export function refreshCollabDocumentSync(
  runtime: CollabRuntime,
  syncAllNodesToYjs: () => void,
  options?: { forceEnable?: boolean }
): void {
  const forceEnable = options?.forceEnable === true
  const awareness = runtime.awareness
  const hasPeers = awareness ? hasRemoteCollaborators(awareness) : false
  if (!forceEnable && !hasPeers) {
    runtime.documentSyncEnabled = false
    return
  }
  if (runtime.documentSyncEnabled) return
  runtime.documentSyncEnabled = true
  syncAllNodesToYjs()
}

export function connectCollabSession({
  roomId,
  runtime,
  store,
  setConnected,
  updatePeersList,
  applyYjsToGraph,
  syncNodeToYjs,
  syncAllNodesToYjs
}: {
  roomId: string
  runtime: CollabRuntime
  store: EditorStore
  setConnected: () => void
  updatePeersList: () => void
  applyYjsToGraph: (events: Y.YEvent<Y.Map<unknown>>[]) => void
  syncNodeToYjs: (nodeId: string) => void
  syncAllNodesToYjs: () => void
}) {
  if (runtime.room && runtime.roomId === roomId) return
  if (runtime.room) disposeCollabSession(runtime, store)
  runtime.roomId = roomId
  runtime.documentSyncEnabled = false
  runtime.ydoc = new Y.Doc()
  runtime.awareness = new awarenessProtocol.Awareness(runtime.ydoc)
  runtime.ynodes = runtime.ydoc.getMap('nodes')
  runtime.yimages = runtime.ydoc.getMap('images')

  runtime.awareness.on('change', () => {
    refreshCollabDocumentSync(runtime, syncAllNodesToYjs)
    updatePeersList()
  })

  registerYjsObservers({
    store,
    ynodes: runtime.ynodes,
    yimages: runtime.yimages,
    getSuppressYjsEvents: () => runtime.suppressYjsEvents,
    setSuppressGraphSync: (value) => {
      runtime.suppressGraphSync = value
    },
    applyYjsToGraph
  })

  runtime.room = connectCollabRoom({
    roomId,
    ydoc: runtime.ydoc,
    awareness: runtime.awareness,
    setConnected,
    updatePeersList,
    onBeforePeerJoinSync: () => {
      // Transport peer-join can arrive before awareness lists the remote client.
      refreshCollabDocumentSync(runtime, syncAllNodesToYjs, { forceEnable: true })
    }
  })

  runtime.stopZoomWatch = store.onEditorEvent('viewport:changed', (viewport) => {
    const awareness = runtime.awareness
    if (!awareness) return
    const prev = awareness.getLocalState()?.cursor as
      | { x: number; y: number; pageId: string; zoom: number }
      | undefined
    if (prev) awareness.setLocalStateField('cursor', { ...prev, zoom: viewport.zoom })
  })

  runtime.unbindGraphEvents = bindCollabGraphEvents({
    store,
    getYdoc: () => runtime.ydoc,
    getYnodes: () => runtime.ynodes,
    getSuppressGraphSync: () => runtime.suppressGraphSync,
    getDocumentSyncEnabled: () => runtime.documentSyncEnabled,
    setSuppressYjsEvents: (value) => {
      runtime.suppressYjsEvents = value
    },
    syncNodeToYjs,
    syncAllNodesToYjs
  })
}

export function disposeCollabSession(runtime: CollabRuntime, store: EditorStore) {
  runtime.unbindGraphEvents?.()
  runtime.stopZoomWatch?.()
  void runtime.room?.leave()
  runtime.awareness?.destroy()
  runtime.ydoc?.destroy()
  store.state.remoteCursors = []
  store.requestRender()
  runtime.unbindGraphEvents = null
  runtime.stopZoomWatch = null
  runtime.room = null
  runtime.roomId = null
  runtime.awareness = null
  runtime.ydoc = null
  runtime.ynodes = null
  runtime.yimages = null
  runtime.documentSyncEnabled = false
}
