import { IS_TAURI } from '@open-pencil/core/constants'
import { unzipSync, zipSync, type Zippable } from 'fflate'

import { isDesktopShell } from '#react/app/desktop/bridge'
import {
  desktopMkdir,
  desktopReadDir,
  desktopReadFile,
  desktopRemove,
  desktopWriteFile
} from '#react/app/desktop/fs'
import {
  SKILL_AGENT_ENVIRONMENTS,
  type SkillAgentEnvironmentId
} from '#react/app/skills/agent-environments'
import { parseSkillFrontmatter } from '#react/app/skills/frontmatter'
import { normalizeSkillPackageEntries } from '#react/app/skills/platform-package'
import {
  DEFAULT_WORKDIR_SKILL_CONFIG,
  OPEN_PENCIL_CONFIG_DIR,
  OPEN_PENCIL_CONFIG_RELATIVE,
  normalizeWorkdirSkillConfig,
  parseWorkdirSkillConfigText,
  serializeWorkdirSkillConfig,
  type WorkdirSkillConfig
} from '#react/app/skills/workdir-config'
import type { WorkdirRecord } from '#react/app/skills/workdir-idb'

export type ScannedSkill = {
  key: string
  name: string
  description: string
  /**
   * Checked only when a skill directory with SKILL.md exists.
   * Zip archives are listed for local skills but never count as checked.
   */
  enabled: boolean
  /** Agent roots that currently have a SKILL.md folder. */
  folderEnvironments: SkillAgentEnvironmentId[]
  /** Agent roots that have `{key}.zip` (local off state). */
  archiveEnvironments: SkillAgentEnvironmentId[]
}

function skillArchiveName(key: string): string {
  return `${key}.zip`
}

function skillKeyFromArchiveName(name: string): string | null {
  if (!name.toLowerCase().endsWith('.zip')) return null
  const key = name.slice(0, -4)
  return key && !key.includes('/') && !key.includes('..') ? key : null
}

function entriesToZip(entries: Record<string, Uint8Array>): Uint8Array {
  const zippable: Zippable = {}
  for (const [path, data] of Object.entries(entries)) {
    if (!path || path.endsWith('/') || path.includes('..')) continue
    zippable[path] = data
  }
  return zipSync(zippable, { level: 6 })
}

function zipToEntries(bytes: Uint8Array): Record<string, Uint8Array> {
  return normalizeSkillPackageEntries(unzipSync(bytes))
}

function metaFromEntries(
  entries: Record<string, Uint8Array>,
  fallbackKey: string
): { name: string; description: string } {
  const raw = entries['SKILL.md'] ?? entries['skill.md']
  if (!raw) return { name: fallbackKey, description: '' }
  return metaFromSkillMd(new TextDecoder().decode(raw), fallbackKey)
}

function metaFromSkillMd(
  skillMd: string,
  fallbackKey: string
): { name: string; description: string } {
  const parsed = parseSkillFrontmatter(skillMd)
  return {
    name: parsed.name.trim() || fallbackKey,
    description: parsed.description.trim()
  }
}

function allAgentEnvIds(): SkillAgentEnvironmentId[] {
  return SKILL_AGENT_ENVIRONMENTS.map((item) => item.id)
}

function envRelativeDir(id: SkillAgentEnvironmentId): string {
  return (
    SKILL_AGENT_ENVIRONMENTS.find((item) => item.id === id)?.relativeSkillsDir ??
    `.${id}/skills`
  )
}

async function ensurePermission(
  handle: FileSystemDirectoryHandle,
  mode: FileSystemPermissionMode
): Promise<boolean> {
  const withPermission = handle as FileSystemDirectoryHandle & {
    queryPermission?: (descriptor: { mode: FileSystemPermissionMode }) => Promise<PermissionState>
    requestPermission?: (descriptor: {
      mode: FileSystemPermissionMode
    }) => Promise<PermissionState>
  }
  if (withPermission.queryPermission) {
    const current = await withPermission.queryPermission({ mode })
    if (current === 'granted') return true
  }
  if (withPermission.requestPermission) {
    const next = await withPermission.requestPermission({ mode })
    return next === 'granted'
  }
  return true
}

