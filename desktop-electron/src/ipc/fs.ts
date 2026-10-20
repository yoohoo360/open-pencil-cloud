import {
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync
} from 'node:fs'
import { dirname } from 'node:path'

/** MVP: allow absolute paths under the user home and common skill roots (no Tauri ACL parity). */
function assertPath(path: string): string {
  const trimmed = path.trim()
  if (!trimmed) throw new Error('Path is empty')
  if (!trimmed.startsWith('/') && !/^[A-Za-z]:[\\/]/.test(trimmed)) {
    throw new Error('Only absolute paths are allowed')
  }
  return trimmed
}

export function fsReadFile(path: string): Uint8Array {
  return new Uint8Array(readFileSync(assertPath(path)))
}

export function fsReadDir(
  path: string
): Array<{ name: string; isDirectory: boolean; isFile: boolean }> {
  const dir = assertPath(path)
  return readdirSync(dir).map((name) => {
    let isDirectory = false
    let isFile = false
    try {
      const stats = statSync(`${dir}/${name}`)
      isDirectory = stats.isDirectory()
      isFile = stats.isFile()
    } catch {
      // skip
    }
    return { name, isDirectory, isFile }
  })
}

export function fsMkdir(path: string): void {
  mkdirSync(assertPath(path), { recursive: true })
}

export function fsWriteFile(path: string, contents: Uint8Array | number[]): void {
  const target = assertPath(path)
  mkdirSync(dirname(target), { recursive: true })
  writeFileSync(target, Buffer.from(contents))
}

export function fsRemove(path: string, options?: { recursive?: boolean }): void {
  rmSync(assertPath(path), { recursive: options?.recursive === true, force: true })
}
