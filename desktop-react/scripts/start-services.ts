/**
 * Start MCP HTTP (:7600) and the LangGraph Agent Server together for desktop-react DEV.
 * MCP core remains `packages/mcp`; Agent Server lives in `desktop-react/agent-server/`.
 *
 *   bun run start:services
 */
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawn, type ChildProcess } from 'node:child_process'

const scriptsDir = dirname(fileURLToPath(import.meta.url))
const desktopReact = join(scriptsDir, '..')

const children: ChildProcess[] = []

function start(label: string, script: string): ChildProcess {
  const child = spawn('bun', ['run', join(scriptsDir, script)], {
    cwd: desktopReact,
    stdio: ['ignore', 'inherit', 'inherit'],
    env: process.env
  })
  child.on('exit', (code, signal) => {
    if (signal) console.error(`[services] ${label} exited (${signal})`)
    else if (code && code !== 0) console.error(`[services] ${label} exited with code ${code}`)
  })
  children.push(child)
  return child
}

console.info('[services] starting MCP + Agent Server (Ctrl+C to stop both)')
start('mcp', 'start-mcp.ts')
start('agent-server', 'start-agent-server.ts')

const shutdown = () => {
  for (const child of children) {
    if (!child.killed) child.kill('SIGTERM')
  }
}

process.once('SIGINT', shutdown)
process.once('SIGTERM', shutdown)

await Promise.all(
  children.map(
    (child) =>
      new Promise<void>((resolve) => {
        child.once('exit', () => resolve())
      })
  )
)
