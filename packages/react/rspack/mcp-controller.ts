import { spawn } from 'node:child_process'
import { createHash, randomUUID } from 'node:crypto'
import { mkdir } from 'node:fs/promises'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { waitForChildReady } from '../../../src/app/automation/bridge/child-ready'
import { freeAutomationBind } from '../../../src/app/automation/bridge/free-bind.override'
import { waitForAutomationHealth } from '../../../src/app/automation/bridge/vite-plugin.override'
import {
  parseDevMCPConfiguration,
  type DevMCPConfiguration
} from '../../../src/app/automation/mcp/dev-control'
import { platformHasUnixSockets } from '../../mcp/src/transport/paths'
import {
  createAutomationEnvironment,
  devMCPConfigurationErrorStatus,
  readDevMCPConfiguration,
  readRestartAuthToken
} from './automation-env'

const CHILD_EXIT_TIMEOUT_MS = 2_000
const REPO_ROOT = fileURLToPath(new URL('../../../', import.meta.url))

interface AutomationControllerOptions {
  browserURL: string
  corsOrigin: string
  httpPort: number
  portlessServiceName: string | null
  runtimeId: string
}

function safeRuntimeId(value: string): string {
  return createHash('sha256').update(value).digest('hex').slice(0, 16)
}

export function createAutomationController(
  authToken: string | null,
  options: AutomationControllerOptions
) {
  let child: ReturnType<typeof spawn> | null = null
  let lifecycle = Promise.resolve()
  /** Settings-generated Bearer; falls back to the Vite control token when null. */
  let serverAuthToken: string | null = null
  let configuration: DevMCPConfiguration = {
    authenticationEnabled: false,
    rootDirectory: '',
    disabledTools: [],
    scope: 'document'
  }

  function enqueue(operation: () => Promise<void>): Promise<void> {
    const next = lifecycle.then(operation, operation)
    lifecycle = next.catch(() => undefined)
    return next
  }

  async function stopChild(): Promise<void> {
    const running = child
    if (!running) return
    child = null
    const exited = new Promise<void>((resolve) => {
      running.once('exit', () => resolve())
    })
    running.kill()
    let timeout: ReturnType<typeof setTimeout> | undefined
    const timedOut = new Promise<boolean>((resolve) => {
      timeout = setTimeout(() => resolve(true), CHILD_EXIT_TIMEOUT_MS)
    })
    const exitedGracefully = await Promise.race([exited.then(() => false), timedOut])
    if (timeout) clearTimeout(timeout)
    if (!exitedGracefully && running.exitCode === null) {
      running.kill('SIGKILL')
      await exited
    }
  }

  async function startChild(attempt = 0): Promise<void> {
    const runtimeDir = join(tmpdir(), 'open-pencil-mcp', safeRuntimeId(options.runtimeId))
    await mkdir(runtimeDir, { recursive: true, mode: 0o700 })
    const socketPath = platformHasUnixSockets() ? join(runtimeDir, 'mcp.sock') : null
    const discoveryPath = join(runtimeDir, 'mcp.json')
    await freeAutomationBind({ httpPort: options.httpPort, socketPath })
    const command = ['bun', 'run', 'packages/mcp/src/index.ts']
    const spawnCommand = options.portlessServiceName ? 'portless' : command[0]
    const spawnArgs = options.portlessServiceName
      ? ['run', '--name', options.portlessServiceName, ...command]
      : command.slice(1)
    const readyMarker = `open-pencil-ready:${randomUUID()}`
    const spawned = spawn(spawnCommand, spawnArgs, {
      cwd: REPO_ROOT,
      stdio: ['ignore', 'inherit', 'pipe'],
      env: {
        ...createAutomationEnvironment({
          authToken: serverAuthToken ?? authToken,
          baseEnv: process.env,
          configuration,
          corsOrigin: options.corsOrigin,
          discoveryPath,
          httpPort: options.httpPort,
          socketPath
        }),
        OPENPENCIL_MCP_READY_MARKER: readyMarker
      }
    })
    const ready = waitForChildReady(spawned, readyMarker)
    child = spawned
    let reclaimScheduled = false

    spawned.on('error', (err) => {
      console.error(`[MCP] Failed to spawn automation server: ${err.message}`)
      if (child === spawned) child = null
    })

    spawned.stderr.on('data', (data: Buffer) => {
      const text = data.toString()
      if (text.includes('EADDRINUSE')) {
        if (!reclaimScheduled && attempt < 1) {
          reclaimScheduled = true
          void enqueue(async () => {
            await freeAutomationBind({ httpPort: options.httpPort, socketPath })
            if (child === spawned) {
              spawned.kill()
              child = null
            }
            await startChild(attempt + 1)
          })
        }
        return
      }
      process.stderr.write(data)
    })

    spawned.on('exit', (code) => {
      if (code && code !== 0 && !reclaimScheduled) {
        console.error(`[MCP] Server exited with code ${code}`)
      }
      if (child === spawned) child = null
    })

    try {
      await ready
    } catch (error) {
      if (reclaimScheduled) return
      spawned.kill()
      if (child === spawned) child = null
      throw error
    }
    try {
      await waitForAutomationHealth(options.browserURL, fetch, {
        assertRunning() {
          if (child !== spawned || spawned.exitCode !== null || spawned.signalCode !== null) {
            throw new Error('MCP child exited before becoming ready')
          }
        }
      })
    } catch (error) {
      if (reclaimScheduled) return
      spawned.kill()
      if (child === spawned) child = null
      throw error
    }
  }

  async function restartChild(nextConfiguration: DevMCPConfiguration): Promise<void> {
    configuration = nextConfiguration
    await stopChild()
    await startChild()
  }

  return {
    start: () => enqueue(startChild),
    stop: () => enqueue(stopChild),
    async handleRestart(request: IncomingMessage, response: ServerResponse, next: () => void) {
      if (request.method !== 'POST') {
        next()
        return
      }
      if (!authToken || request.headers.authorization !== `Bearer ${authToken}`) {
        response.statusCode = 401
        response.end('Unauthorized')
        return
      }
      try {
        const rawConfiguration = await readDevMCPConfiguration(request)
        const nextConfiguration = parseDevMCPConfiguration(rawConfiguration)
        if (!nextConfiguration) {
          response.statusCode = 400
          response.end('Invalid MCP configuration')
          return
        }
        if (nextConfiguration.authenticationEnabled) {
          const nextToken = readRestartAuthToken(rawConfiguration)
          if (nextToken) serverAuthToken = nextToken
        } else {
          serverAuthToken = null
        }
        await enqueue(() => restartChild(nextConfiguration))
        response.statusCode = 204
        response.end()
      } catch (error) {
        response.statusCode = devMCPConfigurationErrorStatus(error)
        response.end(error instanceof Error ? error.message : String(error))
      }
    }
  }
}
