import {
  DEFAULT_SKILL_AGENT_ENVIRONMENTS,
  SKILL_AGENT_ENVIRONMENTS,
  type SkillAgentEnvironmentId
} from '#react/app/skills/agent-environments'
import { loadPlatformSkillEntries } from '#react/app/skills/platform-package'
import {
  archiveSkillInWorkdir,
  expandArchivedSkillInWorkdir,
  readSkillEntriesFromWorkdir,
  removeSkillArchivesFromWorkdir,
  removeSkillFromWorkdir,
  scanWorkdirSkills,
  writeSkillEntriesToWorkdir
} from '#react/app/skills/workdir-fs'
import {
  activateWorkdirRecord,
  createWorkdirRecord,
  getWorkdirRecord,
  listWorkdirRecords,
  removeWorkdirRecord,
  updateWorkdirRecord,
  type WorkdirRecord
} from '#react/app/skills/workdir-idb'

export type WorkdirSkillSource = 'platform' | 'local'

export type PlatformSkillRef = {
  /** Platform skill API id (for download / tree). */
  id: string
  skill_key: string
  name: string
  description?: string
}

export type WorkdirSkill = {
  key: string
  name: string
  description: string
  /** Platform (from skill API) vs local (on-disk folder or zip). */
  source: WorkdirSkillSource
  /**
   * On = skill directory exists and contains SKILL.md.
   * Zip archives do not count. Not stored in IndexedDB.
   */
  enabled: boolean
  /** Agent roots that currently have a SKILL.md folder (checked locations). */
  agentEnvironments: SkillAgentEnvironmentId[]
  /** Platform catalog id when source is platform. */
  platformId?: string
}

export type Workdir = {
  id: string
  name: string
  path: string
  agentEnvironments: SkillAgentEnvironmentId[]
  createdAt: string
  skills: WorkdirSkill[]
  folderAccessible: boolean
}

export type WorkdirIndex = {
  activeWorkdirId: string | null
}

function allAgentEnvIds(): SkillAgentEnvironmentId[] {
  return SKILL_AGENT_ENVIRONMENTS.map((item) => item.id)
}

function defaultInstallEnvs(record: WorkdirRecord): SkillAgentEnvironmentId[] {
  return record.agentEnvironments.length > 0
    ? record.agentEnvironments
    : [...DEFAULT_SKILL_AGENT_ENVIRONMENTS]
}

export async function probeAgentServerWorkdirReady(): Promise<boolean> {
  return typeof indexedDB !== 'undefined'
}

/** Platform first, then local, then name. */
function sortSkills(skills: WorkdirSkill[]): WorkdirSkill[] {
  return [...skills].sort((a, b) => {
    if (a.source !== b.source) return a.source === 'platform' ? -1 : 1
    return a.name.localeCompare(b.name) || a.key.localeCompare(b.key)
  })
}

function toWorkdir(
  record: WorkdirRecord,
  skills: WorkdirSkill[],
  folderAccessible: boolean
): Workdir {
  return {
    id: record.id,
    name: record.name,
    path: record.path,
    agentEnvironments: record.agentEnvironments,
    createdAt: record.createdAt,
    skills: sortSkills(skills),
    folderAccessible
  }
}

/**
 * List = platform catalog + local disk (folder or zip).
 * Checked = folder with SKILL.md only (zips never count).
 */
async function hydrate(
  record: WorkdirRecord,
  platformSkills: readonly PlatformSkillRef[]
): Promise<Workdir> {
  let scanned: Awaited<ReturnType<typeof scanWorkdirSkills>> = []
  let folderAccessible = Boolean(record.directoryHandle) || Boolean(record.path.trim())
  try {
    scanned = await scanWorkdirSkills(record)
  } catch {
    folderAccessible = false
    scanned = []
  }

  const scannedByKey = new Map(scanned.map((skill) => [skill.key, skill]))
  const platformByKey = new Map(platformSkills.map((skill) => [skill.skill_key, skill]))
  const skills: WorkdirSkill[] = []

  for (const platform of platformSkills) {
    const onDisk = scannedByKey.get(platform.skill_key)
    // Platform checked only from SKILL.md folders; leftover zips do not count.
    skills.push({
      key: platform.skill_key,
      name: platform.name || onDisk?.name || platform.skill_key,
      description: (platform.description || onDisk?.description || '').trim(),
      source: 'platform',
      enabled: Boolean(onDisk?.enabled),
      agentEnvironments: onDisk?.folderEnvironments ?? [],
      platformId: platform.id
    })
  }

  for (const onDisk of scanned) {
    if (platformByKey.has(onDisk.key)) continue
    // Local stays in the list when folder or zip exists; checked only if folder+SKILL.md.
    skills.push({
      key: onDisk.key,
      name: onDisk.name,
      description: onDisk.description,
      source: 'local',
      enabled: onDisk.enabled,
      agentEnvironments: onDisk.enabled
        ? onDisk.folderEnvironments
        : onDisk.archiveEnvironments
    })
  }

  return toWorkdir(record, skills, folderAccessible)
}

