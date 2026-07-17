import { atom, computed } from 'nanostores'

import { createFollowActions, generateRoomId } from '@/app/collab/awareness'
import { createLocalAwarenessActions } from '@/app/collab/local-awareness'
import {
  createCollabConnectionActions,
  createCollabRuntime,
  createInitialCollabState
} from '@/app/collab/session'
import { DEFAULT_COLLAB_STATE, type CollabState, type RemotePeer } from '@/app/collab/types'
import { createYjsGraphSync } from '@/app/collab/yjs-sync'
import type { EditorStore } from '@/app/editor/active-store'

export { COLLAB_KEY, useCollabInjected, CollabContext } from '@/app/collab/context'
export { DEFAULT_COLLAB_STATE }
export type { CollabState, RemotePeer }

const COLLAB_NAME_STORAGE_KEY = 'op-collab-name'

function readStoredCollabName(): string {
  if (typeof localStorage === 'undefined') return ''
  return localStorage.getItem(COLLAB_NAME_STORAGE_KEY) ?? ''
}

export function useCollab(storeOrGetter: EditorStore | (() => EditorStore)) {
  const getStore = () =>
    typeof storeOrGetter === 'function' ? (storeOrGetter as () => EditorStore)() : storeOrGetter

  const $storedName = atom<string>(readStoredCollabName())
  $storedName.subscribe((name) => {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(COLLAB_NAME_STORAGE_KEY, name)
    }
  })

  const $state = atom<CollabState>(createInitialCollabState($storedName.get()))
  const runtime = createCollabRuntime()
  const $remotePeers = computed($state, (s) => s.peers)
  const getActiveStore = () => runtime.connectedStore ?? getStore()

  const { $followingPeer, followPeer, resetFollow, tickFollow } = createFollowActions(
    getActiveStore,
    () => runtime.awareness
  )
  const { broadcastAwareness, updateCursor, updateSelection, updatePeersList, setLocalName } =
    createLocalAwarenessActions({
      state: $state,
      storedName: $storedName,
      getStore: getActiveStore,
      getAwareness: () => runtime.awareness
    })

  const { syncNodeToYjs, syncAllNodesToYjs, applyYjsToGraph } = createYjsGraphSync({
    getStore: getActiveStore,
    getYdoc: () => runtime.ydoc,
    getYnodes: () => runtime.ynodes,
    getYimages: () => runtime.yimages,
    setSuppressYjsEvents: (value) => {
      runtime.suppressYjsEvents = value
    }
  })
  const { connect, disconnect } = createCollabConnectionActions({
    runtime,
    state: $state,
    getStore,
    updatePeersList,
    tickFollow,
    broadcastAwareness,
    applyYjsToGraph,
    syncNodeToYjs,
    resetFollow
  })

  function shareCurrentDoc(): string {
    const roomId = generateRoomId()
    connect(roomId)
    syncAllNodesToYjs()
    return roomId
  }

  return {
    $state,
    $remotePeers,
    $followingPeer,
    connect,
    disconnect,
    shareCurrentDoc,
    updateCursor,
    updateSelection,
    setLocalName,
    followPeer,
    tickFollow
  }
}
