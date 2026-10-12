/**
 * Cross-tab channel between the design editor (prototype) and Make.
 * Make does not load .fig — it pulls selection, previews, and baseline JSX from here.
 */

import { IS_BROWSER } from '@open-pencil/core/constants'

export const MAKE_BRIDGE_SOURCE = 'open-pencil-make'
export const MAKE_BRIDGE_CHANNEL = 'open-pencil-make-bridge'

export const MakeBridgeType = {
  SelectionChanged: 'make-selection-changed',
  RequestSelection: 'make-request-selection',
  Heartbeat: 'make-heartbeat',
  Ping: 'make-ping',
  Pong: 'make-pong',
  RequestBaseline: 'make-request-baseline',
  BaselineResponse: 'make-baseline-response',
  RequestNodePreviews: 'make-request-node-previews',
  NodePreviewsResponse: 'make-node-previews-response',
  ApplyToPrototype: 'make-apply-to-prototype',
  McpEvent: 'make-mcp-event'
} as const

export type MakeSelectionNode = {
  id: string
  name: string
  type: string
  /** PNG data URL when previews were requested. */
  imageDataUrl?: string
}

export type MakeSelectionPayload = {
  fileKey: string
  nodeIds: string[]
  nodes: MakeSelectionNode[]
}

export type MakeBaselineRequest = {
  fileKey: string
  requestId: string
  nodeIds: string[]
}

export type MakeBaselineResponse = {
  fileKey: string
  requestId: string
  code: string
  error?: string
}

export type MakeNodePreviewsRequest = {
  fileKey: string
  requestId: string
  nodeIds: string[]
}

export type MakeNodePreviewsResponse = {
  fileKey: string
  requestId: string
  nodes: MakeSelectionNode[]
  error?: string
}

export type MakeBridgeEnvelope = {
  source: typeof MAKE_BRIDGE_SOURCE
  type: (typeof MakeBridgeType)[keyof typeof MakeBridgeType]
  payload?: unknown
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

export function isMakeBridgeMessage(data: unknown): data is MakeBridgeEnvelope {
  return (
    isRecord(data) &&
    data.source === MAKE_BRIDGE_SOURCE &&
    typeof data.type === 'string'
  )
}

export function isMakeSelectionPayload(value: unknown): value is MakeSelectionPayload {
  if (!isRecord(value) || typeof value.fileKey !== 'string') return false
  if (!Array.isArray(value.nodeIds) || !Array.isArray(value.nodes)) return false
  return value.nodeIds.every((id) => typeof id === 'string')
}

export function fileKeyFromPayload(payload: unknown): string {
  if (!isRecord(payload) || typeof payload.fileKey !== 'string') return ''
  return payload.fileKey
}

export function requestIdFromPayload(payload: unknown): string {
  if (!isRecord(payload) || typeof payload.requestId !== 'string') return ''
  return payload.requestId
}

function openChannel(): BroadcastChannel | null {
  if (!IS_BROWSER || typeof BroadcastChannel === 'undefined') return null
  return new BroadcastChannel(MAKE_BRIDGE_CHANNEL)
}

export function publishMakeBridgeMessage(
  type: MakeBridgeEnvelope['type'],
  payload?: unknown
) {
  const channel = openChannel()
  if (!channel) return
  const message: MakeBridgeEnvelope = {
    source: MAKE_BRIDGE_SOURCE,
    type,
    ...(payload === undefined ? {} : { payload })
  }
  channel.postMessage(message)
  channel.close()
}

export function publishMakeSelection(payload: MakeSelectionPayload) {
  publishMakeBridgeMessage(MakeBridgeType.SelectionChanged, payload)
}

export function requestMakeSelection(fileKey: string) {
  publishMakeBridgeMessage(MakeBridgeType.RequestSelection, { fileKey })
}

export function pingMakePrototype(fileKey: string) {
  publishMakeBridgeMessage(MakeBridgeType.Ping, { fileKey })
}

export function subscribeMakeBridge(
  handler: (message: MakeBridgeEnvelope) => void
): () => void {
  const channel = openChannel()
  if (!channel) return () => undefined
  channel.onmessage = (event: MessageEvent) => {
    if (!isMakeBridgeMessage(event.data)) return
    handler(event.data)
  }
  return () => channel.close()
}

export function newMakeBridgeRequestId(): string {
  const bytes = new Uint8Array(8)
  crypto.getRandomValues(bytes)
  return [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}
