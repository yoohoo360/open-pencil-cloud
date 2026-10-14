import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync
} from 'node:fs'
import { basename, dirname, isAbsolute, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { unzipSync } from 'fflate'

import {
  normalizeAgentEnvironments,
  uniqueRelativeSkillsDirs,
  type SkillAgentEnvironmentId
} from './agent-environments.ts'
import type {
  WorkdirIndex,
  WorkdirRecord,
  WorkdirSkillPackage,
  WorkdirSkillRecord
} from './types.ts'

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..')

export function defaultWorkdirRoot(): string {
  const fromEnv = process.env.OPENPENCIL_WORKDIR_ROOT?.trim()
  if (fromEnv) return resolve(fromEnv)
  return join(packageRoot, '.data', 'workdirs')
}

function emptyIndex(): WorkdirIndex {
  return { activeWorkdirId: null, workdirs: [] }
}

function newId(): string {
  const bytes = new Uint8Array(8)
  crypto.getRandomValues(bytes)
  return [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

function sanitizeSkillKey(key: string): string {
  const trimmed = key.trim()
  if (!trimmed || trimmed.includes('/') || trimmed.includes('\\') || trimmed.includes('..')) {
    throw new Error('Invalid skill key')
  }
  return trimmed
}

function assertProjectPath(path: string): string {
  const resolved = resolve(path.trim())
  if (!isAbsolute(resolved)) throw new Error('Working directory path must be absolute')
  if (!existsSync(resolved) || !statSync(resolved).isDirectory()) {
    throw new Error('Working directory path must be an existing folder')
  }
  return resolved
}

export class WorkdirStore {
  readonly root: string

  constructor(root = defaultWorkdirRoot()) {
    this.root = root
    mkdirSync(this.root, { recursive: true })
  }

  private indexPath(): string {
    return join(this.root, 'index.json')
  }

  private metaPath(id: string): string {
    return join(this.root, id, 'meta.json')
  }

  readIndex(): WorkdirIndex {
    const path = this.indexPath()
    if (!existsSync(path)) return emptyIndex()
    try {
      const raw = JSON.parse(readFileSync(path, 'utf8')) as unknown
      if (!raw || typeof raw !== 'object') return emptyIndex()
      const record = raw as Record<string, unknown>
      const activeWorkdirId =
        typeof record.activeWorkdirId === 'string' ? record.activeWorkdirId : null
      const workdirs = Array.isArray(record.workdirs)
        ? record.workdirs.flatMap((item) => {
            if (!item || typeof item !== 'object') return []
            const row = item as Record<string, unknown>
            const id = typeof row.id === 'string' ? row.id : ''
            const name = typeof row.name === 'string' ? row.name : ''
            const projectPath = typeof row.path === 'string' ? row.path : ''
            const createdAt = typeof row.createdAt === 'string' ? row.createdAt : ''
            if (!id || !name || !projectPath) return []
            return [
              {
                id,
                name,
                path: projectPath,
                createdAt: createdAt || new Date(0).toISOString()
              }
            ]
          })
        : []
      return { activeWorkdirId, workdirs }
    } catch {
      return emptyIndex()
    }
  }

  private writeIndex(index: WorkdirIndex) {
    writeFileSync(this.indexPath(), `${JSON.stringify(index, null, 2)}\n`, 'utf8')
  }

  readWorkdir(id: string): WorkdirRecord | null {
    const path = this.metaPath(id)
    if (!existsSync(path)) return null
    try {
      const raw = JSON.parse(readFileSync(path, 'utf8')) as unknown
      if (!raw || typeof raw !== 'object') return null
      const record = raw as Record<string, unknown>
      const name = typeof record.name === 'string' ? record.name : ''
      const projectPath = typeof record.path === 'string' ? record.path : ''
      const createdAt = typeof record.createdAt === 'string' ? record.createdAt : ''
      const agentEnvironments = normalizeAgentEnvironments(record.agentEnvironments)
      const skills = Array.isArray(record.skills)
        ? record.skills.flatMap((item) => {
            if (!item || typeof item !== 'object') return []
            const row = item as Record<string, unknown>
            const key = typeof row.key === 'string' ? row.key : ''
            const skillName = typeof row.name === 'string' ? row.name : key
            const enabled = row.enabled !== false
            const updatedAt =
              typeof row.updatedAt === 'string' ? row.updatedAt : new Date(0).toISOString()
            const skillEnvs = normalizeAgentEnvironments(row.agentEnvironments, agentEnvironments)
            if (!key) return []
            return [
              {
                key,
                name: skillName || key,
                enabled,
                agentEnvironments: skillEnvs,
                updatedAt
              } satisfies WorkdirSkillRecord
            ]
          })
        : []
      if (!name || !projectPath) return null
      return {
        id,
        name,
        path: projectPath,
        agentEnvironments,
        createdAt: createdAt || new Date(0).toISOString(),
        skills
      }
    } catch {
      return null
    }
  }

  private writeWorkdir(record: WorkdirRecord) {
    mkdirSync(join(this.root, record.id), { recursive: true })
    writeFileSync(this.metaPath(record.id), `${JSON.stringify(record, null, 2)}\n`, 'utf8')
  }

  list(): { index: WorkdirIndex; workdirs: WorkdirRecord[] } {
    const index = this.readIndex()
    const workdirs = index.workdirs
      .map((entry) => this.readWorkdir(entry.id))
      .filter((item): item is WorkdirRecord => item !== null)
    return { index, workdirs }
  }

  create(options: {
    path: string
    agentEnvironments?: SkillAgentEnvironmentId[]
    name?: string
  }): WorkdirRecord {
    const projectPath = assertProjectPath(options.path)
    const name = (options.name?.trim() || basename(projectPath) || 'workspace').trim()
    const agentEnvironments = normalizeAgentEnvironments(options.agentEnvironments)
    const id = newId()
    const createdAt = new Date().toISOString()
    const record: WorkdirRecord = {
      id,
      name,
      path: projectPath,
      agentEnvironments,
      createdAt,
      skills: []
    }
    this.writeWorkdir(record)
    const index = this.readIndex()
    index.workdirs.push({ id, name, path: projectPath, createdAt })
    if (!index.activeWorkdirId) index.activeWorkdirId = id
    this.writeIndex(index)
    return record
  }

  update(
    id: string,
    patch: { agentEnvironments?: SkillAgentEnvironmentId[]; name?: string }
  ): WorkdirRecord {
    const workdir = this.readWorkdir(id)
    if (!workdir) throw new Error('Workdir not found')
    if (typeof patch.name === 'string' && patch.name.trim()) {
      workdir.name = patch.name.trim()
    }
    if (patch.agentEnvironments) {
      workdir.agentEnvironments = normalizeAgentEnvironments(patch.agentEnvironments)
    }
    this.writeWorkdir(workdir)
    const index = this.readIndex()
    index.workdirs = index.workdirs.map((entry) =>
      entry.id === id ? { ...entry, name: workdir.name, path: workdir.path } : entry
    )
    this.writeIndex(index)
    return workdir
  }

  remove(id: string): boolean {
    const metaDir = join(this.root, id)
    if (!existsSync(metaDir)) return false
    rmSync(metaDir, { recursive: true, force: true })
    const index = this.readIndex()
    index.workdirs = index.workdirs.filter((entry) => entry.id !== id)
    if (index.activeWorkdirId === id) {
      index.activeWorkdirId = index.workdirs[0]?.id ?? null
    }
    this.writeIndex(index)
    return true
  }

  activate(id: string): WorkdirIndex {
    const record = this.readWorkdir(id)
    if (!record) throw new Error('Workdir not found')
    const index = this.readIndex()
    index.activeWorkdirId = id
    this.writeIndex(index)
    return index
  }

  private skillDir(projectPath: string, relativeSkillsDir: string, key: string): string {
    return join(projectPath, relativeSkillsDir, sanitizeSkillKey(key))
  }

  private writeSkillFolder(
    projectPath: string,
    relativeSkillsDir: string,
    key: string,
    entries: Record<string, Uint8Array>
  ) {
    const dir = this.skillDir(projectPath, relativeSkillsDir, key)
    rmSync(dir, { recursive: true, force: true })
    mkdirSync(dir, { recursive: true })
    for (const [name, data] of Object.entries(entries)) {
      if (!name || name.endsWith('/')) continue
      if (name.includes('..')) throw new Error('Invalid path in skill package')
      const target = join(dir, name)
      mkdirSync(dirname(target), { recursive: true })
      writeFileSync(target, data)
    }
  }

  private removeSkillFolders(
    projectPath: string,
    key: string,
    envs: SkillAgentEnvironmentId[]
  ) {
    for (const relative of uniqueRelativeSkillsDirs(envs)) {
      const dir = this.skillDir(projectPath, relative, key)
      if (existsSync(dir)) rmSync(dir, { recursive: true, force: true })
    }
  }

  putSkill(
    workdirId: string,
    key: string,
    zipBytes: Uint8Array,
    options?: {
      name?: string
      enabled?: boolean
      agentEnvironments?: SkillAgentEnvironmentId[]
    }
  ): WorkdirSkillRecord {
    const workdir = this.readWorkdir(workdirId)
    if (!workdir) throw new Error('Workdir not found')
    const skillKey = sanitizeSkillKey(key)
    if (zipBytes.byteLength === 0) throw new Error('Skill package is empty')
    const entries = unzipSync(zipBytes)
    const skillMd = entries['SKILL.md'] ?? entries['skill.md']
    if (!skillMd) throw new Error('Skill package must include SKILL.md')

    const targets = normalizeAgentEnvironments(
      options?.agentEnvironments,
      workdir.agentEnvironments
    )
    for (const relative of uniqueRelativeSkillsDirs(targets)) {
      this.writeSkillFolder(workdir.path, relative, skillKey, entries)
    }

    const updatedAt = new Date().toISOString()
    const existing = workdir.skills.find((skill) => skill.key === skillKey)
    const next: WorkdirSkillRecord = {
      key: skillKey,
      name: (options?.name?.trim() || existing?.name || skillKey).trim() || skillKey,
      enabled: options?.enabled ?? existing?.enabled ?? true,
      agentEnvironments: targets,
      updatedAt
    }
    workdir.skills = [...workdir.skills.filter((skill) => skill.key !== skillKey), next].sort(
      (a, b) => a.key.localeCompare(b.key)
    )
    this.writeWorkdir(workdir)
    return next
  }

  setSkillEnabled(workdirId: string, key: string, enabled: boolean): WorkdirSkillRecord {
    const workdir = this.readWorkdir(workdirId)
    if (!workdir) throw new Error('Workdir not found')
    const skillKey = sanitizeSkillKey(key)
    const skill = workdir.skills.find((item) => item.key === skillKey)
    if (!skill) throw new Error('Skill not found in workdir')
    skill.enabled = enabled
    skill.updatedAt = new Date().toISOString()
    this.writeWorkdir(workdir)
    return skill
  }

  removeSkill(workdirId: string, key: string): boolean {
    const workdir = this.readWorkdir(workdirId)
    if (!workdir) throw new Error('Workdir not found')
    const skillKey = sanitizeSkillKey(key)
    const existing = workdir.skills.find((skill) => skill.key === skillKey)
    if (!existing) return false
    this.removeSkillFolders(workdir.path, skillKey, existing.agentEnvironments)
    workdir.skills = workdir.skills.filter((skill) => skill.key !== skillKey)
    this.writeWorkdir(workdir)
    return true
  }

  private readSkillBody(dir: string): string | null {
    const skillMdPath = existsSync(join(dir, 'SKILL.md'))
      ? join(dir, 'SKILL.md')
      : existsSync(join(dir, 'skill.md'))
        ? join(dir, 'skill.md')
        : null
    if (!skillMdPath) return null

    const files: string[] = []
    const walk = (relative: string) => {
      const absolute = relative ? join(dir, relative) : dir
      for (const entry of readdirSync(absolute, { withFileTypes: true })) {
        const childRel = relative ? `${relative}/${entry.name}` : entry.name
        if (entry.isDirectory()) {
          walk(childRel)
          continue
        }
        files.push(childRel)
      }
    }
    walk('')
    files.sort((a, b) => {
      if (a === 'SKILL.md' || a === 'skill.md') return -1
      if (b === 'SKILL.md' || b === 'skill.md') return 1
      return a.localeCompare(b)
    })

    const parts: string[] = []
    for (const name of files) {
      const text = readFileSync(join(dir, name), 'utf8')
      parts.push(
        name === 'SKILL.md' || name === 'skill.md' ? text : `### File: ${name}\n\n${text}`
      )
    }
    return parts.join('\n\n')
  }

  loadEnabledPackages(workdirId: string): WorkdirSkillPackage[] {
    const workdir = this.readWorkdir(workdirId)
    if (!workdir) throw new Error('Workdir not found')
    const packages: WorkdirSkillPackage[] = []
    for (const skill of workdir.skills) {
      if (!skill.enabled) continue
      let body: string | null = null
      for (const relative of uniqueRelativeSkillsDirs(skill.agentEnvironments)) {
        const dir = this.skillDir(workdir.path, relative, skill.key)
        if (!existsSync(dir)) continue
        body = this.readSkillBody(dir)
        if (body) break
      }
      if (!body) continue
      packages.push({ key: skill.key, name: skill.name, body })
    }
    return packages
  }

  loadActiveEnabledPackages(): {
    workdir: WorkdirRecord | null
    packages: WorkdirSkillPackage[]
  } {
    const index = this.readIndex()
    if (!index.activeWorkdirId) return { workdir: null, packages: [] }
    const workdir = this.readWorkdir(index.activeWorkdirId)
    if (!workdir) return { workdir: null, packages: [] }
    return { workdir, packages: this.loadEnabledPackages(workdir.id) }
  }
}
