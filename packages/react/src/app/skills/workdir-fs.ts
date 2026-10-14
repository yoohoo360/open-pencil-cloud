import { IS_TAURI } from '@open-pencil/core/constants'
import { unzipSync, zipSync, type Zippable } from 'fflate'

import {
  SKILL_AGENT_ENVIRONMENTS,
  type SkillAgentEnvironmentId
} from '#react/app/skills/agent-environments'
import { normalizeSkillPackageEntries } from '#react/app/skills/platform-package'
import type { WorkdirRecord } from '#react/app/skills/workdir-idb'

export type ScannedSkill = {
  key: string
  name: string
  /** Folder with SKILL.md is enabled; `{key}.zip` archive is disabled. */
  enabled: boolean
  agentEnvironments: SkillAgentEnvironmentId[]
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

function skillNameFromEntries(entries: Record<string, Uint8Array>, fallback: string): string {
  const raw = entries['SKILL.md'] ?? entries['skill.md']
  if (!raw) return fallback
  return parseSkillName(new TextDecoder().decode(raw), fallback)
}

function envRelativeDir(id: SkillAgentEnvironmentId): string {
  return (
    SKILL_AGENT_ENVIRONMENTS.find((item) => item.id === id)?.relativeSkillsDir ??
    `.${id}/skills`
  )
}

function parseSkillName(skillMd: string, fallback: string): string {
  const match = skillMd.match(/^---\r?\n([\s\S]*?)\r?\n---/)
  if (!match) return fallback
  const nameLine = match[1]?.match(/^name:\s*(.+)$/m)
  const raw = nameLine?.[1]?.trim()
  if (!raw) return fallback
  return raw.replace(/^['"]|['"]$/g, '') || fallback
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

function mergeScanned(
  byKey: Map<string, ScannedSkill>,
  skill: ScannedSkill
): void {
  const existing = byKey.get(skill.key)
  if (!existing) {
    byKey.set(skill.key, skill)
    return
  }
  if (!existing.agentEnvironments.includes(skill.agentEnvironments[0]!)) {
    existing.agentEnvironments = [...existing.agentEnvironments, ...skill.agentEnvironments]
  }
  // Folder (enabled) wins over a zip archive when both appear.
  if (skill.enabled && !existing.enabled) {
    existing.enabled = true
    existing.name = skill.name
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
          mergeScanned(byKey, {
            key: name,
            name: parseSkillName(text, name),
            enabled: true,
            agentEnvironments: [env]
          })
        } catch {
          // skip folders without SKILL.md
        }
        continue
      }
      const key = skillKeyFromArchiveName(name)
      if (!key) continue
      try {
        const file = await (await skillsDir.getFileHandle(name)).getFile()
        const bytes = new Uint8Array(await file.arrayBuffer())
        const entries = zipToEntries(bytes)
        mergeScanned(byKey, {
          key,
          name: skillNameFromEntries(entries, key),
          enabled: false,
          agentEnvironments: [env]
        })
      } catch {
        // skip bad zips
      }
    }
  }
  return [...byKey.values()]
}

async function tauriReadText(path: string): Promise<string | null> {
  try {
    const { readFile } = await import('@tauri-apps/plugin-fs')
    const bytes = await readFile(path)
    return new TextDecoder().decode(bytes)
  } catch {
    return null
  }
}

async function scanTauriPath(
  projectPath: string,
  envs: SkillAgentEnvironmentId[]
): Promise<ScannedSkill[]> {
  const { readDir, readFile } = await import('@tauri-apps/plugin-fs')
  const byKey = new Map<string, ScannedSkill>()
  const root = projectPath.replace(/[/\\]+$/, '')
  for (const env of envs) {
    const skillsPath = `${root}/${envRelativeDir(env)}`
    let listing: Awaited<ReturnType<typeof readDir>>
    try {
      listing = await readDir(skillsPath)
    } catch {
      continue
    }
    for (const entry of listing) {
      if (!entry.name) continue
      if (entry.isDirectory) {
        const key = entry.name
        const skillMd = await tauriReadText(`${skillsPath}/${key}/SKILL.md`)
        const text =
          skillMd ?? (await tauriReadText(`${skillsPath}/${key}/skill.md`))
        if (text === null) continue
        mergeScanned(byKey, {
          key,
          name: parseSkillName(text, key),
          enabled: true,
          agentEnvironments: [env]
        })
        continue
      }
      const key = skillKeyFromArchiveName(entry.name)
      if (!key) continue
      try {
        const bytes = await readFile(`${skillsPath}/${entry.name}`)
        const entries = zipToEntries(bytes)
        mergeScanned(byKey, {
          key,
          name: skillNameFromEntries(entries, key),
          enabled: false,
          agentEnvironments: [env]
        })
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
    return scanTauriPath(record.path, envs)
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

async function readTauriSkillEntries(
  projectPath: string,
  envs: SkillAgentEnvironmentId[],
  key: string
): Promise<Record<string, Uint8Array> | null> {
  const { readDir, readFile } = await import('@tauri-apps/plugin-fs')
  const root = projectPath.replace(/[/\\]+$/, '')

  async function walk(dir: string, prefix: string, entries: Record<string, Uint8Array>) {
    let listing: Awaited<ReturnType<typeof readDir>>
    try {
      listing = await readDir(dir)
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
        entries[path] = await readFile(full)
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

/**
 * Read an on-disk skill package from the first agent folder that has it.
 * Searches every known agent root so sync still works when the skill only
 * exists outside the current install-target selection.
 */
export async function readSkillEntriesFromWorkdir(
  record: WorkdirRecord,
  key: string
): Promise<Record<string, Uint8Array> | null> {
  const envs = SKILL_AGENT_ENVIRONMENTS.map((item) => item.id)
  if (IS_TAURI && record.path.trim()) {
    return readTauriSkillEntries(record.path, envs, key)
  }
  if (record.directoryHandle) {
    return readBrowserSkillEntries(record.directoryHandle, envs, key)
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

async function writeTauriSkill(
  projectPath: string,
  envs: SkillAgentEnvironmentId[],
  key: string,
  entries: Record<string, Uint8Array>
): Promise<void> {
  const { mkdir, writeFile, remove } = await import('@tauri-apps/plugin-fs')
  const root = projectPath.replace(/[/\\]+$/, '')
  for (const env of envs) {
    const skillDir = `${root}/${envRelativeDir(env)}/${key}`
    try {
      await remove(skillDir, { recursive: true })
    } catch {
      // first install
    }
    await mkdir(skillDir, { recursive: true })
    for (const [name, data] of Object.entries(entries)) {
      if (!name || name.endsWith('/')) continue
      if (name.includes('..')) throw new Error('Invalid path in skill package')
      const target = `${skillDir}/${name}`
      const parent = target.replace(/[/\\][^/\\]+$/, '')
      await mkdir(parent, { recursive: true })
      await writeFile(target, data)
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
    await writeTauriSkill(record.path, targets, key, entries)
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

async function removeTauriSkill(
  projectPath: string,
  envs: SkillAgentEnvironmentId[],
  key: string
): Promise<void> {
  const { remove } = await import('@tauri-apps/plugin-fs')
  const root = projectPath.replace(/[/\\]+$/, '')
  for (const env of envs) {
    const skillDir = `${root}/${envRelativeDir(env)}/${key}`
    const archive = `${root}/${envRelativeDir(env)}/${skillArchiveName(key)}`
    try {
      await remove(skillDir, { recursive: true })
    } catch {
      // ignore
    }
    try {
      await remove(archive)
    } catch {
      // ignore
    }
  }
}

/** Remove a skill folder (and its archive) from the given agent environment roots. */
export async function removeSkillFromWorkdir(
  record: WorkdirRecord,
  key: string,
  envs: SkillAgentEnvironmentId[]
): Promise<void> {
  const targets = envs.length > 0 ? envs : record.agentEnvironments
  if (IS_TAURI && record.path.trim()) {
    await removeTauriSkill(record.path, targets, key)
    return
  }
  if (record.directoryHandle) {
    await removeBrowserSkill(record.directoryHandle, targets, key)
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

async function archiveTauriSkill(
  projectPath: string,
  envs: SkillAgentEnvironmentId[],
  key: string
): Promise<void> {
  const { mkdir, writeFile, remove } = await import('@tauri-apps/plugin-fs')
  const entries = await readTauriSkillEntries(projectPath, envs, key)
  if (!entries) throw new Error('Skill folder not found to archive')
  const zipBytes = entriesToZip(entries)
  const root = projectPath.replace(/[/\\]+$/, '')
  for (const env of envs) {
    const skillsPath = `${root}/${envRelativeDir(env)}`
    await mkdir(skillsPath, { recursive: true })
    await writeFile(`${skillsPath}/${skillArchiveName(key)}`, zipBytes)
    const skillDir = `${skillsPath}/${key}`
    try {
      await remove(skillDir, { recursive: true })
    } catch {
      // ignore
    }
  }
}

/**
 * Disable a skill: zip its folder to `{key}.zip` in each agent skills dir, then remove the folder.
 * Browser uses File System Access; desktop uses Tauri fs.
 */
export async function archiveSkillInWorkdir(
  record: WorkdirRecord,
  key: string,
  envs: SkillAgentEnvironmentId[]
): Promise<void> {
  const targets = envs.length > 0 ? envs : record.agentEnvironments
  if (IS_TAURI && record.path.trim()) {
    await archiveTauriSkill(record.path, targets, key)
    return
  }
  if (record.directoryHandle) {
    await archiveBrowserSkill(record.directoryHandle, targets, key)
    return
  }
  throw new Error('Workspace folder is not accessible. Re-add the workspace and grant folder access.')
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

async function readTauriArchive(
  projectPath: string,
  envs: SkillAgentEnvironmentId[],
  key: string
): Promise<Uint8Array | null> {
  const { readFile } = await import('@tauri-apps/plugin-fs')
  const root = projectPath.replace(/[/\\]+$/, '')
  for (const env of envs) {
    const archive = `${root}/${envRelativeDir(env)}/${skillArchiveName(key)}`
    try {
      return await readFile(archive)
    } catch {
      continue
    }
  }
  return null
}

async function expandBrowserSkill(
  root: FileSystemDirectoryHandle,
  envs: SkillAgentEnvironmentId[],
  key: string
): Promise<void> {
  const zipBytes = await readBrowserArchive(root, envs, key)
  if (!zipBytes) throw new Error('Skill archive not found')
  const entries = zipToEntries(zipBytes)
  await writeBrowserSkill(root, envs, key, entries)
  if (!(await ensurePermission(root, 'readwrite'))) return
  for (const env of envs) {
    const skillsDir = await getNestedDirectory(root, envRelativeDir(env), false)
    if (!skillsDir) continue
    try {
      await skillsDir.removeEntry(skillArchiveName(key))
    } catch {
      // ignore
    }
  }
}

async function expandTauriSkill(
  projectPath: string,
  envs: SkillAgentEnvironmentId[],
  key: string
): Promise<void> {
  const { remove } = await import('@tauri-apps/plugin-fs')
  const zipBytes = await readTauriArchive(projectPath, envs, key)
  if (!zipBytes) throw new Error('Skill archive not found')
  const entries = zipToEntries(zipBytes)
  await writeTauriSkill(projectPath, envs, key, entries)
  const root = projectPath.replace(/[/\\]+$/, '')
  for (const env of envs) {
    const archive = `${root}/${envRelativeDir(env)}/${skillArchiveName(key)}`
    try {
      await remove(archive)
    } catch {
      // ignore
    }
  }
}

/**
 * Enable a skill: unzip `{key}.zip` into the skill folder in each agent skills dir, then remove the zip.
 */
export async function expandArchivedSkillInWorkdir(
  record: WorkdirRecord,
  key: string,
  envs: SkillAgentEnvironmentId[]
): Promise<void> {
  const targets = envs.length > 0 ? envs : record.agentEnvironments
  if (IS_TAURI && record.path.trim()) {
    await expandTauriSkill(record.path, targets, key)
    return
  }
  if (record.directoryHandle) {
    await expandBrowserSkill(record.directoryHandle, targets, key)
    return
  }
  throw new Error('Workspace folder is not accessible. Re-add the workspace and grant folder access.')
}

/** Read `{key}.zip` bytes from the first agent skills dir that has it. */
export async function readSkillArchiveFromWorkdir(
  record: WorkdirRecord,
  key: string
): Promise<Uint8Array | null> {
  const envs = SKILL_AGENT_ENVIRONMENTS.map((item) => item.id)
  if (IS_TAURI && record.path.trim()) {
    return readTauriArchive(record.path, envs, key)
  }
  if (record.directoryHandle) {
    return readBrowserArchive(record.directoryHandle, envs, key)
  }
  return null
}

/** Write a skill archive into each agent skills dir (keeps the skill disabled). */
export async function writeSkillArchiveToWorkdir(
  record: WorkdirRecord,
  key: string,
  zipBytes: Uint8Array,
  envs: SkillAgentEnvironmentId[]
): Promise<void> {
  const targets = envs.length > 0 ? envs : record.agentEnvironments
  if (IS_TAURI && record.path.trim()) {
    const { mkdir, writeFile, remove } = await import('@tauri-apps/plugin-fs')
    const root = record.path.replace(/[/\\]+$/, '')
    for (const env of targets) {
      const skillsPath = `${root}/${envRelativeDir(env)}`
      await mkdir(skillsPath, { recursive: true })
      await writeFile(`${skillsPath}/${skillArchiveName(key)}`, zipBytes)
      const skillDir = `${skillsPath}/${key}`
      try {
        await remove(skillDir, { recursive: true })
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
        true
      )
      if (!skillsDir) throw new Error(`Cannot create ${envRelativeDir(env)}`)
      const file = await skillsDir.getFileHandle(skillArchiveName(key), { create: true })
      const writable = await file.createWritable()
      await writable.write(zipBytes)
      await writable.close()
      try {
        await skillsDir.removeEntry(key, { recursive: true })
      } catch {
        // ignore
      }
    }
    return
  }
  throw new Error('Workspace folder is not accessible. Re-add the workspace and grant folder access.')
}
