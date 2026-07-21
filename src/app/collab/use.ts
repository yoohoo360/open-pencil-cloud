import { useEffect, useMemo, useRef, useState } from 'react'

import { createFollowActions, generateRoomId } from '@/app/collab/awareness'
import { createLocalAwarenessActions } from '@/app/collab/local-awareness'
import {
  createCollabConnectionActions,
  createCollabRuntime,
  createInitialCollabState,
  type MutableValue
} from '@/app/collab/session'
import { DEFAULT_COLLAB_STATE, type CollabState, type RemotePeer } from '@/app/collab/types'
import { createYjsGraphSync } from '@/app/collab/yjs-sync'
import type { EditorStore } from '@/app/editor/active-store'

export { COLLAB_KEY, CollabProvider, useCollabInjected } from '@/app/collab/context'
export { DEFAULT_COLLAB_STATE }
export type { CollabState, RemotePeer }

export function useCollab(storeOrGetter: EditorStore | (() => EditorStore)) {
  const getStoreRef = useRef<() => EditorStore>(() =>
    typeof storeOrGetter === 'function' ? storeOrGetter() : storeOrGetter
  )
  getStoreRef.current = () =>
    typeof storeOrGetter === 'function' ? storeOrGetter() : storeOrGetter

  const [storedName, setStoredName] = useState(() => {
    if (typeof window === 'undefined') return ''
    return window.localStorage.getItem('op-collab-name') ?? ''
  })
  const [stateValue, setStateValue] = useState<CollabState>(() =>
    createInitialCollabState(storedName)
  )
  const [followingPeerValue, setFollowingPeerValue] = useState<number | null>(null)
  const runtime = useMemo(createCollabRuntime, [])
  const stateValueRef = useRef(stateValue)
  const storedNameValueRef = useRef(storedName)
  const followingPeerValueRef = useRef(followingPeerValue)
  stateValueRef.current = stateValue
  storedNameValueRef.current = storedName
  followingPeerValueRef.current = followingPeerValue

  const state = useRef<MutableValue<CollabState> | null>(null)
  if (!state.current) {
    state.current = {
      get value() {
        return stateValueRef.current
      },
      set value(value) {
        setStateValue(value)
      }
    }
  }
  const storedNameRef = useRef<MutableValue<string> | null>(null)
  if (!storedNameRef.current) {
    storedNameRef.current = {
      get value() {
        return storedNameValueRef.current
      },
      set value(value) {
        setStoredName(value)
        if (typeof window !== 'undefined') window.localStorage.setItem('op-collab-name', value)
      }
    }
  }
  const followingPeer = useRef<MutableValue<number | null> | null>(null)
  if (!followingPeer.current) {
    followingPeer.current = {
      get value() {
        return followingPeerValueRef.current
      },
      set value(value) {
        setFollowingPeerValue(value)
      }
    }
  }

  const result = useMemo(() => {
    const getStore = () => getStoreRef.current()
    const getActiveStore = () => runtime.connectedStore ?? getStore()
    const stateRef = state.current
    const nameRef = storedNameRef.current
    const followRef = followingPeer.current
    if (!stateRef || !nameRef || !followRef) throw new Error('Collaboration state not initialized')

    const {
      followingPeer: following,
      followPeer,
      resetFollow,
      tickFollow
    } = createFollowActions(getActiveStore, () => runtime.awareness, followRef)
    const { broadcastAwareness, updateCursor, updateSelection, updatePeersList, setLocalName } =
      createLocalAwarenessActions({
        state: stateRef,
        storedName: nameRef,
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
      state: stateRef,
      getStore,
      updatePeersList,
      tickFollow,
      broadcastAwareness,
      applyYjsToGraph,
      syncNodeToYjs,
      resetFollow
    })
    return {
      state: stateRef,
      remotePeers: {
        get value() {
          return stateRef.value.peers
        }
      },
      followingPeer: following,
      connect,
      disconnect,
      shareCurrentDoc() {
        const roomId = generateRoomId()
        connect(roomId)
        syncAllNodesToYjs()
        return roomId
      },
      updateCursor,
      updateSelection,
      setLocalName,
      followPeer,
      tickFollow
    }
  }, [runtime])

  useEffect(() => result.disconnect, [result])
  return result
}
