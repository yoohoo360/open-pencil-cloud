import type { WritableAtom } from 'nanostores'
import type { Awareness } from 'y-protocols/awareness'

import { buildRemotePeers, remotePeersToCursors } from '@/app/collab/awareness'
import type { CollabState } from '@/app/collab/types'
import type { EditorStore } from '@/app/editor/active-store'

type LocalAwarenessOptions = {
  state: WritableAtom<CollabState>
  storedName: WritableAtom<string>
  getStore: () => EditorStore
  getAwareness: () => Awareness | null
}

export function createLocalAwarenessActions({
  state,
  storedName,
  getStore,
  getAwareness
}: LocalAwarenessOptions) {
  function broadcastAwareness() {
    const awareness = getAwareness()
    if (!awareness) return
    const s = state.get()
    awareness.setLocalStateField('user', {
      name: s.localName,
      color: s.localColor
    })
  }

  function updateCursor(x: number, y: number, pageId: string) {
    const awareness = getAwareness()
    if (!awareness) return
    awareness.setLocalStateField('cursor', { x, y, pageId, zoom: getStore().state.zoom })
  }

  function updateSelection(ids: string[]) {
    const awareness = getAwareness()
    if (!awareness) return
    awareness.setLocalStateField('selection', ids)
  }

  function updatePeersList() {
    const awareness = getAwareness()
    if (!awareness) return

    const store = getStore()
    const peers = buildRemotePeers(
      awareness.getStates() as Map<number, Record<string, unknown>>,
      awareness.clientID
    )

    state.set({ ...state.get(), peers })
    store.state.remoteCursors = remotePeersToCursors(peers, store.state.currentPageId)
    store.requestRender()
  }

  function setLocalName(name: string) {
    state.set({ ...state.get(), localName: name })
    storedName.set(name)
    broadcastAwareness()
  }

  return { broadcastAwareness, updateCursor, updateSelection, updatePeersList, setLocalName }
}
