import type { IncomingMessage, ServerResponse } from 'node:http'

import {
  type AgentServerHandle,
  agentServerBaseUrl,
  agentServerDisabled,
  startAgentServer,
  waitForAgentServer
} from '../../../tools/dev/agent-server/src/spawn.ts'

/** Dev-only path: page chat hits this on first probe to lazy-start LangGraph. */
export const AGENT_SERVER_ENSURE_PATH = '/__openpencil-agent-server/ensure'

/**
 * Rspack plugin: does not start the Agent Server at boot.
 * Exposes {@link AGENT_SERVER_ENSURE_PATH}; the page calls it on first chat probe.
 */
export function openPencilAgentServerRspackPlugin(command: string) {
  let handle: AgentServerHandle | null = null
  let ensureInFlight: Promise<{ ok: boolean; url: string }> | null = null
  let announcedUrl: string | null = null

  const stop = () => {
    handle?.stop()
    handle = null
    ensureInFlight = null
    announcedUrl = null
  }

  async function ensure(): Promise<{ ok: boolean; url: string }> {
    if (agentServerDisabled()) {
      return { ok: false, url: agentServerBaseUrl() }
    }

    if (handle) {
      const ready = await waitForAgentServer(handle.port, { timeoutMs: 2_000 })
      if (ready) {
        const url = agentServerBaseUrl(handle.port)
        if (announcedUrl !== url) {
          announcedUrl = url
          console.info(`[agent-server] ${url}`)
        }
        return { ok: true, url }
      }
      handle.stop()
      handle = null
      announcedUrl = null
    }

    if (ensureInFlight) return ensureInFlight

    ensureInFlight = (async () => {
      handle = startAgentServer({
        onWarn: (line) => {
          console.warn(`[agent-server] ${line}`)
        }
      })
      if (!handle) {
        return { ok: false, url: agentServerBaseUrl() }
      }
      const url = agentServerBaseUrl(handle.port)
      const ready = await waitForAgentServer(handle.port)
      if (!ready) {
        console.warn('[agent-server] timed out waiting for GET /ok; chat falls back to local fetch')
        return { ok: false, url }
      }
      announcedUrl = url
      console.info(`[agent-server] ${url}`)
      return { ok: true, url }
    })().finally(() => {
      ensureInFlight = null
    })

    return ensureInFlight
  }

  return {
    apply(compiler: {
      options: { mode?: string }
      hooks: {
        watchClose: { tap: (name: string, fn: () => void) => void }
        shutdown?: { tapPromise: (name: string, fn: () => Promise<void>) => void }
      }
    }) {
      if (command !== 'serve') return
      compiler.hooks.watchClose.tap('open-pencil-agent-server', stop)
      compiler.hooks.shutdown?.tapPromise('open-pencil-agent-server', async () => {
        stop()
      })
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
          void ensure()
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
