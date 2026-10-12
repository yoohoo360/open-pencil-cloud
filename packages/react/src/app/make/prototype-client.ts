import {
  MakeBridgeType,
  newMakeBridgeRequestId,
  pingMakePrototype,
  publishMakeBridgeMessage,
  requestIdFromPayload,
  requestMakeSelection,
  subscribeMakeBridge,
  type MakeBaselineResponse,
  type MakeNodePreviewsResponse,
  type MakeSelectionNode,
  type MakeSelectionPayload
} from '#react/app/make/bridge'

const CONNECT_TIMEOUT_MS = 4500
const REQUEST_TIMEOUT_MS = 12_000

function isBaselineResponse(value: unknown): value is MakeBaselineResponse {
  return (
    !!value &&
    typeof value === 'object' &&
    typeof (value as MakeBaselineResponse).fileKey === 'string' &&
    typeof (value as MakeBaselineResponse).requestId === 'string' &&
    typeof (value as MakeBaselineResponse).code === 'string'
  )
}

function isPreviewsResponse(value: unknown): value is MakeNodePreviewsResponse {
  return (
    !!value &&
    typeof value === 'object' &&
    typeof (value as MakeNodePreviewsResponse).fileKey === 'string' &&
    typeof (value as MakeNodePreviewsResponse).requestId === 'string' &&
    Array.isArray((value as MakeNodePreviewsResponse).nodes)
  )
}

/** Wait until the design tab answers a ping / heartbeat for this file. */
export function waitForPrototypeConnection(fileKey: string): Promise<boolean> {
  return new Promise((resolve) => {
    let settled = false
    const finish = (ok: boolean) => {
      if (settled) return
      settled = true
      window.clearTimeout(timer)
      stop()
      resolve(ok)
    }
    const stop = subscribeMakeBridge((message) => {
      if (
        message.type !== MakeBridgeType.Heartbeat &&
        message.type !== MakeBridgeType.Pong &&
        message.type !== MakeBridgeType.SelectionChanged
      ) {
        return
      }
      const key =
        message.payload &&
        typeof message.payload === 'object' &&
        'fileKey' in message.payload &&
        typeof (message.payload as { fileKey: unknown }).fileKey === 'string'
          ? (message.payload as { fileKey: string }).fileKey
          : ''
      if (key && key !== fileKey) return
      finish(true)
    })
    const timer = window.setTimeout(() => finish(false), CONNECT_TIMEOUT_MS)
    pingMakePrototype(fileKey)
    requestMakeSelection(fileKey)
  })
}

export function requestBaselineFromPrototype(
  fileKey: string,
  nodeIds: readonly string[]
): Promise<string> {
  const requestId = newMakeBridgeRequestId()
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => {
      stop()
      reject(new Error('Prototype did not return baseline JSX'))
    }, REQUEST_TIMEOUT_MS)
    const stop = subscribeMakeBridge((message) => {
      if (message.type !== MakeBridgeType.BaselineResponse) return
      if (!isBaselineResponse(message.payload)) return
      if (message.payload.fileKey !== fileKey) return
      if (message.payload.requestId !== requestId) return
      window.clearTimeout(timer)
      stop()
      if (message.payload.error) reject(new Error(message.payload.error))
      else resolve(message.payload.code)
    })
    publishMakeBridgeMessage(MakeBridgeType.RequestBaseline, {
      fileKey,
      requestId,
      nodeIds: [...nodeIds]
    })
  })
}

export function requestNodePreviewsFromPrototype(
  fileKey: string,
  nodeIds: readonly string[]
): Promise<MakeSelectionNode[]> {
  const requestId = newMakeBridgeRequestId()
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => {
      stop()
      reject(new Error('Prototype did not return node previews'))
    }, REQUEST_TIMEOUT_MS)
    const stop = subscribeMakeBridge((message) => {
      if (message.type !== MakeBridgeType.NodePreviewsResponse) return
      if (!isPreviewsResponse(message.payload)) return
      if (message.payload.fileKey !== fileKey) return
      if (requestIdFromPayload(message.payload) !== requestId) return
      window.clearTimeout(timer)
      stop()
      if (message.payload.error) reject(new Error(message.payload.error))
      else resolve(message.payload.nodes)
    })
    publishMakeBridgeMessage(MakeBridgeType.RequestNodePreviews, {
      fileKey,
      requestId,
      nodeIds: [...nodeIds]
    })
  })
}

export type { MakeSelectionPayload }
