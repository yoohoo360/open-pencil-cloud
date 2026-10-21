/**
 * Start the OpenPencil MCP HTTP server for the Electron desktop shell.
 * Core implementation stays in `packages/mcp`.
 *
 *   bun run start:mcp
 */
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawn } from 'node:child_process'

const scriptsDir = dirname(fileURLToPath(import.meta.url))
const repoRoot = join(scriptsDir, '../..')
const entry = join(repoRoot, 'packages/mcp/src/index.ts')

const child = spawn('bun', ['run', entry], {
  cwd: repoRoot,
  stdio: 'inherit',
  env: {
    ...process.env,
    PORT: process.env.PORT ?? '7600',
    OPENPENCIL_MCP_TCP: process.env.OPENPENCIL_MCP_TCP ?? '1'
  }
})

const stop = () => {
  child.kill('SIGTERM')
}
process.once('SIGINT', stop)
process.once('SIGTERM', stop)

const code = await new Promise<number | null>((resolve) => {
  child.once('exit', (exitCode) => resolve(exitCode))
})
process.exit(code ?? 1)
