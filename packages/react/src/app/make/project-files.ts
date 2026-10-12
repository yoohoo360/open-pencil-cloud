import type { MakeSandboxFile } from '#react/app/make/sandbox'

export const MAKE_ENTRY_FILE = '/src/index.tsx'
export const MAKE_APP_FILE = '/src/App.tsx'
export const MAKE_PACKAGE_FILE = '/package.json'
export const MAKE_LOCK_FILE = '/package-lock.json'

/** Placeholder until fe-esbuild-package `/api/lock-file` fills the real lock. */
export const MAKE_LOCK_PLACEHOLDER = `${JSON.stringify(
  { lockfileVersion: 3, packages: {}, _status: 'pending-build-server' },
  null,
  2
)}\n`

export function normalizeMakeFilename(raw: string): string {
  let path = raw.trim().replace(/\\/g, '/')
  if (!path) return ''
  if (!path.startsWith('/')) path = `/${path}`
  path = path.replace(/\/{2,}/g, '/')
  return path
}

export function isMakeLockFile(filename: string): boolean {
  const path = normalizeMakeFilename(filename)
  return path === MAKE_LOCK_FILE || path.endsWith('/package-lock.json')
}

export function isMakePackageJsonFile(filename: string): boolean {
  const path = normalizeMakeFilename(filename)
  return path === MAKE_PACKAGE_FILE || (path.endsWith('/package.json') && !isMakeLockFile(path))
}

/** Lock is owned by the build server — never accept AI or casual edits as source of truth. */
export function isMakeServerOwnedFile(filename: string): boolean {
  return isMakeLockFile(filename)
}

function pathFromFenceInfo(info: string): string {
  const trimmed = info.trim()
  if (!trimmed) return ''
  const pathEq = trimmed.match(/(?:path|file)\s*=\s*["']?([^\s"']+)["']?/i)
  if (pathEq?.[1]) return normalizeMakeFilename(pathEq[1])
  const tokens = trimmed.split(/\s+/).filter(Boolean)
  for (const token of tokens) {
    if (token.includes('/') || token.endsWith('.tsx') || token.endsWith('.ts') || token.endsWith('.jsx') || token.endsWith('.js') || token.endsWith('.css') || token.endsWith('.json')) {
      return normalizeMakeFilename(token.replace(/^["']|["']$/g, ''))
    }
  }
  return ''
}

/**
 * Keep the multi-file fenced payload for Make codegen (from the first fence to the end).
 * Single-file replies still work via {@link parseMakeProjectFiles}.
 */
export function extractMakeProjectPayload(text: string): string {
  const trimmed = text.trim()
  if (!trimmed) return ''
  const start = trimmed.indexOf('```')
  if (start < 0) return trimmed
  return trimmed.slice(start)
}

/**
 * Parse AI / editor text into a dynamic Make file tree.
 * Supports fenced blocks with a path in the info line, e.g.
 * ```/src/App.tsx … ``` or ```tsx path=/src/Button.tsx … ```
 * A single fence with no path maps to App.tsx. package-lock is ignored.
 */
export function parseMakeProjectFiles(text: string): MakeSandboxFile[] {
  const trimmed = text.trim()
  if (!trimmed) return []

  const found = new Map<string, string>()
  const closed = [...trimmed.matchAll(/```([^\n`]*)\r?\n([\s\S]*?)```/g)]
  for (const match of closed) {
    const path = pathFromFenceInfo(match[1] ?? '')
    const code = (match[2] ?? '').replace(/\n$/, '')
    const filename = path || (closed.length === 1 ? MAKE_APP_FILE : '')
    if (!filename || isMakeLockFile(filename)) continue
    found.set(filename, code)
  }

  // Remainder after closed fences may still be an open streaming fence.
  let remainder = trimmed
  for (const match of closed) {
    remainder = remainder.replace(match[0] ?? '', '')
  }
  const open = remainder.match(/```([^\n`]*)\r?\n([\s\S]*)$/)
  if (open) {
    const path = pathFromFenceInfo(open[1] ?? '')
    const code = (open[2] ?? '').replace(/\n$/, '')
    const filename = path || (found.size === 0 ? MAKE_APP_FILE : '')
    if (filename && !isMakeLockFile(filename) && code.trim()) {
      found.set(filename, code)
    }
  }

  // Bare source with no fences → App.tsx (streaming / apply).
  if (found.size === 0 && trimmed && !trimmed.startsWith('```')) {
    found.set(MAKE_APP_FILE, trimmed)
  }

  return [...found.entries()].map(([filename, code]) => ({ filename, code }))
}

/** Serialize the editable project for the Make chat baseline (excludes lock). */
export function serializeMakeProjectFiles(files: readonly MakeSandboxFile[]): string {
  const editable = files.filter((file) => !isMakeLockFile(file.filename))
  if (editable.length === 0) return ''
  if (editable.length === 1 && editable[0]?.filename === MAKE_APP_FILE) {
    return editable[0].code
  }
  return editable
    .map((file) => `\`\`\`${file.filename}\n${file.code.replace(/\n$/, '')}\n\`\`\``)
    .join('\n\n')
}

export function upsertMakeFiles(
  files: readonly MakeSandboxFile[],
  updates: readonly MakeSandboxFile[]
): MakeSandboxFile[] {
  let next = [...files]
  for (const update of updates) {
    const filename = normalizeMakeFilename(update.filename)
    if (!filename || isMakeLockFile(filename)) continue
    const index = next.findIndex((file) => file.filename === filename)
    if (index >= 0) {
      next[index] = { filename, code: update.code }
    } else {
      next.push({ filename, code: update.code })
    }
  }
  return next
}

/**
 * Only ensure the lock placeholder exists. Entry / App / package.json are authored by skills.
 */
export function ensureMakeLockPlaceholder(
  files: readonly MakeSandboxFile[],
  lockCode = MAKE_LOCK_PLACEHOLDER
): MakeSandboxFile[] {
  if (files.some((file) => file.filename === MAKE_LOCK_FILE)) return [...files]
  return [...files, { filename: MAKE_LOCK_FILE, code: lockCode }]
}

export function sortMakeFiles(files: readonly MakeSandboxFile[]): MakeSandboxFile[] {
  return [...files].sort((left, right) => {
    const rank = (name: string) => {
      if (name === MAKE_ENTRY_FILE) return 0
      if (name === MAKE_APP_FILE) return 1
      if (name.startsWith('/src/')) return 2
      if (isMakePackageJsonFile(name)) return 3
      if (isMakeLockFile(name)) return 4
      return 5
    }
    const delta = rank(left.filename) - rank(right.filename)
    return delta !== 0 ? delta : left.filename.localeCompare(right.filename)
  })
}
