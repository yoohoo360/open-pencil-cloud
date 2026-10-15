/**
 * @deprecated Prefer `bun run start:agent-server` from `desktop-react/`.
 * Kept so imports/docs that point at this path still work.
 */
import { spawn } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const entry = join(
  dirname(fileURLToPath(import.meta.url)),
  '../../../desktop-react/scripts/start-agent-server.ts'
)
const child = spawn('bun', ['run', entry], { stdio: 'inherit', env: process.env })
process.once('SIGINT', () => child.kill('SIGINT'))
process.once('SIGTERM', () => child.kill('SIGTERM'))
const code = await new Promise<number | null>((resolve) => {
  child.once('exit', (exitCode) => resolve(exitCode))
})
process.exit(code ?? 1)
