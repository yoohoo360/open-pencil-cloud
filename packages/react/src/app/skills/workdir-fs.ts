import { IS_TAURI } from '@open-pencil/core/constants'
import { unzipSync } from 'fflate'

import {
  DEFAULT_SKILL_AGENT_ENVIRONMENTS,
  SKILL_AGENT_ENVIRONMENTS,
  type SkillAgentEnvironmentId
} from '#react/app/skills/agent-environments'
import type { WorkdirRecord } from '#react/app/skills/workdir-idb'

export type ScannedSkill = {
  key: string
  name: string
  agentEnvironments: SkillAgentEnvironmentId[]
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
      if (handle.kind !== 'directory') continue
      try {
        const skillDir = await skillsDir.getDirectoryHandle(name)
        const file = await skillDir.getFileHandle('SKILL.md').catch(async () =>
          skillDir.getFileHandle('skill.md')
        )
        const text = await (await file.getFile()).text()
        const existing = byKey.get(name)
        if (existing) {
          if (!existing.agentEnvironments.includes(env)) {
            existing.agentEnvironments = [...existing.agentEnvironments, env]
          }
          continue
        }
        byKey.set(name, {
          key: name,
          name: parseSkillName(text, name),
          agentEnvironments: [env]
        })
      } catch {
        // skip folders without SKILL.md
      }
    }
  }
  return [...byKey.values()].sort((a, b) => a.key.localeCompare(b.key))
}

async function scanTauriPath(
  projectPath: string,
  envs: SkillAgentEnvironmentId[]
): Promise<ScannedSkill[]> {
  const { readDir, readTextFile, exists } = await import('@tauri-apps/plugin-fs')
  const byKey = new Map<string, ScannedSkill>()
  for (const env of envs) {
    const skillsPath = `${projectPath.replace(/[/\\]+$/, '')}/${envRelativeDir(env)}`
    if (!(await exists(skillsPath))) continue
    const entries = await readDir(skillsPath)
    for (const entry of entries) {
      if (!entry.isDirectory || !entry.name) continue
      const key = entry.name
      const skillMd = `${skillsPath}/${key}/SKILL.md`
      const alt = `${skillsPath}/${key}/skill.md`
      let text = ''
      try {
        if (await exists(skillMd)) text = await readTextFile(skillMd)
        else if (await exists(alt)) text = await readTextFile(alt)
        else continue
      } catch {
        continue
      }
      const existing = byKey.get(key)
      if (existing) {
        if (!existing.agentEnvironments.includes(env)) {
          existing.agentEnvironments = [...existing.agentEnvironments, env]
        }
        continue
      }
      byKey.set(key, {
        key,
        name: parseSkillName(text, key),
        agentEnvironments: [env]
      })
    }
  }
  return [...byKey.values()].sort((a, b) => a.key.localeCompare(b.key))
}

/** List skill folders under the workspace agent environment roots. */
export async function scanWorkdirSkills(record: WorkdirRecord): Promise<ScannedSkill[]> {
  const envs =
    record.agentEnvironments.length > 0
      ? record.agentEnvironments
      : [...DEFAULT_SKILL_AGENT_ENVIRONMENTS]
  if (record.directoryHandle) {
    return scanBrowserHandle(record.directoryHandle, envs)
  }
  if (IS_TAURI && record.path.trim()) {
    return scanTauriPath(record.path, envs)
  }
  return []
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
  const { mkdir, writeFile, remove, exists } = await import('@tauri-apps/plugin-fs')
  const root = projectPath.replace(/[/\\]+$/, '')
  for (const env of envs) {
    const skillDir = `${root}/${envRelativeDir(env)}/${key}`
    if (await exists(skillDir)) {
      await remove(skillDir, { recursive: true })
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

/** Write skill package files into agent environment folders (no server). */
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
  if (record.directoryHandle) {
    await writeBrowserSkill(record.directoryHandle, targets, key, entries)
    return
  }
  if (IS_TAURI && record.path.trim()) {
    await writeTauriSkill(record.path, targets, key, entries)
    return
  }
  throw new Error('Workspace folder is not accessible. Re-add the workspace and grant access.')
}

/** Expand a skill zip into agent environment folders (no server). */
export async function writeSkillZipToWorkdir(
  record: WorkdirRecord,
  key: string,
  zip: Blob,
  envs: SkillAgentEnvironmentId[]
): Promise<void> {
  const bytes = new Uint8Array(await zip.arrayBuffer())
  if (bytes.byteLength === 0) throw new Error('Skill package is empty')
  const { normalizeSkillPackageEntries } = await import('#react/app/skills/platform-package')
  const entries = normalizeSkillPackageEntries(unzipSync(bytes))
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
  }
}

async function removeTauriSkill(
  projectPath: string,
  envs: SkillAgentEnvironmentId[],
  key: string
): Promise<void> {
  const { remove, exists } = await import('@tauri-apps/plugin-fs')
  const root = projectPath.replace(/[/\\]+$/, '')
  for (const env of envs) {
    const skillDir = `${root}/${envRelativeDir(env)}/${key}`
    if (await exists(skillDir)) {
      await remove(skillDir, { recursive: true })
    }
  }
}

/** Remove a skill folder from the given agent environment roots. */
export async function removeSkillFromWorkdir(
  record: WorkdirRecord,
  key: string,
  envs: SkillAgentEnvironmentId[]
): Promise<void> {
  const targets = envs.length > 0 ? envs : record.agentEnvironments
  if (record.directoryHandle) {
    await removeBrowserSkill(record.directoryHandle, targets, key)
    return
  }
  if (IS_TAURI && record.path.trim()) {
    await removeTauriSkill(record.path, targets, key)
    return
  }
  throw new Error('Workspace folder is not accessible. Re-add the workspace and grant access.')
}
