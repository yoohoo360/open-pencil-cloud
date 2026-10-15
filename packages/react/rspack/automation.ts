import { randomUUID } from 'node:crypto'
import type { IncomingMessage, ServerResponse } from 'node:http'
import process from 'node:process'

import { devAutomationRoute } from '../../../src/app/automation/bridge/portless-route'
import { DEV_MCP_RESTART_PATH } from '../../../src/app/automation/mcp/dev-control'
import { AUTOMATION_HTTP_PORT } from '../../core/src/constants'
import { createAutomationController } from './mcp-controller'

const REACT_DEV_SERVER_PORT = 8000
const devAutomationAuthToken = process.env.OPENPENCIL_DEV_TOKEN ?? randomUUID()

export function localAutomationToken(command: string): string | null {
  return command === 'serve' ? devAutomationAuthToken : null
}

function automationCORSOrigin(host: string | undefined): string {
  return host
    ? `http://${host}:${REACT_DEV_SERVER_PORT}`
    : `http://localhost:${REACT_DEV_SERVER_PORT}`
}

export function openPencilAutomationRspackPlugin(command: string, host: string | undefined) {
  const route = devAutomationRoute(process.env.PORTLESS_URL, AUTOMATION_HTTP_PORT)
  const controller = createAutomationController(localAutomationToken(command), {
    ...route,
    corsOrigin: process.env.PORTLESS_URL ? route.corsOrigin : automationCORSOrigin(host),
    httpPort: AUTOMATION_HTTP_PORT
  })
  let started = false

  return {
    apply(compiler: {
      options: { mode?: string }
      hooks: {
        afterEnvironment: { tap: (name: string, fn: () => void) => void }
        watchClose: { tap: (name: string, fn: () => void) => void }
        shutdown?: { tapPromise: (name: string, fn: () => Promise<void>) => void }
      }
    }) {
      compiler.hooks.watchClose.tap('open-pencil-automation', () => {
        void controller.stop()
      })
      compiler.hooks.shutdown?.tapPromise('open-pencil-automation', () => controller.stop())
    },
    setupMiddlewares<T>(middlewares: T[]): T[] {
      // Start the local MCP child with the React dev server (same as Vue Vite).
      if (command === 'serve' && !started) {
        started = true
        void controller.start().catch((error) => {
          console.error(
            '[MCP] Failed to start automation server:',
            error instanceof Error ? error.message : error
          )
        })
      }
      const middleware = {
        name: 'open-pencil-mcp-restart',
        path: DEV_MCP_RESTART_PATH,
        middleware: (request: IncomingMessage, response: ServerResponse, next: () => void) => {
          void controller.handleRestart(request, response, next)
        }
      }
      ;(middlewares as unknown as Array<typeof middleware>).unshift(middleware)
      return middlewares
    }
  }
}
