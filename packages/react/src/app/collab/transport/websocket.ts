import { getCollabWebSocketURL } from '#react/constants'
import { bytesFromData, bytesToBase64 } from '#react/app/collab/transport/bytes'
import { createChunkAssembler, splitBytes } from '#react/app/collab/transport/chunk'

import { IS_BROWSER } from '@open-pencil/core/constants'

import type { CollabAction, CollabActionReceiver, CollabRoomTransport, JoinCollabRoom } from './types'

const MAX_MESSAGE_BYTES = 8 * 1024 * 1024
const LEAVE_GRACE_MS = 2500
const RECONNECT_BASE_MS = 400

type TransportMessage =
  | { type: 'hello'; senderId: string; targetId?: string }
  | { type: 'welcome'; senderId: string; targetId?: string }
  | { type: 'leave'; senderId: string; targetId?: string }
  | {
      type: 'action'
      senderId: string
      targetId?: string
      namespace: string
      data: string
    }

function parseMessage(value: unknown): TransportMessage | null {
  const text = typeof value === 'string' ? value : null
  if (!text || text.length > MAX_MESSAGE_BYTES) return null
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    return null
  }
  if (!parsed || typeof parsed !== 'object' || !('type' in parsed) || !('senderId' in parsed)) {
    return null
  }
  const message = parsed as Partial<TransportMessage> & { data?: unknown }
  if (typeof message.senderId !== 'string') return null
  if (message.targetId !== undefined && typeof message.targetId !== 'string') return null
  if (message.type === 'hello' || message.type === 'welcome' || message.type === 'leave') {
    return message as TransportMessage
  }
  if (message.type !== 'action' || typeof message.namespace !== 'string') return null
  const data = bytesFromData(message.data)
  if (!data) return null
  return {
    type: 'action',
    senderId: message.senderId,
    targetId: message.targetId,
    namespace: message.namespace,
    data: bytesToBase64(data)
  }
}

async function payloadText(payload: unknown): Promise<string | null> {
  if (typeof payload === 'string') return payload
  if (payload instanceof ArrayBuffer) return new TextDecoder().decode(payload)
  if (ArrayBuffer.isView(payload)) {
    return new TextDecoder().decode(payload)
  }
  if (typeof Blob !== 'undefined' && payload instanceof Blob) {
    try {
      return await payload.text()
    } catch {
      return null
    }
  }
  return null
}

