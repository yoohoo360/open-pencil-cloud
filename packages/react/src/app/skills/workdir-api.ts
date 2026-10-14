import {
  DEFAULT_SKILL_AGENT_ENVIRONMENTS,
  type SkillAgentEnvironmentId
} from '#react/app/skills/agent-environments'
import { loadPlatformSkillEntries } from '#react/app/skills/platform-package'
import {
  archiveSkillInWorkdir,
  expandArchivedSkillInWorkdir,
  readSkillArchiveFromWorkdir,
  readSkillEntriesFromWorkdir,
  removeSkillFromWorkdir,
  scanWorkdirSkills,
  writeSkillArchiveToWorkdir,
  writeSkillEntriesToWorkdir
} from '#react/app/skills/workdir-fs'
import {
  activateWorkdirRecord,
  createWorkdirRecord,
  getWorkdirRecord,
  listWorkdirRecords,
  removeWorkdirRecord,
  setSkillPlatformTag,
  updateWorkdirRecord,
  type WorkdirRecord
} from '#react/app/skills/workdir-idb'

export type WorkdirSkillSource = 'platform' | 'local'

export type PlatformSkillRef = {
  /** Platform skill API id (for download / tree). */
  id: string
  skill_key: string
  name: string
}

export type WorkdirSkill = {
  key: string
  name: string
  /** Platform (from skill API) vs local (on-disk only). */
  source: WorkdirSkillSource
  /** Folder present = on; `{key}.zip` archive = off. */
  enabled: boolean
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

async function hydrate(
  record: WorkdirRecord,
  platformSkills: readonly PlatformSkillRef[]
): Promise<Workdir> {
  // Always rescan disk (every list/enter), across all agent roots for local discovery.
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
  const installEnvs =
    record.agentEnvironments.length > 0
      ? record.agentEnvironments
      : [...DEFAULT_SKILL_AGENT_ENVIRONMENTS]
  const skills: WorkdirSkill[] = []

  // Platform rows always come from the skill API catalog.
  for (const platform of platformSkills) {
    const onDisk = scannedByKey.get(platform.skill_key)
    skills.push({
      key: platform.skill_key,
      name: platform.name || onDisk?.name || platform.skill_key,
      source: 'platform',
      enabled: onDisk?.enabled ?? false,
      agentEnvironments: onDisk?.agentEnvironments ?? installEnvs,
      platformId: platform.id
    })
  }

  // Local = on disk (folder or zip) and not in the platform catalog.
  for (const onDisk of scanned) {
    if (platformByKey.has(onDisk.key)) continue
    skills.push({
      key: onDisk.key,
      name: onDisk.name,
      source: 'local',
      enabled: onDisk.enabled,
      agentEnvironments: onDisk.agentEnvironments
    })
  }

  return toWorkdir(record, skills, folderAccessible)
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
        if (removedEnvs.length > 0) {
          await removeSkillFromWorkdir(record, skill.key, removedEnvs)
        }
        if (skill.enabled) {
          const entries = await readSkillEntriesFromWorkdir(previousRecord, skill.key)
          if (entries) {
            await writeSkillEntriesToWorkdir(record, skill.key, entries, nextEnvs)
          }
          continue
        }
        const archive = await readSkillArchiveFromWorkdir(previousRecord, skill.key)
        if (archive) {
          await writeSkillArchiveToWorkdir(record, skill.key, archive, nextEnvs)
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

  async setSource(
    workdirId: string,
    key: string,
    source: WorkdirSkillSource,
    options?: { platformSkills?: readonly PlatformSkillRef[] }
  ): Promise<Workdir> {
    await setSkillPlatformTag(workdirId, key, source === 'platform')
    const next = await getWorkdirRecord(workdirId)
    if (!next) throw new Error('Workdir not found')
    return hydrate(next, options?.platformSkills ?? [])
  },

  /**
   * Toggle a skill.
   * Platform on: expand local zip if present, otherwise download from skill API and write.
   * Local on: expand `{key}.zip`.
   * Off (both): zip the folder to `{key}.zip` and remove the folder.
   */
  async setSkillEnabled(
    workdirId: string,
    key: string,
    enabled: boolean,
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
    const source =
      options?.source ??
      (platformId || record.platformSkillKeys.includes(key) ? 'platform' : 'local')

    if (enabled) {
      const archive = await readSkillArchiveFromWorkdir(record, key)
      if (archive) {
        await expandArchivedSkillInWorkdir(record, key, record.agentEnvironments)
      } else if (source === 'platform') {
        if (!platformId) throw new Error('Platform skill id is required to enable')
        const entries = await loadPlatformSkillEntries(platformId)
        await writeSkillEntriesToWorkdir(record, key, entries, record.agentEnvironments)
        await setSkillPlatformTag(workdirId, key, true)
      } else {
        // Local with no archive: already a folder, or nothing to expand.
        const entries = await readSkillEntriesFromWorkdir(record, key)
        if (!entries) throw new Error('Local skill folder or archive not found')
        await writeSkillEntriesToWorkdir(record, key, entries, record.agentEnvironments)
      }
    } else {
      const entries = await readSkillEntriesFromWorkdir(record, key)
      if (entries) {
        await archiveSkillInWorkdir(record, key, record.agentEnvironments)
      } else {
        // Already archived / missing folder — nothing to do.
      }
    }

    const next = await getWorkdirRecord(workdirId)
    if (!next) throw new Error('Workdir not found')
    return hydrate(next, platformSkills)
  }
}
