import { readStoredUserName } from '#react/app/auth/storage'
import {
  applyFollowViewport,
  buildRemotePeers,
  remotePeersToCursors
} from '#react/app/collab/awareness'
import { createInitialCollabState } from '#react/app/collab/room-id'
import {
  connectCollabSession,
  createCollabRuntime,
  disposeCollabSession,
  type CollabRuntime
} from '#react/app/collab/session'
import type { CollabState, RemotePeer } from '#react/app/collab/types'
import { createYjsGraphSync } from '#react/app/collab/yjs-sync'
import { useEditorStore } from '#react/app/editor/store'
import { useI18n } from '#react/i18n'
import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'

const DISPOSE_GRACE_MS = 1500

function collabDisplayName(fallback: string): string {
  return readStoredUserName() || fallback || 'Anonymous'
}

export function useCollabPanelState(roomId: string | null) {
  const store = useEditorStore()
  const { dialogs } = useI18n()
  const initial = useMemo(() => createInitialCollabState(), [])
  const runtimeRef = useRef<CollabRuntime>(createCollabRuntime())
  const storeRef = useRef(store)
  const generationRef = useRef(0)
  const disposeTimerRef = useRef<number | null>(null)
  const followingPeerRef = useRef<number | null>(null)
  const peersRef = useRef<RemotePeer[]>([])
  storeRef.current = store
  const [followingPeer, setFollowingPeer] = useState<number | null>(null)
  const [state, setState] = useState<CollabState>({
    ...initial,
    localName: collabDisplayName(initial.localName)
  })
  const peers: RemotePeer[] = state.peers
  followingPeerRef.current = followingPeer

  const { syncNodeToYjs, syncAllNodesToYjs, syncMissingNodesToYjs, applyYjsToGraph } = useMemo(
    () =>
      createYjsGraphSync({
        getStore: () => store,
        getYdoc: () => runtimeRef.current.ydoc,
        getYnodes: () => runtimeRef.current.ynodes,
        getYimages: () => runtimeRef.current.yimages,
        setSuppressYjsEvents: (value) => {
          runtimeRef.current.suppressYjsEvents = value
        }
      }),
    [store]
  )

  function updatePeersList() {
    const awareness = runtimeRef.current.awareness
    if (!awareness) return
    const nextPeers = buildRemotePeers(
      awareness.getStates() as Map<number, Record<string, unknown>>,
      awareness.clientID
    )
    const nextIds = nextPeers.map((peer) => `${peer.clientId}:${peer.name}`).join('|')
    const prevIds = peersRef.current.map((peer) => `${peer.clientId}:${peer.name}`).join('|')
    store.state.remoteCursors = remotePeersToCursors(nextPeers, store.state.currentPageId)
    store.requestRepaint()
    const nextFollow = applyFollowViewport(store, awareness, followingPeerRef.current)
    if (nextFollow !== followingPeerRef.current) setFollowingPeer(nextFollow)
    if (nextIds === prevIds) return
    peersRef.current = nextPeers
    setState((current) => ({ ...current, peers: nextPeers }))
  }

  useEffect(() => {
    if (disposeTimerRef.current !== null) {
      window.clearTimeout(disposeTimerRef.current)
      disposeTimerRef.current = null
    }

    const runtime = runtimeRef.current
    const editorStore = storeRef.current
    if (!roomId) {
      disposeTimerRef.current = window.setTimeout(() => {
        disposeTimerRef.current = null
        if (runtime.room) {
          disposeCollabSession(runtime, editorStore)
          peersRef.current = []
          setState((current) => ({ ...current, connected: false, roomId: null, peers: [] }))
        }
      }, DISPOSE_GRACE_MS)
      return () => {
        if (disposeTimerRef.current !== null) {
          window.clearTimeout(disposeTimerRef.current)
          disposeTimerRef.current = null
        }
      }
    }

    const generation = ++generationRef.current
    const name = collabDisplayName(state.localName)
    if (!runtime.room || runtime.roomId !== roomId) {
      connectCollabSession({
        roomId,
        runtime,
        store: editorStore,
        setConnected: () => {
          setState((current) => ({ ...current, connected: true, roomId }))
        },
        updatePeersList,
        applyYjsToGraph,
        syncNodeToYjs
      })
      runtime.awareness?.setLocalStateField('user', {
        name,
        color: state.localColor
      })
      setState((current) => ({
        ...current,
        connected: true,
        roomId,
        localName: name
      }))
    }

    const seedTimer = window.setTimeout(() => {
      if (generationRef.current !== generation) return
      if (peersRef.current.length === 0) syncAllNodesToYjs()
      else syncMissingNodesToYjs()
    }, 800)

    return () => {
      window.clearTimeout(seedTimer)
      disposeTimerRef.current = window.setTimeout(() => {
        disposeTimerRef.current = null
        if (generationRef.current !== generation) return
        disposeCollabSession(runtime, editorStore)
        peersRef.current = []
        setState((current) => ({ ...current, connected: false, roomId: null, peers: [] }))
      }, DISPOSE_GRACE_MS)
    }
  }, [roomId])

  function updateCursor(x: number, y: number, pageId: string) {
    runtimeRef.current.awareness?.setLocalStateField('cursor', {
      x,
      y,
      pageId,
      zoom: store.state.zoom
    })
  }

  function updateSelection(ids: string[]) {
    runtimeRef.current.awareness?.setLocalStateField('selection', ids)
  }

  return {
    dialogs,
    state,
    peers,
    followingPeer,
    updateCursor,
    updateSelection,
    toggleFollowPeer(clientId: number) {
      setFollowingPeer((current) => {
        const next = current === clientId ? null : clientId
        followingPeerRef.current = next
        const awareness = runtimeRef.current.awareness
        if (awareness) applyFollowViewport(store, awareness, next)
        return next
      })
    }
  }
}

export type CollabPanelContext = ReturnType<typeof useCollabPanelState>

const CollabPanelContextValue = createContext<CollabPanelContext | null>(null)

export function CollabPanelProvider({
  roomId,
  children
}: {
  roomId?: string | null
  children?: ReactNode
}) {
  const ctx = useCollabPanelState(roomId ?? null)
  return <CollabPanelContextValue.Provider value={ctx}>{children}</CollabPanelContextValue.Provider>
}

export function useCollabPanelContext(): CollabPanelContext {
  const ctx = useContext(CollabPanelContextValue)
  if (!ctx) throw new Error('Collab panel controls must be used within CollabPanel')
  return ctx
}

export function useOptionalCollabPanelContext(): CollabPanelContext | null {
  return useContext(CollabPanelContextValue)
}
