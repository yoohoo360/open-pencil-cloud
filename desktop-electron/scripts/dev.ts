/**
 * Dev: generate menu → build main/preload → start React frontend → launch Electron
 * once http://localhost:8000 responds.
 */
import { spawn, type ChildProcess } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const frontendUrl = process.env.OPENPENCIL_FRONTEND_URL?.trim() || 'http://localhost:8000'

function run(cmd: string, args: string[], opts?: { cwd?: string }): Promise<number> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      cwd: opts?.cwd ?? packageRoot,
      stdio: 'inherit',
      env: process.env
    })
    child.on('error', reject)
    child.on('exit', (code) => resolve(code ?? 1))
  })
}

async function waitForUrl(url: string, timeoutMs = 120_000): Promise<void> {
  const started = Date.now()
  for (;;) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(1500) })
      if (response.ok || response.status === 404) return
    } catch {
      // keep waiting
    }
    if (Date.now() - started > timeoutMs) {
      throw new Error(`Frontend did not become ready at ${url}`)
    }
    await new Promise((resolve) => setTimeout(resolve, 400))
  }
}

const children: ChildProcess[] = []

function stopAll(): void {
  for (const child of children) {
    if (!child.killed) child.kill('SIGTERM')
  }
}

process.once('SIGINT', () => {
  stopAll()
  process.exit(130)
})
process.once('SIGTERM', () => {
  stopAll()
  process.exit(143)
})

const menuCode = await run('bun', ['run', 'generate:menu'])
if (menuCode !== 0) process.exit(menuCode)

const buildCode = await run('bun', ['run', 'build:main'])
if (buildCode !== 0) process.exit(buildCode)

const frontend = spawn('bun', ['run', 'start:frontend'], {
  cwd: packageRoot,
  stdio: 'inherit',
  env: process.env
})
children.push(frontend)

try {
  await waitForUrl(frontendUrl)
} catch (error) {
  stopAll()
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
}

const electronCli = spawn(
  'bunx',
  ['electron', packageRoot],
  {
    cwd: packageRoot,
    stdio: 'inherit',
    env: {
      ...process.env,
      OPENPENCIL_FRONTEND_URL: frontendUrl
    }
  }
)
children.push(electronCli)

const electronCode = await new Promise<number>((resolve) => {
  electronCli.on('exit', (code) => resolve(code ?? 0))
})
stopAll()
process.exit(electronCode)