async function getNestedDirectory(
  root: FileSystemDirectoryHandle,
  relative: string,
  create: boolean
): Promise<FileSystemDirectoryHandle | null> {
  const parts = relative.split('/').filter(Boolean)
  let current: FileSystemDirectoryHandle = root
  for (const part of parts) {
    try {
      current = await current.getDirectoryHandle(part, { create })
    } catch {
      return null
    }
  }
  return current
}

function ensureScanned(
  byKey: Map<string, ScannedSkill>,
  key: string,
  meta: { name: string; description: string }
): ScannedSkill {
  const existing = byKey.get(key)
  if (existing) {
    if (meta.name && existing.name === key) existing.name = meta.name
    if (meta.description && !existing.description) existing.description = meta.description
    return existing
  }
  const created: ScannedSkill = {
    key,
    name: meta.name || key,
    description: meta.description,
    enabled: false,
    folderEnvironments: [],
    archiveEnvironments: []
  }
  byKey.set(key, created)
  return created
}

function addFolderEnv(
  skill: ScannedSkill,
  env: SkillAgentEnvironmentId,
  meta: { name: string; description: string }
): void {
  skill.enabled = true
  skill.name = meta.name || skill.name
  if (meta.description) skill.description = meta.description
  if (!skill.folderEnvironments.includes(env)) skill.folderEnvironments.push(env)
}

function addArchiveEnv(
  skill: ScannedSkill,
  env: SkillAgentEnvironmentId,
  meta: { name: string; description: string }
): void {
  if (!skill.archiveEnvironments.includes(env)) skill.archiveEnvironments.push(env)
  if (!skill.enabled) {
    if (meta.name) skill.name = meta.name
    if (meta.description && !skill.description) skill.description = meta.description
  }
}

async function scanBrowserHandle(
  root: FileSystemDirectoryHandle,
  envs: SkillAgentEnvironmentId[]
): Promise<ScannedSkill[]> {
  if (!(await ensurePermission(root, 'read'))) {
    throw new Error('Folder permission denied')
  }
  const byKey = new Map<string, ScannedSkill>()
  for (const env of envs) {
    const skillsDir = await getNestedDirectory(root, envRelativeDir(env), false)
    if (!skillsDir) continue
    for await (const [name, handle] of skillsDir.entries()) {
      if (handle.kind === 'directory') {
        try {
          const skillDir = await skillsDir.getDirectoryHandle(name)
          const file = await skillDir.getFileHandle('SKILL.md').catch(async () =>
            skillDir.getFileHandle('skill.md')
          )
          const text = await (await file.getFile()).text()
          const meta = metaFromSkillMd(text, name)
          addFolderEnv(ensureScanned(byKey, name, meta), env, meta)
        } catch {
          // skip folders without SKILL.md
        }
        continue
      }
      // Zips are listed for local off state but never mark enabled/checked.
      const key = skillKeyFromArchiveName(name)
      if (!key) continue
      try {
        const file = await (await skillsDir.getFileHandle(name)).getFile()
        const bytes = new Uint8Array(await file.arrayBuffer())
        const entries = zipToEntries(bytes)
        const meta = metaFromEntries(entries, key)
        addArchiveEnv(ensureScanned(byKey, key, meta), env, meta)
      } catch {
        // skip bad zips
      }
    }
  }
  return [...byKey.values()]
}

async function desktopReadText(path: string): Promise<string | null> {
  try {
    const bytes = await desktopReadFile(path)
    return new TextDecoder().decode(bytes)
  } catch {
    return null
  }
}