async function resolveSkillDiskEnvs(
  record: WorkdirRecord,
  key: string
): Promise<{
  folderEnvironments: SkillAgentEnvironmentId[]
  archiveEnvironments: SkillAgentEnvironmentId[]
  enabled: boolean
}> {
  let scanned: Awaited<ReturnType<typeof scanWorkdirSkills>> = []
  try {
    scanned = await scanWorkdirSkills(record)
  } catch {
    scanned = []
  }
  const onDisk = scanned.find((skill) => skill.key === key)
  return {
    folderEnvironments: onDisk?.folderEnvironments ?? [],
    archiveEnvironments: onDisk?.archiveEnvironments ?? [],
    enabled: Boolean(onDisk?.enabled)
  }
}

export const workdirAPI = {
  async list(options?: {
    platformSkills?: readonly PlatformSkillRef[]
  }): Promise<{ index: WorkdirIndex; workdirs: Workdir[] }> {
    const platformSkills = options?.platformSkills ?? []
    const { index, workdirs: records } = await listWorkdirRecords()
    const workdirs = await Promise.all(
      records.map((record) => hydrate(record, platformSkills))
    )
    return { index, workdirs }
  },

  async create(input: {
    path: string
    name?: string
    agentEnvironments: SkillAgentEnvironmentId[]
    directoryHandle?: FileSystemDirectoryHandle
  }): Promise<Workdir> {
    const record = await createWorkdirRecord({
      path: input.path,
      name: input.name,
      agentEnvironments:
        input.agentEnvironments.length > 0
          ? input.agentEnvironments
          : [...DEFAULT_SKILL_AGENT_ENVIRONMENTS],
      directoryHandle: input.directoryHandle
    })
    return hydrate(record, [])
  },

  async update(
    id: string,
    patch: { name?: string; agentEnvironments?: SkillAgentEnvironmentId[] },
    options?: {
      platformSkills?: readonly PlatformSkillRef[]
      syncEnabledSkills?: boolean
    }
  ): Promise<Workdir> {
    const previous = await getWorkdirRecord(id)
    if (!previous) throw new Error('Workdir not found')
    const previousEnvs = previous.agentEnvironments
    const record = await updateWorkdirRecord(id, patch)
    const platformSkills = options?.platformSkills ?? []

    if (options?.syncEnabledSkills && patch.agentEnvironments) {
      const nextEnvs = record.agentEnvironments
      const removedEnvs = previousEnvs.filter((env) => !nextEnvs.includes(env))
      const previousRecord = { ...previous, agentEnvironments: previousEnvs }
      let scanned: Awaited<ReturnType<typeof scanWorkdirSkills>> = []
      try {
        scanned = await scanWorkdirSkills(previousRecord)
      } catch {
        scanned = []
      }
      for (const skill of scanned) {
        if (!skill.enabled) continue
        if (removedEnvs.length > 0) {
          await removeSkillFromWorkdir(record, skill.key, removedEnvs)
        }
        const entries = await readSkillEntriesFromWorkdir(previousRecord, skill.key)
        if (entries) {
          await writeSkillEntriesToWorkdir(record, skill.key, entries, nextEnvs)
        }
      }
    }

    return hydrate(record, platformSkills)
  },

  async remove(id: string): Promise<void> {
    await removeWorkdirRecord(id)
  },

  async activate(id: string): Promise<WorkdirIndex> {
    return activateWorkdirRecord(id)
  },

  /**
   * Toggle a skill on disk (no IndexedDB skill state).
   * Platform on: download into folders. Platform off: delete folders (+ leftover zips).
   * Local on: expand zip / write folders. Local off: zip folders (checked ignores zips).
   */
  async setSkillEnabled(
    workdirId: string,
    key: string,
    enabled: boolean,
    options?: {
      source?: WorkdirSkillSource
      platformId?: string
      platformSkills?: readonly PlatformSkillRef[]
      /** When enabling, write to these agent roots (defaults to workdir install targets). */
      agentEnvironments?: SkillAgentEnvironmentId[]
    }
  ): Promise<Workdir> {
    const record = await getWorkdirRecord(workdirId)
    if (!record) throw new Error('Workdir not found')
    const platformSkills = options?.platformSkills ?? []
    const platformId =
      options?.platformId ||
      platformSkills.find((item) => item.skill_key === key)?.id
    const source = options?.source ?? (platformId ? 'platform' : 'local')
    const disk = await resolveSkillDiskEnvs(record, key)
    const targets =
      options?.agentEnvironments && options.agentEnvironments.length > 0
        ? options.agentEnvironments
        : disk.folderEnvironments.length > 0
          ? disk.folderEnvironments
          : defaultInstallEnvs(record)

    if (enabled) {
      if (source === 'platform') {
        if (!platformId) throw new Error('Platform skill id is required to enable')
        const entries = await loadPlatformSkillEntries(platformId)
        await writeSkillEntriesToWorkdir(record, key, entries, targets)
        if (disk.archiveEnvironments.length > 0) {
          await removeSkillArchivesFromWorkdir(record, key, disk.archiveEnvironments)
        }
      } else if (disk.archiveEnvironments.length > 0 && !disk.enabled) {
        await expandArchivedSkillInWorkdir(record, key, targets)
      } else {
        const entries = await readSkillEntriesFromWorkdir(record, key)
        if (!entries) throw new Error('Local skill folder or archive not found')
        await writeSkillEntriesToWorkdir(record, key, entries, targets)
      }
    } else if (source === 'platform') {
      // Platform off: delete everywhere the skill folder/zip exists.
      const removeEnvs =
        disk.folderEnvironments.length > 0 || disk.archiveEnvironments.length > 0
          ? [...new Set([...disk.folderEnvironments, ...disk.archiveEnvironments])]
          : allAgentEnvIds()
      await removeSkillFromWorkdir(record, key, removeEnvs)
    } else {
      // Local off: zip every folder that currently has SKILL.md.
      const archiveEnvs =
        disk.folderEnvironments.length > 0 ? disk.folderEnvironments : targets
      if (disk.enabled) {
        await archiveSkillInWorkdir(record, key, archiveEnvs)
      }
    }

    const next = await getWorkdirRecord(workdirId)
    if (!next) throw new Error('Workdir not found')
    return hydrate(next, platformSkills)
  },

  /**
   * Per-skill agent roots (disk only).
   * Add: write SKILL.md folder into that env.
   * Remove (platform): delete folder/zip there.
   * Remove (local, last folder): archive that env; otherwise delete folder only if others remain? 
   * For local removing one env while others stay: archive that env's folder to zip in that env.
   */
  async setSkillAgentEnvironments(
    workdirId: string,
    key: string,
    nextEnvs: SkillAgentEnvironmentId[],
    options?: {
      source?: WorkdirSkillSource
      platformId?: string
      platformSkills?: readonly PlatformSkillRef[]
    }
  ): Promise<Workdir> {
    const record = await getWorkdirRecord(workdirId)
    if (!record) throw new Error('Workdir not found')
    const platformSkills = options?.platformSkills ?? []
    const platformId =
      options?.platformId ||
      platformSkills.find((item) => item.skill_key === key)?.id
    const source = options?.source ?? (platformId ? 'platform' : 'local')
    const disk = await resolveSkillDiskEnvs(record, key)
    const current = disk.folderEnvironments
    const next = [...new Set(nextEnvs)]
    const removed = current.filter((env) => !next.includes(env))
    const added = next.filter((env) => !current.includes(env))

    if (removed.length > 0) {
      if (source === 'platform') {
        await removeSkillFromWorkdir(record, key, removed)
      } else if (next.length === 0) {
        // Uncheck all agents for local = zip remaining folders.
        await archiveSkillInWorkdir(record, key, removed)
      } else {
        // Keep skill on elsewhere: zip only the removed agent roots.
        await archiveSkillInWorkdir(record, key, removed)
      }
    }

    if (added.length > 0) {
      let entries = await readSkillEntriesFromWorkdir(record, key)
      if (!entries && source === 'platform') {
        if (!platformId) throw new Error('Platform skill id is required')
        entries = await loadPlatformSkillEntries(platformId)
      }
      if (!entries) throw new Error('Skill package not found to install into agent folders')
      await writeSkillEntriesToWorkdir(record, key, entries, added)
      if (disk.archiveEnvironments.length > 0) {
        await removeSkillArchivesFromWorkdir(record, key, disk.archiveEnvironments)
      }
    }

    const after = await getWorkdirRecord(workdirId)
    if (!after) throw new Error('Workdir not found')
    return hydrate(after, platformSkills)
  }
}
