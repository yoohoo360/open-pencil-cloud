import { type ChildProcess, execFileSync, spawn } from 'node:child_process'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

export const DEFAULT_AGENT_SERVER_PORT = 2024

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')

export type AgentServerHandle = {
  port: number
  stop: () => void
}

function agentServerPort(): number {
  const raw = process.env.OPENPENCIL_AGENT_SERVER_PORT
  if (!raw) return DEFAULT_AGENT_SERVER_PORT
  const port = Number(raw)
  if (!Number.isInteger(port) || port < 1024 || port > 65535) {
    throw new Error('OPENPENCIL_AGENT_SERVER_PORT must be an integer between 1024 and 65535')
  }
  return port
}

export function agentServerDisabled(): boolean {
  const raw = process.env.OPENPENCIL_DISABLE_AGENT_SERVER?.trim().toLowerCase()
  return raw === '1' || raw === 'true' || raw === 'yes'
}

/**
 * LangGraph CLI must run under Node. Spawning with Bun's `process.execPath`
 * fails while loading nested CJS (`Cannot find module './cjs/index.cjs'`).
 */
function resolveNodeExecutable(): string {
  if (process.versions.node && !('bun' in process.versions)) {
    return process.execPath
  }
  const fromPath = execFileSync('node', ['-p', 'process.execPath'], {
    encoding: 'utf8'
  }).trim()
  if (!fromPath) {
    throw new Error('Node.js executable not found (required for @langchain/langgraph-cli)')
  }
  return fromPath
}

function resolveLangGraphCli(): string {
  const require = createRequire(resolve(packageRoot, 'package.json'))
  const pkgJson = require.resolve('@langchain/langgraph-cli/package.json')
  return resolve(dirname(pkgJson), 'dist/cli/cli.mjs')
}

export function agentServerBaseUrl(port = agentServerPort()): string {
  return `http://127.0.0.1:${port}`
}

async function probeOk(baseUrl: string, timeoutMs = 800): Promise<boolean> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(`${baseUrl.replace(/\/+$/, '')}/ok`, {
      method: 'GET',
      signal: controller.signal,
      headers: { Accept: 'application/json' }
    })
    if (!response.ok) return false
    const body = (await response.json().catch(() => null)) as { ok?: boolean } | null
    return body?.ok === true
  } catch {
    return false
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Spawn LangGraph Agent Server for rspack dev (lazy — call from ensure middleware).
 * Child stdout/stderr are discarded (CLI banner / Studio UI noise).
 * Returns null when disabled or CLI missing (chat falls back to local fetch).
 */
export function startAgentServer(options?: {
  onWarn?: (line: string) => void
}): AgentServerHandle | null {
  if (agentServerDisabled()) return null

  let cli: string
  try {
    cli = resolveLangGraphCli()
  } catch (error) {
    options?.onWarn?.(
      `@langchain/langgraph-cli missing: ${error instanceof Error ? error.message : String(error)}`
    )
    return null
  }

  let node: string
  try {
    node = resolveNodeExecutable()
  } catch (error) {
    options?.onWarn?.(error instanceof Error ? error.message : String(error))
    return null
  }

  const port = agentServerPort()
  const configPath = resolve(packageRoot, 'langgraph.json')
  let child: ChildProcess | null = spawn(
    node,
    [cli, 'dev', '--port', String(port), '--host', '127.0.0.1', '--no-browser', '-c', configPath],
    {
      cwd: packageRoot,
      env: {
        ...process.env,
        // Quiet winston / CLI chatter; we only announce the URL when /ok is ready.
        LOG_LEVEL: 'error',
        NODE_NO_WARNINGS: process.env.NODE_NO_WARNINGS ?? '1'
      },
      // Drop ASCII banner, Studio UI link, and "Starting server..." lines.
      stdio: ['ignore', 'ignore', 'ignore']
    }
  )

  child.on('exit', (code, signal) => {
    if (code === 0 || signal === 'SIGTERM' || signal === 'SIGINT') return
    options?.onWarn?.(
      `exited (code=${code ?? 'null'} signal=${signal ?? 'null'}); chat falls back to local fetch`
    )
    child = null
  })

  const stop = () => {
    if (!child || child.killed) return
    child.kill('SIGTERM')
    child = null
  }
  process.once('exit', stop)
  process.once('SIGINT', stop)
  process.once('SIGTERM', stop)

  return { port, stop }
}

/** Wait until `GET /ok` succeeds or timeout. */
export async function waitForAgentServer(
  port: number,
  options?: { timeoutMs?: number; intervalMs?: number }
): Promise<boolean> {
  const timeoutMs = options?.timeoutMs ?? 20_000
  const intervalMs = options?.intervalMs ?? 250
  const baseUrl = agentServerBaseUrl(port)
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    if (await probeOk(baseUrl)) return true
    await new Promise((resolveWait) => setTimeout(resolveWait, intervalMs))
  }
  return false
}