async function scanDesktopPath(
  projectPath: string,
  envs: SkillAgentEnvironmentId[]
): Promise<ScannedSkill[]> {
  const byKey = new Map<string, ScannedSkill>()
  const root = projectPath.replace(/[/\\]+$/, '')
  for (const env of envs) {
    const skillsPath = `${root}/${envRelativeDir(env)}`
    let listing: Awaited<ReturnType<typeof desktopReadDir>>
    try {
      listing = await desktopReadDir(skillsPath)
    } catch {
      continue
    }
    for (const entry of listing) {
      if (!entry.name) continue
      if (entry.isDirectory) {
        const key = entry.name
        const skillMd = await desktopReadText(`${skillsPath}/${key}/SKILL.md`)
        const text = skillMd ?? (await desktopReadText(`${skillsPath}/${key}/skill.md`))
        if (text === null) continue
        const meta = metaFromSkillMd(text, key)
        addFolderEnv(ensureScanned(byKey, key, meta), env, meta)
        continue
      }
      // Zips are listed for local off state but never mark enabled/checked.
      const key = skillKeyFromArchiveName(entry.name)
      if (!key) continue
      try {
        const bytes = await desktopReadFile(`${skillsPath}/${entry.name}`)
        const entries = zipToEntries(bytes)
        const meta = metaFromEntries(entries, key)
        addArchiveEnv(ensureScanned(byKey, key, meta), env, meta)
      } catch {
        // skip bad zips
      }
    }
  }
  return [...byKey.values()]
}

/**
 * List skill folders under agent environment roots.
 * Discovery always scans every known agent root so local skills are not
 * hidden when the workspace install-target selection is a subset.
 * Pass `envs` to limit the scan (writes / sync still use workdir targets).
 */
export async function scanWorkdirSkills(
  record: WorkdirRecord,
  options?: { envs?: readonly SkillAgentEnvironmentId[] }
): Promise<ScannedSkill[]> {
  const envs =
    options?.envs && options.envs.length > 0
      ? [...options.envs]
      : SKILL_AGENT_ENVIRONMENTS.map((item) => item.id)
  // Desktop uses absolute paths; browser File System Access handles are separate.
  if (IS_TAURI && record.path.trim()) {
    return scanDesktopPath(record.path, envs)
  }
  if (record.directoryHandle) {
    return scanBrowserHandle(record.directoryHandle, envs)
  }
  return []
}

async function readBrowserSkillEntries(
  root: FileSystemDirectoryHandle,
  envs: SkillAgentEnvironmentId[],
  key: string
): Promise<Record<string, Uint8Array> | null> {
  if (!(await ensurePermission(root, 'read'))) return null
  for (const env of envs) {
    const skillsDir = await getNestedDirectory(root, envRelativeDir(env), false)
    if (!skillsDir) continue
    let skillDir: FileSystemDirectoryHandle
    try {
      skillDir = await skillsDir.getDirectoryHandle(key)
    } catch {
      continue
    }
    const entries: Record<string, Uint8Array> = {}
    async function walk(dir: FileSystemDirectoryHandle, prefix: string) {
      for await (const [name, handle] of dir.entries()) {
        const path = prefix ? `${prefix}/${name}` : name
        if (handle.kind === 'directory') {
          await walk(await dir.getDirectoryHandle(name), path)
          continue
        }
        const file = await (await dir.getFileHandle(name)).getFile()
        entries[path] = new Uint8Array(await file.arrayBuffer())
      }
    }
    await walk(skillDir, '')
    if (entries['SKILL.md'] || entries['skill.md']) return entries
  }
  return null
}

async function readDesktopSkillEntries(
  projectPath: string,
  envs: SkillAgentEnvironmentId[],
  key: string
): Promise<Record<string, Uint8Array> | null> {
  const root = projectPath.replace(/[/\\]+$/, '')

  async function walk(dir: string, prefix: string, entries: Record<string, Uint8Array>) {
    let listing: Awaited<ReturnType<typeof desktopReadDir>>
    try {
      listing = await desktopReadDir(dir)
    } catch {
      return
    }
    for (const entry of listing) {
      if (!entry.name) continue
      const path = prefix ? `${prefix}/${entry.name}` : entry.name
      const full = `${dir}/${entry.name}`
      if (entry.isDirectory) {
        await walk(full, path, entries)
        continue
      }
      try {
        entries[path] = await desktopReadFile(full)
      } catch {
        // skip unreadable files
      }
    }
  }

  for (const env of envs) {
    const skillDir = `${root}/${envRelativeDir(env)}/${key}`
    const entries: Record<string, Uint8Array> = {}
    await walk(skillDir, '', entries)
    if (entries['SKILL.md'] || entries['skill.md']) return entries
  }
  return null
}

