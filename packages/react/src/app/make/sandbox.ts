/**
 * Client for the fe-esbuild-package preview iframe at MAKE_SANDBOX_SERVER_URL.
 * Load `/embed/preview/`, wait for `iframe-playground-init`, then postMessage
 * project files + packageJson — lockfile is produced by the remote `/api/lock-file`.
 *
 * Source files and package.json are authored by Make skills — the host does not
 * ship default App / entry code.
 */

import {
  ensureMakeLockPlaceholder,
  MAKE_ENTRY_FILE,
  MAKE_LOCK_FILE,
  MAKE_LOCK_PLACEHOLDER,
  isMakeLockFile,
  isMakePackageJsonFile,
  sortMakeFiles,
  upsertMakeFiles
} from '#react/app/make/project-files'

export const MAKE_SANDBOX_NAME = 'open-pencil-make'

export const MakeSandboxMessageType = {
  Init: 'iframe-playground-init',
  FileChange: 'change-playground-files',
  ProjectInit: 'iframe-project-init',
  BuildSuccess: 'iframe-playground-build-success',
  ConsoleChange: 'iframe-playground-console-change',
  ProjectLockFileChange: 'iframe-project-lock-file-change',
  ProjectBuildLoading: 'iframe-project-build-loading'
} as const

export type MakeSandboxFile = {
  filename: string
  code: string
}

export type MakeSandboxPackageJson = {
  name: string
  version: string
  dependencies: Record<string, string>
}

export type MakeSandboxProject = {
  /** Dynamic tree authored by skills; lock is server-owned. */
  files: MakeSandboxFile[]
  packageJson: MakeSandboxPackageJson
}

/** Fallback only when package.json is missing — skills should author the real manifest. */
const FALLBACK_PACKAGE: MakeSandboxPackageJson = {
  name: MAKE_SANDBOX_NAME,
  version: '1.0.0',
  dependencies: {
    react: '18.2.0',
    'react-dom': '18.2.0'
  }
}

export function defaultMakePackageJson(): MakeSandboxPackageJson {
  return {
    ...FALLBACK_PACKAGE,
    dependencies: { ...FALLBACK_PACKAGE.dependencies }
  }
}

export function isMakePackageFile(filename: string): boolean {
  return isMakePackageJsonFile(filename) || isMakeLockFile(filename)
}

export function readMakePackageJson(files: readonly MakeSandboxFile[]): MakeSandboxPackageJson {
  const file = files.find((entry) => isMakePackageJsonFile(entry.filename))
  if (!file) return defaultMakePackageJson()
  try {
    const parsed = JSON.parse(file.code) as Partial<MakeSandboxPackageJson>
    return {
      name: typeof parsed.name === 'string' ? parsed.name : FALLBACK_PACKAGE.name,
      version: typeof parsed.version === 'string' ? parsed.version : FALLBACK_PACKAGE.version,
      dependencies:
        parsed.dependencies && typeof parsed.dependencies === 'object'
          ? { ...parsed.dependencies }
          : { ...FALLBACK_PACKAGE.dependencies }
    }
  } catch {
    return defaultMakePackageJson()
  }
}

export function projectFromFiles(files: readonly MakeSandboxFile[]): MakeSandboxProject {
  const ensured = ensureMakeLockPlaceholder(files, MAKE_LOCK_PLACEHOLDER)
  return {
    files: sortMakeFiles(ensured),
    packageJson: readMakePackageJson(ensured)
  }
}

/** Source files sent to the sandbox iframe (package manifests stay in packageJson). */
export function sandboxSourceFiles(project: MakeSandboxProject): MakeSandboxFile[] {
  return project.files.filter((file) => !isMakePackageFile(file.filename))
}

/** Empty Make project — only the lock placeholder until skills write files. */
export function buildMakeSandboxProject(): MakeSandboxProject {
  return projectFromFiles([{ filename: MAKE_LOCK_FILE, code: MAKE_LOCK_PLACEHOLDER }])
}

/** True when skills have produced an entry the playground can load. */
export function makeProjectHasPreview(project: MakeSandboxProject): boolean {
  const entry = project.files.find((file) => file.filename === MAKE_ENTRY_FILE)?.code.trim()
  const hasPackage = project.files.some(
    (file) => isMakePackageJsonFile(file.filename) && file.code.trim().length > 0
  )
  return Boolean(entry && hasPackage)
}

/** Upsert an editable file. package-lock must use `applyMakeLockFile` (build server only). */
export function upsertMakeProjectFile(
  files: readonly MakeSandboxFile[],
  filename: string,
  code: string
): MakeSandboxFile[] {
  if (isMakeLockFile(filename)) return [...files]
  return upsertMakeFiles(files, [{ filename, code }])
}

/** Apply build-server lock output into the project tree. */
export function applyMakeLockFile(
  files: readonly MakeSandboxFile[],
  lockJson: string
): MakeSandboxFile[] {
  const code = lockJson.endsWith('\n') ? lockJson : `${lockJson}\n`
  const without = files.filter((file) => !isMakeLockFile(file.filename))
  return [...without, { filename: MAKE_LOCK_FILE, code }]
}

/** Merge AI / editor file updates; never accepts package-lock from the model. */
export function mergeMakeProjectUpdates(
  files: readonly MakeSandboxFile[],
  updates: readonly MakeSandboxFile[]
): MakeSandboxFile[] {
  return upsertMakeFiles(files, updates)
}

export function makeSandboxPreviewURL(
  serverURL: string,
  name: string,
  sessionId: string
): string {
  const base = serverURL.replace(/\/+$/, '')
  const url = new URL(`${base}/embed/preview/`)
  url.searchParams.set('name', name)
  url.searchParams.set('uuid', sessionId)
  return url.toString()
}

/**
 * Initialize the remote playground. Do not send package-lock —
 * fe-esbuild-package resolves deps via `/api/lock-file`.
 */
export function postMakeSandboxProjectInit(
  target: Window,
  name: string,
  project: MakeSandboxProject,
  options?: { noCache?: boolean }
) {
  target.postMessage(
    {
      type: MakeSandboxMessageType.ProjectInit,
      name,
      payload: {
        files: sandboxSourceFiles(project),
        packageJson: project.packageJson,
        ...(options?.noCache ? { noCache: true } : {})
      }
    },
    '*'
  )
}

export function postMakeSandboxFileChange(
  target: Window,
  name: string,
  files: readonly MakeSandboxFile[]
) {
  target.postMessage(
    {
      type: MakeSandboxMessageType.FileChange,
      name,
      payload: { files: files.filter((file) => !isMakePackageFile(file.filename)) }
    },
    '*'
  )
}

function isRecord(value: unknown): boolean {
  return typeof value === 'object' && value !== null
}

/** Read sandbox iframe → host message type / demo name / payload. */
export function readMakeSandboxMessage(data: unknown): {
  type: string
  name: string
  payload: Record<string, unknown> | null
} | null {
  if (!isRecord(data) || typeof (data as { type?: unknown }).type !== 'string') return null
  const record = data as Record<string, unknown>
  const payload = isRecord(record.payload) ? (record.payload as Record<string, unknown>) : null
  const name =
    (typeof record.name === 'string' && record.name) ||
    (payload && typeof payload.name === 'string' && payload.name) ||
    ''
  return { type: record.type as string, name, payload }
}

export function newMakeSandboxSessionId(): string {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  return [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}
