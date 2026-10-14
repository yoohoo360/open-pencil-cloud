import {
  DEFAULT_SKILL_AGENT_ENVIRONMENTS,
  type SkillAgentEnvironmentId
} from '#react/app/skills/agent-environments'
import { loadPlatformSkillEntries } from '#react/app/skills/platform-package'
import {
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
  setPlatformSkillEnabled,
  updateWorkdirRecord,
  type WorkdirRecord
} from '#react/app/skills/workdir-idb'

export type WorkdirSkillSource = 'local' | 'platform'

export type WorkdirSkill = {
  key: string
  name: string
  /** Platform skills can be toggled; local skills are read-only. */
  source: WorkdirSkillSource
  enabled: boolean
  agentEnvironments: SkillAgentEnvironmentId[]
  /** Platform catalog id when source is platform (for download). */
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

export type PlatformSkillRef = {
  id: string
  skill_key: string
  name: string
}

/** Workdir UI uses IndexedDB + local folders (no :2025). */
export async function probeAgentServerWorkdirReady(): Promise<boolean> {
  return typeof indexedDB !== 'undefined'
}

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
  let scanned: Awaited<ReturnType<typeof scanWorkdirSkills>> = []
  let folderAccessible = Boolean(record.directoryHandle) || Boolean(record.path.trim())
  try {
    scanned = await scanWorkdirSkills(record)
  } catch {
    folderAccessible = false
    scanned = []
  }

  const enabled = new Set(record.enabledPlatformKeys)
  const platformByKey = new Map(platformSkills.map((skill) => [skill.skill_key, skill]))
  const scannedByKey = new Map(scanned.map((skill) => [skill.key, skill]))
  const skills: WorkdirSkill[] = []

  for (const platform of platformSkills) {
    const onDisk = scannedByKey.get(platform.skill_key)
    skills.push({
      key: platform.skill_key,
      name: platform.name || onDisk?.name || platform.skill_key,
      source: 'platform',
      enabled: enabled.has(platform.skill_key),
      agentEnvironments: onDisk?.agentEnvironments ?? record.agentEnvironments,
      platformId: platform.id
    })
  }

  for (const local of scanned) {
    if (platformByKey.has(local.key)) continue
    skills.push({
      key: local.key,
      name: local.name,
      source: 'local',
      enabled: true,
      agentEnvironments: local.agentEnvironments
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
    const workdirs = await Promise.all(records.map((record) => hydrate(record, platformSkills)))
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
      /** When agent folders change, rewrite enabled platform skill files. */
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
      for (const key of record.enabledPlatformKeys) {
        const platform = platformSkills.find((item) => item.skill_key === key)
        if (!platform) continue
        if (removedEnvs.length > 0) {
          await removeSkillFromWorkdir(record, key, removedEnvs)
        }
        const entries = await loadPlatformSkillEntries(platform.id)
        await writeSkillEntriesToWorkdir(record, key, entries, nextEnvs)
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
   * Toggle a platform skill: enable writes the package into agent folders;
   * disable removes those folders. Local skills cannot be changed.
   */
  async setSkillEnabled(
    workdirId: string,
    key: string,
    enabled: boolean,
    source: WorkdirSkillSource,
    options?: { platformId?: string; platformSkills?: readonly PlatformSkillRef[] }
  ): Promise<Workdir> {
    if (source !== 'platform') {
      throw new Error('Local skills cannot be changed')
    }
    const record = await getWorkdirRecord(workdirId)
    if (!record) throw new Error('Workdir not found')
    const platformSkills = options?.platformSkills ?? []
    const platformId =
      options?.platformId ||
      platformSkills.find((item) => item.skill_key === key)?.id

    if (enabled) {
      if (!platformId) throw new Error('Platform skill id is required to enable')
      const entries = await loadPlatformSkillEntries(platformId)
      await writeSkillEntriesToWorkdir(record, key, entries, record.agentEnvironments)
      await setPlatformSkillEnabled(workdirId, key, true)
    } else {
      await removeSkillFromWorkdir(record, key, record.agentEnvironments)
      await setPlatformSkillEnabled(workdirId, key, false)
    }

    const next = await getWorkdirRecord(workdirId)
    if (!next) throw new Error('Workdir not found')
    return hydrate(next, platformSkills)
  }
}