async function readBrowserArchive(
  root: FileSystemDirectoryHandle,
  envs: SkillAgentEnvironmentId[],
  key: string
): Promise<Uint8Array | null> {
  if (!(await ensurePermission(root, 'read'))) return null
  for (const env of envs) {
    const skillsDir = await getNestedDirectory(root, envRelativeDir(env), false)
    if (!skillsDir) continue
    try {
      const file = await (await skillsDir.getFileHandle(skillArchiveName(key))).getFile()
      return new Uint8Array(await file.arrayBuffer())
    } catch {
      // try next env
    }
  }
  return null
}

async function readDesktopArchive(
  projectPath: string,
  envs: SkillAgentEnvironmentId[],
  key: string
): Promise<Uint8Array | null> {
  const root = projectPath.replace(/[/\\]+$/, '')
  for (const env of envs) {
    const archive = `${root}/${envRelativeDir(env)}/${skillArchiveName(key)}`
    try {
      return await desktopReadFile(archive)
    } catch {
      continue
    }
  }
  return null
}

/**
 * Read skill package bytes: prefer SKILL.md folder, then `{key}.zip`.
 * Searches every known agent root.
 */
export async function readSkillEntriesFromWorkdir(
  record: WorkdirRecord,
  key: string
): Promise<Record<string, Uint8Array> | null> {
  const envs = allAgentEnvIds()
  if (IS_TAURI && record.path.trim()) {
    const fromFolder = await readDesktopSkillEntries(record.path, envs, key)
    if (fromFolder) return fromFolder
    const archive = await readDesktopArchive(record.path, envs, key)
    return archive ? zipToEntries(archive) : null
  }
  if (record.directoryHandle) {
    const fromFolder = await readBrowserSkillEntries(record.directoryHandle, envs, key)
    if (fromFolder) return fromFolder
    const archive = await readBrowserArchive(record.directoryHandle, envs, key)
    return archive ? zipToEntries(archive) : null
  }
  return null
}

async function writeBrowserSkill(
  root: FileSystemDirectoryHandle,
  envs: SkillAgentEnvironmentId[],
  key: string,
  entries: Record<string, Uint8Array>
): Promise<void> {
  if (!(await ensurePermission(root, 'readwrite'))) {
    throw new Error('Folder write permission denied')
  }
  for (const env of envs) {
    const skillsDir = await getNestedDirectory(root, envRelativeDir(env), true)
    if (!skillsDir) throw new Error(`Cannot create ${envRelativeDir(env)}`)
    try {
      await skillsDir.removeEntry(key, { recursive: true })
    } catch {
      // first install
    }
    const skillDir = await skillsDir.getDirectoryHandle(key, { create: true })
    for (const [name, data] of Object.entries(entries)) {
      if (!name || name.endsWith('/')) continue
      if (name.includes('..')) throw new Error('Invalid path in skill package')
      const parts = name.split('/')
      let dir = skillDir
      for (const part of parts.slice(0, -1)) {
        dir = await dir.getDirectoryHandle(part, { create: true })
      }
      const fileName = parts.at(-1)
      if (!fileName) continue
      const file = await dir.getFileHandle(fileName, { create: true })
      const writable = await file.createWritable()
      await writable.write(data)
      await writable.close()
    }
  }
}

async function writeDesktopSkill(
  projectPath: string,
  envs: SkillAgentEnvironmentId[],
  key: string,
  entries: Record<string, Uint8Array>
): Promise<void> {
  const root = projectPath.replace(/[/\\]+$/, '')
  for (const env of envs) {
    const skillDir = `${root}/${envRelativeDir(env)}/${key}`
    try {
      await desktopRemove(skillDir, { recursive: true })
    } catch {
      // first install
    }
    await desktopMkdir(skillDir)
    for (const [name, data] of Object.entries(entries)) {
      if (!name || name.endsWith('/')) continue
      if (name.includes('..')) throw new Error('Invalid path in skill package')
      const target = `${skillDir}/${name}`
      const parent = target.replace(/[/\\][^/\\]+$/, '')
      await desktopMkdir(parent)
      await desktopWriteFile(target, data)
    }
  }
}

