import type { IncomingMessage, ServerResponse } from 'node:http'

import {
  agentServerBaseUrl,
  agentServerDisabled,
  DEFAULT_AGENT_SERVER_PORT,
  waitForAgentServer
} from '@open-pencil/desktop-react/agent-server/spawn'

/** Dev-only path: page chat hits this on first probe to detect a running LangGraph. */
export const AGENT_SERVER_ENSURE_PATH = '/__openpencil-agent-server/ensure'

function configuredAgentServerPort(): number {
  const raw = process.env.OPENPENCIL_AGENT_SERVER_PORT
  if (!raw) return DEFAULT_AGENT_SERVER_PORT
  const port = Number(raw)
  if (!Number.isInteger(port) || port < 1024 || port > 65535) {
    return DEFAULT_AGENT_SERVER_PORT
  }
  return port
}

/**
 * Rspack plugin: does not start the Agent Server.
 * Start it with `bun run start:agent-server`. The ensure path only probes an
 * already-running server so chat can detect it without spawning one.
 */
export function openPencilAgentServerRspackPlugin(command: string) {
  async function probe(): Promise<{ ok: boolean; url: string }> {
    if (agentServerDisabled()) {
      return { ok: false, url: agentServerBaseUrl() }
    }
    const port = configuredAgentServerPort()
    const url = agentServerBaseUrl(port)
    const ready = await waitForAgentServer(port, { timeoutMs: 800 })
    return { ok: ready, url }
  }

  return {
    apply(_compiler: {
      options: { mode?: string }
      hooks: {
        watchClose: { tap: (name: string, fn: () => void) => void }
        shutdown?: { tapPromise: (name: string, fn: () => Promise<void>) => void }
      }
    }) {
      // Agent Server is started with `bun run start:agent-server`, not rspack.
    },
    setupMiddlewares<T>(middlewares: T[]): T[] {
      if (command !== 'serve') return middlewares

      const middleware = {
        name: 'open-pencil-agent-server-ensure',
        path: AGENT_SERVER_ENSURE_PATH,
        middleware: (request: IncomingMessage, response: ServerResponse, next: () => void) => {
          if (request.method !== 'GET' && request.method !== 'POST') {
            next()
            return
          }
          void probe()
            .then((result) => {
              response.statusCode = result.ok ? 200 : 503
              response.setHeader('Content-Type', 'application/json')
              response.end(JSON.stringify(result))
            })
            .catch((error: unknown) => {
              response.statusCode = 500
              response.setHeader('Content-Type', 'application/json')
              response.end(
                JSON.stringify({
                  ok: false,
                  error: error instanceof Error ? error.message : String(error)
                })
              )
            })
        }
      }
      ;(middlewares as unknown as Array<typeof middleware>).unshift(middleware)
      return middlewares
    }
  }
}
