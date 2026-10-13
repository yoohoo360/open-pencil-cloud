import { execFile } from 'node:child_process'
import { unlink } from 'node:fs/promises'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

function parsePidList(stdout: string): number[] {
  const pids = new Set<number>()
  for (const token of stdout.split(/\s+/)) {
    const pid = Number(token)
    if (Number.isInteger(pid) && pid > 0 && pid !== process.pid) pids.add(pid)
  }
  return [...pids]
}

async function pidsListeningOnPort(port: number): Promise<number[]> {
  if (process.platform === 'win32') {
    try {
      const { stdout } = await execFileAsync('netstat', ['-ano', '-p', 'TCP'], {
        encoding: 'utf8'
      })
      const pids = new Set<number>()
      const needle = `:${port}`
      for (const line of stdout.split(/\r?\n/)) {
        if (!line.includes(needle) || !/LISTENING/i.test(line)) continue
        const pid = Number(line.trim().split(/\s+/).at(-1))
        if (Number.isInteger(pid) && pid > 0 && pid !== process.pid) pids.add(pid)
      }
      return [...pids]
    } catch {
      return []
    }
  }

  try {
    const { stdout } = await execFileAsync(
      'lsof',
      ['-nP', `-iTCP:${port}`, '-sTCP:LISTEN', '-t'],
      { encoding: 'utf8' }
    )
    return parsePidList(stdout)
  } catch {
    // lsof exits 1 when nothing is listening.
    return []
  }
}

async function pidsUsingPath(path: string): Promise<number[]> {
  if (process.platform === 'win32') return []
  try {
    const { stdout } = await execFileAsync('lsof', ['-t', '--', path], { encoding: 'utf8' })
    return parsePidList(stdout)
  } catch {
    return []
  }
}

async function killPids(pids: number[]): Promise<void> {
  if (pids.length === 0) return

  if (process.platform === 'win32') {
    for (const pid of pids) {
      try {
        await execFileAsync('taskkill', ['/PID', String(pid), '/F', '/T'])
      } catch {
        // already gone
      }
    }
    return
  }

  for (const pid of pids) {
    try {
      process.kill(pid, 'SIGTERM')
    } catch {
      // already gone
    }
  }
  await new Promise((resolve) => setTimeout(resolve, 150))
  for (const pid of pids) {
    try {
      process.kill(pid, 0)
      process.kill(pid, 'SIGKILL')
    } catch {
      // already gone
    }
  }
}

/**
 * Free the automation MCP TCP port and Unix socket so this instance can bind.
 * Kills any other local listeners (stale OpenPencil / prior MCP child).
 */
export async function freeAutomationBind(options: {
  httpPort: number
  socketPath: string | null
}): Promise<void> {
  const socketPids = options.socketPath ? await pidsUsingPath(options.socketPath) : []
  const portPids = await pidsListeningOnPort(options.httpPort)
  await killPids([...new Set([...socketPids, ...portPids])])

  if (options.socketPath) {
    try {
      await unlink(options.socketPath)
    } catch {
      // missing or already replaced
    }
  }

  if (socketPids.length > 0 || portPids.length > 0) {
    await new Promise((resolve) => setTimeout(resolve, 100))
  }
}