/** Write skill package files into agent environment folders (local disk / handle only). */
export async function writeSkillEntriesToWorkdir(
  record: WorkdirRecord,
  key: string,
  entries: Record<string, Uint8Array>,
  envs: SkillAgentEnvironmentId[]
): Promise<void> {
  if (!entries['SKILL.md'] && !entries['skill.md']) {
    throw new Error('Skill package must include SKILL.md')
  }
  const targets = envs.length > 0 ? envs : record.agentEnvironments
  if (IS_TAURI && record.path.trim()) {
    await writeDesktopSkill(record.path, targets, key, entries)
    return
  }
  if (record.directoryHandle) {
    await writeBrowserSkill(record.directoryHandle, targets, key, entries)
    return
  }
  throw new Error('Workspace folder is not accessible. Re-add the workspace and grant folder access.')
}

/** Expand a skill zip blob into agent environment folders. */
export async function writeSkillZipToWorkdir(
  record: WorkdirRecord,
  key: string,
  zip: Blob,
  envs: SkillAgentEnvironmentId[]
): Promise<void> {
  const bytes = new Uint8Array(await zip.arrayBuffer())
  if (bytes.byteLength === 0) throw new Error('Skill package is empty')
  const entries = zipToEntries(bytes)
  await writeSkillEntriesToWorkdir(record, key, entries, envs)
}

async function removeBrowserSkill(
  root: FileSystemDirectoryHandle,
  envs: SkillAgentEnvironmentId[],
  key: string
): Promise<void> {
  if (!(await ensurePermission(root, 'readwrite'))) {
    throw new Error('Folder write permission denied')
  }
  for (const env of envs) {
    const skillsDir = await getNestedDirectory(root, envRelativeDir(env), false)
    if (!skillsDir) continue
    try {
      await skillsDir.removeEntry(key, { recursive: true })
    } catch {
      // already missing
    }
    try {
      await skillsDir.removeEntry(skillArchiveName(key))
    } catch {
      // no archive
    }
  }
}

async function removeDesktopSkill(
  projectPath: string,
  envs: SkillAgentEnvironmentId[],
  key: string
): Promise<void> {
  const root = projectPath.replace(/[/\\]+$/, '')
  for (const env of envs) {
    const skillDir = `${root}/${envRelativeDir(env)}/${key}`
    const archive = `${root}/${envRelativeDir(env)}/${skillArchiveName(key)}`
    try {
      await desktopRemove(skillDir, { recursive: true })
    } catch {
      // ignore
    }
    try {
      await desktopRemove(archive)
    } catch {
      // ignore
    }
  }
}

/** Remove a skill folder and any `{key}.zip` from the given agent roots (platform off). */
export async function removeSkillFromWorkdir(
  record: WorkdirRecord,
  key: string,
  envs: SkillAgentEnvironmentId[]
): Promise<void> {
  const targets = envs.length > 0 ? envs : allAgentEnvIds()
  if (IS_TAURI && record.path.trim()) {
    await removeDesktopSkill(record.path, targets, key)
    return
  }
  if (record.directoryHandle) {
    await removeBrowserSkill(record.directoryHandle, targets, key)
    return
  }
  throw new Error('Workspace folder is not accessible. Re-add the workspace and grant folder access.')
}

/** Remove only `{key}.zip` archives (keeps skill folders). */
export async function removeSkillArchivesFromWorkdir(
  record: WorkdirRecord,
  key: string,
  envs: SkillAgentEnvironmentId[]
): Promise<void> {
  const targets = envs.length > 0 ? envs : allAgentEnvIds()
  if (IS_TAURI && record.path.trim()) {
    const root = record.path.replace(/[/\\]+$/, '')
    for (const env of targets) {
      try {
        await desktopRemove(`${root}/${envRelativeDir(env)}/${skillArchiveName(key)}`)
      } catch {
        // ignore
      }
    }
    return
  }
  if (record.directoryHandle) {
    if (!(await ensurePermission(record.directoryHandle, 'readwrite'))) {
      throw new Error('Folder write permission denied')
    }
    for (const env of targets) {
      const skillsDir = await getNestedDirectory(
        record.directoryHandle,
        envRelativeDir(env),
        false
      )
      if (!skillsDir) continue
      try {
        await skillsDir.removeEntry(skillArchiveName(key))
      } catch {
        // ignore
      }
    }
    return
  }
  throw new Error('Workspace folder is not accessible. Re-add the workspace and grant folder access.')
}

