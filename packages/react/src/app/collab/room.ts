import * as decoding from 'lib0/decoding'
import * as awarenessProtocol from 'y-protocols/awareness'
import * as Y from 'yjs'

import type { JoinCollabRoom } from '#react/app/collab/transport/types'
import { joinCollabRoom } from '#react/app/collab/transport/websocket'

export type CollabRoomOptions = {
  roomId: string
  ydoc: Y.Doc
  awareness: awarenessProtocol.Awareness
  setConnected: () => void
  updatePeersList: () => void
  joinRoom?: JoinCollabRoom
}

export function connectCollabRoom({
  roomId,
  ydoc,
  awareness,
  setConnected,
  updatePeersList,
  joinRoom = joinCollabRoom
}: CollabRoomOptions) {
  const room = joinRoom(roomId)
  const [sendYjsUpdate, getUpdate] = room.makeAction('yjs-update')
  const [sendAwareness, getAwareness] = room.makeAction('awareness')
  const [sendSyncStep1, getSyncStep1] = room.makeAction('sync-step1')
  const [sendSyncReply, getSyncReply] = room.makeAction('sync-reply')
  const awarenessClientsByPeer = new Map<string, Set<number>>()

  getUpdate((data) => {
    try {
      Y.applyUpdate(ydoc, new Uint8Array(data), 'remote')
    } catch (error) {
      console.error('Collaboration yjs-update failed', error)
    }
  })

  getAwareness((data, peerId) => {
    awarenessClientsByPeer.set(peerId, new Set(awarenessClientIds(data)))
    try {
      awarenessProtocol.applyAwarenessUpdate(awareness, data, 'remote')
    } catch (error) {
      console.error('Collaboration awareness update failed', error)
    }
  })

  getSyncStep1((stateVector, peerId) => {
    try {
      sendSyncReply(Y.encodeStateAsUpdate(ydoc, stateVector), peerId)
    } catch (error) {
      console.error('Collaboration sync-step1 failed', error)
    }
  })

  getSyncReply((data) => {
    try {
      Y.applyUpdate(ydoc, new Uint8Array(data), 'remote')
    } catch (error) {
      console.error('Collaboration sync-reply failed', error)
    }
  })

  ydoc.on('update', (update: Uint8Array, origin: unknown) => {
    if (origin === 'remote') return
    sendYjsUpdate(update)
  })

  awareness.on(
    'update',
    (
      { added, updated, removed }: { added: number[]; updated: number[]; removed: number[] },
      origin: unknown
    ) => {
      if (origin === 'remote' || origin === 'peer-left') return
      const changedClients = [...added, ...updated, ...removed]
      sendAwareness(awarenessProtocol.encodeAwarenessUpdate(awareness, changedClients))
    }
  )

  room.onPeerJoin((peerId) => {
    setConnected()
    try {
      sendYjsUpdate(Y.encodeStateAsUpdate(ydoc))
      sendSyncStep1(Y.encodeStateVector(ydoc), peerId)
    } catch (error) {
      console.error('Collaboration peer-join sync failed', error)
    }
    sendAwareness(awarenessProtocol.encodeAwarenessUpdate(awareness, [awareness.clientID]), peerId)
  })

  room.onPeerLeave((peerId) => {
    const remoteClients = [...(awarenessClientsByPeer.get(peerId) ?? [])]
    awarenessClientsByPeer.delete(peerId)
    awarenessProtocol.removeAwarenessStates(awareness, remoteClients, 'peer-left')
    updatePeersList()
  })

  return room
}

function awarenessClientIds(data: Uint8Array): number[] {
  try {
    const decoder = decoding.createDecoder(data)
    const count = decoding.readVarUint(decoder)
    const clients: number[] = []
    for (let index = 0; index < count; index++) {
      clients.push(decoding.readVarUint(decoder))
      decoding.readVarUint(decoder)
      decoding.readVarString(decoder)
    }
    return clients
  } catch {
    return []
  }
}
