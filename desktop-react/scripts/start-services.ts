/**
 * Start the local companion Node service for desktop-react DEV.
 * MCP HTTP on :7600 also serves `GET /ok` for the React chat runtime badge
 * (no separate LangGraph :2024 process).
 *
 *   bun run start:services
 */
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawn } from 'node:child_process'

const scriptsDir = dirname(fileURLToPath(import.meta.url))
const desktopReact = join(scriptsDir, '..')

console.info('[services] starting MCP companion on :7600 (Ctrl+C to stop)')

const child = spawn('bun', ['run', join(scriptsDir, 'start-mcp.ts')], {
  cwd: desktopReact,
  stdio: 'inherit',
  env: process.env
})

const shutdown = () => {
  if (!child.killed) child.kill('SIGTERM')
}

process.once('SIGINT', shutdown)
process.once('SIGTERM', shutdown)

const code = await new Promise<number | null>((resolve) => {
  child.once('exit', (exitCode) => resolve(exitCode))
})
process.exit(code ?? 1)