export function joinWebSocketCollabRoom(url: string): CollabRoomTransport {
  if (
    !IS_BROWSER ||
    typeof WebSocket === 'undefined' ||
    typeof crypto === 'undefined' ||
    typeof crypto.randomUUID !== 'function'
  ) {
    throw new Error('Collaboration WebSocket transport requires browser WebSocket and crypto APIs')
  }
  const peerId = crypto.randomUUID()
  const peers = new Set<string>()
  const receivers = new Map<string, CollabActionReceiver>()
  const pending: TransportMessage[] = []
  const leaveTimers = new Map<string, number>()
  let socket: WebSocket | null = null
  let joinHandler: ((peerId: string) => void) | null = null
  let leaveHandler: ((peerId: string) => void) | null = null
  let left = false
  let reconnectTimer: number | null = null
  let reconnectAttempt = 0

  function post(message: TransportMessage) {
    if (message.type === 'action') {
      const bytes = bytesFromData(message.data)
      if (bytes) {
        for (const frame of splitBytes(bytes)) {
          sendRaw({ ...message, data: bytesToBase64(frame) })
        }
        return
      }
    }
    sendRaw(message)
  }

  function sendRaw(message: TransportMessage) {
    if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify(message))
    else pending.push(message)
  }

  function cancelLeave(id: string) {
    const timer = leaveTimers.get(id)
    if (timer === undefined) return
    window.clearTimeout(timer)
    leaveTimers.delete(id)
  }

  function addPeer(id: string, resync = false) {
    if (id === peerId) return
    cancelLeave(id)
    const isNew = !peers.has(id)
    peers.add(id)
    if (isNew || resync) joinHandler?.(id)
  }

  const assemble = createChunkAssembler((data, senderId, namespace) => {
    try {
      receivers.get(namespace)?.(data, senderId)
    } catch (error) {
      console.error('Collaboration action failed', namespace, error)
    }
  })

  function handlePayload(payload: unknown) {
    const message = parseMessage(payload)
    if (!message || message.senderId === peerId) return
    if (message.targetId && message.targetId !== peerId) return
    if (message.type === 'hello') {
      addPeer(message.senderId, true)
      post({ type: 'welcome', senderId: peerId, targetId: message.senderId })
      return
    }
    if (message.type === 'welcome') {
      addPeer(message.senderId)
      return
    }
    if (message.type === 'leave') {
      scheduleLeave(message.senderId)
      return
    }
    addPeer(message.senderId)
    const data = bytesFromData(message.data)
    if (!data) return
    assemble(data, message.senderId, message.namespace)
  }

  function scheduleLeave(id: string) {
    if (id === peerId || leaveTimers.has(id)) return
    leaveTimers.set(
      id,
      window.setTimeout(() => {
        leaveTimers.delete(id)
        if (peers.delete(id)) leaveHandler?.(id)
      }, LEAVE_GRACE_MS)
    )
  }

  function connect() {
    if (left) return
    const next = new WebSocket(url)
    next.binaryType = 'arraybuffer'
    socket = next
    next.addEventListener('open', () => {
      if (socket !== next || left) {
        next.close()
        return
      }
      reconnectAttempt = 0
      next.send(JSON.stringify({ type: 'hello', senderId: peerId }))
      for (const message of pending.splice(0)) next.send(JSON.stringify(message))
    })
    next.addEventListener('error', () => {
      if (socket === next && !left) console.error('Collaboration WebSocket connection failed', next.url)
    })
    next.addEventListener('message', (event: MessageEvent) => {
      if (socket !== next || left) return
      const payload = event.data
      if (typeof payload === 'string' || payload instanceof ArrayBuffer || ArrayBuffer.isView(payload)) {
        handlePayload(
          typeof payload === 'string' ? payload : new TextDecoder().decode(payload as ArrayBuffer)
        )
        return
      }
      void payloadText(payload).then((text) => {
        if (text && socket === next && !left) handlePayload(text)
      })
    })
    next.addEventListener('close', () => {
      if (left || socket !== next) return
      const delay = Math.min(8000, RECONNECT_BASE_MS * 2 ** reconnectAttempt)
      reconnectAttempt += 1
      reconnectTimer = window.setTimeout(connect, delay)
    })
  }

  connect()

  return {
    makeAction(namespace): CollabAction {
      return [
        (data, targetId) => {
          post({
            type: 'action',
            senderId: peerId,
            targetId,
            namespace,
            data: bytesToBase64(data)
          })
        },
        (handler) => {
          if (receivers.has(namespace)) {
            throw new Error(`Collaboration action ${namespace} is already registered`)
          }
          receivers.set(namespace, handler)
        }
      ]
    },
    onPeerJoin(handler) {
      joinHandler = handler
      for (const id of peers) queueMicrotask(() => handler(id))
    },
    onPeerLeave(handler) {
      leaveHandler = handler
    },
    async leave() {
      if (left) return
      left = true
      if (reconnectTimer !== null) window.clearTimeout(reconnectTimer)
      reconnectTimer = null
      for (const timer of leaveTimers.values()) window.clearTimeout(timer)
      leaveTimers.clear()
      peers.clear()
      receivers.clear()
      const active = socket
      socket = null
      if (!active) return
      try {
        if (active.readyState === WebSocket.OPEN) {
          active.send(JSON.stringify({ type: 'leave', senderId: peerId }))
        }
      } catch {
        // Socket may already be closing.
      }
      if (active.readyState === WebSocket.CONNECTING || active.readyState === WebSocket.OPEN) {
        active.close()
      }
    }
  }
}

export const joinCollabRoom: JoinCollabRoom = (roomId) =>
  joinWebSocketCollabRoom(getCollabWebSocketURL(roomId))
