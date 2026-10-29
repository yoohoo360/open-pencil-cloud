import { spawn, type ChildProcess } from 'node:child_process'
import { existsSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import http from 'node:http'
import { app } from 'electron'

const MCP_HTTP_PORT = 7600
const MCP_EXECUTABLE = 'openpencil-mcp-http'

let mcpChild: ChildProcess | null = null

/** Bundled into `dist/main.js` — parent of `dist/` is the package root. */
function packageRoot(): string {
  return join(dirname(fileURLToPath(import.meta.url)), '..')
}

function repoRoot(): string {
  return join(packageRoot(), '..')
}

function binariesRoot(): string {
  return app.isPackaged ? join(process.resourcesPath, 'binaries') : join(packageRoot(), 'binaries')
}

function hostTargetTriple(): string {
  const platform =
    process.platform === 'darwin' ? 'apple-darwin' : process.platform === 'win32' ? 'pc-windows-msvc' : 'unknown-linux-gnu'
  const arch = process.arch === 'arm64' ? 'aarch64' : process.arch === 'x64' ? 'x86_64' : process.arch
  return `${arch}-${platform}`
}

type McpLaunch = {
  display: string
  program: string
  args: string[]
  cwd?: string
}

function resolveMcpLaunch(): McpLaunch | null {
  const root = repoRoot()
  const script = join(root, 'packages/mcp/src/index.ts')
  if (existsSync(script)) {
    return {
      display: script,
      program: 'bun',
      args: ['run', script],
      cwd: root
    }
  }

  const binaryName = `${MCP_EXECUTABLE}-${hostTargetTriple()}${process.platform === 'win32' ? '.exe' : ''}`
  const path = join(binariesRoot(), binaryName)
  if (existsSync(path)) {
    return { display: path, program: path, args: [] }
  }
  return null
}

export function mcpLookup(): {
  available: boolean
  path: string | null
  searched: string[]
} {
  const launch = resolveMcpLaunch()
  const searched = [join(repoRoot(), 'packages/mcp/src'), binariesRoot()]
  return {
    available: launch !== null,
    path: launch?.display ?? null,
    searched
  }
}

export async function mcpHealth(): Promise<{
  ok: boolean
  version: string | null
  serverStatus: string | null
}> {
  return await new Promise((resolve) => {
    const request = http.get(
      {
        hostname: '127.0.0.1',
        port: MCP_HTTP_PORT,
        path: '/health',
        timeout: 1000
      },
      (response) => {
        const chunks: Buffer[] = []
        response.on('data', (chunk) => chunks.push(Buffer.from(chunk)))
        response.on('end', () => {
          const ok = (response.statusCode ?? 0) >= 200 && (response.statusCode ?? 0) < 300
          let version: string | null = null
          let serverStatus: string | null = null
          try {
            const body = JSON.parse(Buffer.concat(chunks).toString('utf8')) as Record<string, unknown>
            if (typeof body.version === 'string') version = body.version
            if (typeof body.status === 'string') serverStatus = body.status
          } catch {
            // ignore
          }
          resolve({ ok, version, serverStatus })
        })
      }
    )
    request.on('error', () => resolve({ ok: false, version: null, serverStatus: null }))
    request.on('timeout', () => {
      request.destroy()
      resolve({ ok: false, version: null, serverStatus: null })
    })
  })
}

export function mcpStart(env: Record<string, string>): void {
  const launch = resolveMcpLaunch()
  if (!launch) {
    throw new Error(
      'MCP server was not found. Run `bun run start:mcp` from desktop-electron, or ensure packages/mcp is available.'
    )
  }
  mcpStop()
  const merged: Record<string, string | undefined> = {
    ...process.env,
    HOME: process.env.HOME ?? homedir(),
    ...env
  }
  delete merged.OPENPENCIL_MCP_APP_TIMEOUT_MS
  mcpChild = spawn(launch.program, launch.args, {
    cwd: launch.cwd,
    env: merged,
    stdio: 'ignore',
    detached: true
  })
  mcpChild.unref()
}

export function mcpStop(): void {
  if (!mcpChild) return
  if (!mcpChild.killed) mcpChild.kill('SIGTERM')
  mcpChild = null
}
