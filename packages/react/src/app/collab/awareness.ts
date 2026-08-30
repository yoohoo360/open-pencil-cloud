import type { EditorStore } from '#react/app/editor/store'
import { PEER_COLORS } from '#react/constants'
import type { RemotePeer } from '#react/app/collab/types'
import type { Awareness } from 'y-protocols/awareness'
import type { Color } from '@open-pencil/scene-graph/primitives'

type CursorState = {
  x: number
  y: number
  pageId: string
  zoom?: number
}

export function buildRemotePeers(
  states: Map<number, Record<string, unknown>>,
  localClientId: number
): RemotePeer[] {
  const peers: RemotePeer[] = []
  states.forEach((peerState, clientId) => {
    if (clientId === localClientId) return
    const user = peerState.user as { name?: string; color?: Color } | undefined
    if (!user) return
    peers.push({
      clientId,
      name: user.name || 'Anonymous',
      color: user.color || PEER_COLORS[clientId % PEER_COLORS.length],
      cursor: peerState.cursor as RemotePeer['cursor'],
      selection: peerState.selection as string[]
    })
  })
  return peers
}

export function remotePeersToCursors(peers: RemotePeer[], currentPageId: string) {
  return peers
    .filter((peer) => peer.cursor && peer.cursor.pageId === currentPageId)
    .map((peer) => {
      const cursor = peer.cursor as NonNullable<RemotePeer['cursor']>
      return {
        name: peer.name,
        color: peer.color,
        x: cursor.x,
        y: cursor.y,
        selection: peer.selection
      }
    })
}

export function applyFollowViewport(
  store: EditorStore,
  awareness: Awareness,
  followingPeer: number | null
): number | null {
  if (!followingPeer) return followingPeer
  const peerState = awareness.getStates().get(followingPeer)
  if (!peerState?.cursor) return null
  const cursor = peerState.cursor as CursorState
  if (cursor.pageId !== store.state.currentPageId) {
    void store.switchPage(cursor.pageId)
  }
  const canvas = document.querySelector('canvas')
  if (!canvas) return followingPeer
  if (cursor.zoom) store.state.zoom = cursor.zoom
  const width = canvas.width / devicePixelRatio
  const height = canvas.height / devicePixelRatio
  store.state.panX = width / 2 - cursor.x * store.state.zoom
  store.state.panY = height / 2 - cursor.y * store.state.zoom
  store.requestRender()
  return followingPeer
}
