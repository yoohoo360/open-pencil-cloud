/**
 * Browser-side automation handler for the React app.
 *
 * Connects to the MCP companion via WebSocket, receives RPC requests,
 * runs them against the live EditorStore, and sends results back.
 */
import * as v from 'valibot'

import { randomHex } from '@open-pencil/scene-graph/random'

import {
  AutomationRequestJSON,
  createAutomationCommandHandlers
} from '#react/app/automation/bridge/handlers'
import type { EditorStore } from '#react/app/editor/store'

export function connectAutomation(
  getStore: () => EditorStore | null,
  authToken: string | null = null,
  automationURL = __OPENPENCIL_LOCAL_AUTOMATION_URL__
) {
  const token =
    authToken ??
    (typeof __OPENPENCIL_LOCAL_AUTOMATION_TOKEN__ === 'string'
      ? __OPENPENCIL_LOCAL_AUTOMATION_TOKEN__
      : null) ??
    randomHex(32)
  let ws: WebSocket | null = null
  let reconnectTimer: ReturnType<typeof setTimeout> | undefined
  let intentionalDisconnect = false
  const sessionId = randomHex(16)
  let lastSession = ''

  const { handleRequest } = createAutomationCommandHandlers()

  function currentSession() {
    const store = getStore()
    const pageId = store?.state.currentPageId ?? ''
    return {
      id: sessionId,
      url: window.location.href,
      title: document.title,
      documentId: store?.state.documentKey || 'active',
      documentName: store?.state.documentName || 'Untitled',
      pageId,
      pageName: (pageId && store?.graph.getNode(pageId)?.name) || 'Untitled'
    }
  }

  function sendSessionUpdate() {
    const socket = ws
    if (!socket || socket.readyState !== WebSocket.OPEN) return
    const session = currentSession()
    const serialized = JSON.stringify(session)
    if (serialized === lastSession) return
    lastSession = serialized
    socket.send(JSON.stringify({ type: 'session', session }))
  }

  const unsubscribeStore = getStore()?.subscribe(sendSessionUpdate)

  function connect() {
    let socket: WebSocket
    try {
      socket = new WebSocket(automationURL)
      ws = socket
    } catch (error) {
      console.error(
        '[Automation] WebSocket constructor failed:',
        error instanceof Error ? error.message : error
      )
      scheduleReconnect()
      return
    }

    socket.onopen = () => {
      console.debug('[Automation] WebSocket connected to MCP server')
      const session = currentSession()
      lastSession = JSON.stringify(session)
      socket.send(JSON.stringify({ type: 'register', token, session }))
    }

    socket.onmessage = async (event) => {
      try {
        const parsed = v.safeParse(AutomationRequestJSON, event.data)
        if (!parsed.success) {
          if (parsed.issues.some((issue) => issue.type === 'parse_json')) {
            console.warn('Failed to parse WebSocket message:', v.summarize(parsed.issues))
          }
          return
        }
        const msg = parsed.output
        const store = getStore()
        if (!store) {
          if (socket.readyState === WebSocket.OPEN) {
            socket.send(
              JSON.stringify({
                type: 'response',
                id: msg.id,
                ok: false,
                error: 'Editor is not ready'
              })
            )
          }
          return
        }
        try {
          const result = await handleRequest(store, msg.command, msg.args)
          if (socket.readyState !== WebSocket.OPEN) return
          socket.send(JSON.stringify({ type: 'response', id: msg.id, ...(result as object) }))
        } catch (error) {
          if (socket.readyState !== WebSocket.OPEN) return
          socket.send(
            JSON.stringify({
              type: 'response',
              id: msg.id,
              ok: false,
              error: error instanceof Error ? error.message : String(error)
            })
          )
        }
      } catch (error) {
        console.warn('Failed to parse WebSocket message:', error)
      }
    }

    socket.onclose = (event) => {
      if (ws === socket) ws = null
      if (intentionalDisconnect || event.code === 1000) return
      console.warn('[Automation] WebSocket closed:', `code=${event.code} reason=${event.reason}`)
      scheduleReconnect()
    }

    socket.onerror = (event) => {
      console.warn('[Automation] WebSocket error:', event)
      socket.close()
    }
  }

  function scheduleReconnect() {
    clearTimeout(reconnectTimer)
    reconnectTimer = setTimeout(connect, 2000)
  }

  function disconnect() {
    intentionalDisconnect = true
    clearTimeout(reconnectTimer)
    unsubscribeStore?.()
    ws?.close()
    ws = null
  }

  connect()
  return { disconnect, token }
}
