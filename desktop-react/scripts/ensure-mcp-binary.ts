#!/usr/bin/env bun
/**
 * Ensure `binaries/openpencil-mcp-http-<host-triple>` exists for Tauri externalBin.
 * Produces it with `bun build --compile` from packages/mcp when missing.
 */
import { mkdir, rename, access } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const desktopReact = join(dirname(fileURLToPath(import.meta.url)), '..')
const repoRoot = join(desktopReact, '..')
const binariesDir = join(desktopReact, 'binaries')

function hostTriple(): string {
  const printed = spawnSync('rustc', ['--print', 'host-tuple'], { encoding: 'utf8' })
  if (printed.status === 0 && printed.stdout.trim()) return printed.stdout.trim()
  const verbose = spawnSync('rustc', ['-Vv'], { encoding: 'utf8' })
  const line = verbose.stdout.split('\n').find((row) => row.startsWith('host:'))
  const host = line?.slice('host:'.length).trim()
  if (!host) throw new Error('Could not determine rustc host triple')
  return host
}

const triple = hostTriple()
const extension = process.platform === 'win32' ? '.exe' : ''
const targetName = `openpencil-mcp-http-${triple}${extension}`
const targetPath = join(binariesDir, targetName)

async function exists(path: string): Promise<boolean> {
  try {
    await access(path)
    return true
  } catch {
    return false
  }
}

if (await exists(targetPath)) {
  console.log(`[mcp-binary] using ${targetPath}`)
  process.exit(0)
}

const entry = join(repoRoot, 'packages/mcp/src/index.ts')
if (!(await exists(entry))) {
  console.error(`[mcp-binary] missing ${entry}; cannot compile openpencil-mcp-http`)
  process.exit(1)
}

await mkdir(binariesDir, { recursive: true })
const staging = join(binariesDir, `openpencil-mcp-http${extension}`)
console.log(`[mcp-binary] compiling ${targetName}…`)
const compile = spawnSync(
  'bun',
  ['build', '--compile', '--outfile', staging, entry],
  { cwd: repoRoot, stdio: 'inherit' }
)
if (compile.status !== 0) {
  console.error('[mcp-binary] bun build --compile failed')
  process.exit(compile.status ?? 1)
}
await rename(staging, targetPath)
console.log(`[mcp-binary] wrote ${targetPath}`)
