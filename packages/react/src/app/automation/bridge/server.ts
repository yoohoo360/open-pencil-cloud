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

  const { handleRequest } = createAutomationCommandHandlers()

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
      socket.send(JSON.stringify({ type: 'register', token }))
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
    ws?.close()
    ws = null
  }

  connect()
  return { disconnect, token }
}