async function archiveBrowserSkill(
  root: FileSystemDirectoryHandle,
  envs: SkillAgentEnvironmentId[],
  key: string
): Promise<void> {
  if (!(await ensurePermission(root, 'readwrite'))) {
    throw new Error('Folder write permission denied')
  }
  const entries = await readBrowserSkillEntries(root, envs, key)
  if (!entries) throw new Error('Skill folder not found to archive')
  const zipBytes = entriesToZip(entries)
  for (const env of envs) {
    const skillsDir = await getNestedDirectory(root, envRelativeDir(env), true)
    if (!skillsDir) throw new Error(`Cannot create ${envRelativeDir(env)}`)
    const file = await skillsDir.getFileHandle(skillArchiveName(key), { create: true })
    const writable = await file.createWritable()
    await writable.write(zipBytes)
    await writable.close()
    try {
      await skillsDir.removeEntry(key, { recursive: true })
    } catch {
      // folder may only exist in some envs
    }
  }
}

async function archiveDesktopSkill(
  projectPath: string,
  envs: SkillAgentEnvironmentId[],
  key: string
): Promise<void> {
  const entries = await readDesktopSkillEntries(projectPath, envs, key)
  if (!entries) throw new Error('Skill folder not found to archive')
  const zipBytes = entriesToZip(entries)
  const root = projectPath.replace(/[/\\]+$/, '')
  for (const env of envs) {
    const skillsPath = `${root}/${envRelativeDir(env)}`
    await desktopMkdir(skillsPath)
    await desktopWriteFile(`${skillsPath}/${skillArchiveName(key)}`, zipBytes)
    try {
      await desktopRemove(`${skillsPath}/${key}`, { recursive: true })
    } catch {
      // ignore
    }
  }
}

/** Local off: zip the skill folder to `{key}.zip`, then remove the folder. */
export async function archiveSkillInWorkdir(
  record: WorkdirRecord,
  key: string,
  envs: SkillAgentEnvironmentId[]
): Promise<void> {
  const targets = envs.length > 0 ? envs : allAgentEnvIds()
  if (IS_TAURI && record.path.trim()) {
    await archiveDesktopSkill(record.path, targets, key)
    return
  }
  if (record.directoryHandle) {
    await archiveBrowserSkill(record.directoryHandle, targets, key)
    return
  }
  throw new Error('Workspace folder is not accessible. Re-add the workspace and grant folder access.')
}

async function expandBrowserSkill(
  root: FileSystemDirectoryHandle,
  envs: SkillAgentEnvironmentId[],
  key: string
): Promise<void> {
  const zipBytes = await readBrowserArchive(root, allAgentEnvIds(), key)
  if (!zipBytes) throw new Error('Skill archive not found')
  const entries = zipToEntries(zipBytes)
  await writeBrowserSkill(root, envs, key, entries)
  if (!(await ensurePermission(root, 'readwrite'))) return
  for (const env of allAgentEnvIds()) {
    const skillsDir = await getNestedDirectory(root, envRelativeDir(env), false)
    if (!skillsDir) continue
    try {
      await skillsDir.removeEntry(skillArchiveName(key))
    } catch {
      // ignore
    }
  }
}

async function expandDesktopSkill(
  projectPath: string,
  envs: SkillAgentEnvironmentId[],
  key: string
): Promise<void> {
  const zipBytes = await readDesktopArchive(projectPath, allAgentEnvIds(), key)
  if (!zipBytes) throw new Error('Skill archive not found')
  const entries = zipToEntries(zipBytes)
  await writeDesktopSkill(projectPath, envs, key, entries)
  const root = projectPath.replace(/[/\\]+$/, '')
  for (const env of allAgentEnvIds()) {
    try {
      await desktopRemove(`${root}/${envRelativeDir(env)}/${skillArchiveName(key)}`)
    } catch {
      // ignore
    }
  }
}

/** Local on: expand `{key}.zip` into skill folders, then remove the archives. */
export async function expandArchivedSkillInWorkdir(
  record: WorkdirRecord,
  key: string,
  envs: SkillAgentEnvironmentId[]
): Promise<void> {
  const targets = envs.length > 0 ? envs : allAgentEnvIds()
  if (IS_TAURI && record.path.trim()) {
    await expandDesktopSkill(record.path, targets, key)
    return
  }
  if (record.directoryHandle) {
    await expandBrowserSkill(record.directoryHandle, targets, key)
    return
  }
  throw new Error('Workspace folder is not accessible. Re-add the workspace and grant folder access.')
}

function usesDesktopPath(record: WorkdirRecord): boolean {
  return Boolean(record.path.trim()) && (IS_TAURI || isDesktopShell())
}

async function readBrowserConfigText(
  root: FileSystemDirectoryHandle
): Promise<string | null> {
  if (!(await ensurePermission(root, 'read'))) return null
  try {
    const dir = await getNestedDirectory(root, OPEN_PENCIL_CONFIG_DIR, false)
    if (!dir) return null
    const file = await dir.getFileHandle('config.json')
    return (await file.getFile()).text()
  } catch {
    return null
  }
}

async function writeBrowserConfigText(
  root: FileSystemDirectoryHandle,
  text: string
): Promise<void> {
  if (!(await ensurePermission(root, 'readwrite'))) {
    throw new Error('Folder permission denied')
  }
  const dir = await getNestedDirectory(root, OPEN_PENCIL_CONFIG_DIR, true)
  if (!dir) throw new Error('Could not create .open-pencil directory')
  const handle = await dir.getFileHandle('config.json', { create: true })
  const writable = await handle.createWritable()
  await writable.write(text)
  await writable.close()
}

/** Read `.open-pencil/config.json` from the workspace project root. */
export async function readWorkdirSkillConfig(
  record: WorkdirRecord
): Promise<WorkdirSkillConfig> {
  try {
    if (usesDesktopPath(record)) {
      const root = record.path.replace(/[/\\]+$/, '')
      const text = await desktopReadText(`${root}/${OPEN_PENCIL_CONFIG_RELATIVE}`)
      if (text === null) return structuredClone(DEFAULT_WORKDIR_SKILL_CONFIG)
      return parseWorkdirSkillConfigText(text)
    }
    if (record.directoryHandle) {
      const text = await readBrowserConfigText(record.directoryHandle)
      if (text === null) return structuredClone(DEFAULT_WORKDIR_SKILL_CONFIG)
      return parseWorkdirSkillConfigText(text)
    }
  } catch {
    // missing or invalid → defaults
  }
  return structuredClone(DEFAULT_WORKDIR_SKILL_CONFIG)
}

/** Write `.open-pencil/config.json` (creates the directory when needed). */
export async function writeWorkdirSkillConfig(
  record: WorkdirRecord,
  config: WorkdirSkillConfig
): Promise<WorkdirSkillConfig> {
  const normalized = normalizeWorkdirSkillConfig(config)
  const text = serializeWorkdirSkillConfig(normalized)
  const bytes = new TextEncoder().encode(text)
  if (usesDesktopPath(record)) {
    const root = record.path.replace(/[/\\]+$/, '')
    await desktopMkdir(`${root}/${OPEN_PENCIL_CONFIG_DIR}`)
    await desktopWriteFile(`${root}/${OPEN_PENCIL_CONFIG_RELATIVE}`, bytes)
    return normalized
  }
  if (record.directoryHandle) {
    await writeBrowserConfigText(record.directoryHandle, text)
    return normalized
  }
  throw new Error('Workspace folder is not accessible. Re-add the workspace and grant folder access.')
}
