import {
  DEFAULT_SKILL_AGENT_ENVIRONMENTS,
  SKILL_AGENT_ENVIRONMENTS,
  type SkillAgentEnvironmentId
} from '#react/app/skills/agent-environments'
import { loadPlatformSkillEntries } from '#react/app/skills/platform-package'
import { skillFolderName } from '#react/app/skills/skill-name'
import {
  DEFAULT_WORKDIR_SKILL_CONFIG,
  type WorkdirSkillConfig
} from '#react/app/skills/workdir-config'
import {
  archiveSkillInWorkdir,
  expandArchivedSkillInWorkdir,
  readSkillEntriesFromWorkdir,
  readWorkdirSkillConfig,
  removeSkillArchivesFromWorkdir,
  removeSkillFromWorkdir,
  scanWorkdirSkills,
  writeSkillEntriesToWorkdir,
  writeWorkdirSkillConfig
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
import type { PencilSkillGroup } from '#react/lib/client'

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
  /** Catalog group key when source is platform. */
  groupKey?: string
}

export type WorkdirGroup = {
  key: string
  name: string
  /** False when config lists the key but catalog has no match. */
  matched: boolean
  skills: WorkdirSkill[]
}

export type Workdir = {
  id: string
  name: string
  path: string
  agentEnvironments: SkillAgentEnvironmentId[]
  createdAt: string
  /** `.open-pencil/config.json` (defaults when missing). */
  config: WorkdirSkillConfig
  /** Config-matched groups (and a Local bucket for on-disk-only skills). */
  groups: WorkdirGroup[]
  /** Flat skill list (groups flattened) for toggles / menus. */
  skills: WorkdirSkill[]
  folderAccessible: boolean
}

export type PlatformGroupRef = {
  id: string
  name: string
  skills: PlatformSkillRef[]
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

function toPlatformGroups(catalogGroups: readonly PencilSkillGroup[]): PlatformGroupRef[] {
  return catalogGroups.map((group) => ({
    id: group.id,
    name: group.name,
    skills: (group.skills ?? [])
      .filter((skill) => !skill.team_id)
      .map((skill) => ({
        id: skill.id,
        skill_key: skill.skill_key,
        name: skill.name,
        description: skill.description
      }))
  }))
}

function toWorkdir(
  record: WorkdirRecord,
  config: WorkdirSkillConfig,
  groups: WorkdirGroup[],
  folderAccessible: boolean
): Workdir {
  const skills = sortSkills(groups.flatMap((group) => group.skills))
  return {
    id: record.id,
    name: record.name,
    path: record.path,
    agentEnvironments: record.agentEnvironments,
    createdAt: record.createdAt,
    config,
    groups,
    skills,
    folderAccessible
  }
}

/**
 * List = config skillGroups (matched to catalog) + local disk leftovers.
 * Checked = folder with SKILL.md only (zips never count).
 */
async function hydrate(
  record: WorkdirRecord,
  catalogGroups: readonly PencilSkillGroup[] = []
): Promise<Workdir> {
  const config = await readWorkdirSkillConfig(record)
  let scanned: Awaited<ReturnType<typeof scanWorkdirSkills>> = []
  let folderAccessible = Boolean(record.directoryHandle) || Boolean(record.path.trim())
  try {
    scanned = await scanWorkdirSkills(record)
  } catch {
    folderAccessible = false
    scanned = []
  }

  const scannedByKey = new Map(scanned.map((skill) => [skill.key, skill]))
  const catalogById = new Map(toPlatformGroups(catalogGroups).map((group) => [group.id, group]))
  const claimedKeys = new Set<string>()
  const groups: WorkdirGroup[] = []

  for (const groupId of config.skillGroups) {
    const catalog = catalogById.get(groupId)
    if (!catalog) {
      groups.push({ key: groupId, name: groupId, matched: false, skills: [] })
      continue
    }
    const skills: WorkdirSkill[] = catalog.skills.map((platform) => {
      const displayName = platform.name || platform.skill_key
      const folder = skillFolderName({ name: displayName, skill_key: platform.skill_key })
      // Folder = name; also match legacy skill_key folders from older installs.
      const onDisk = scannedByKey.get(folder) ?? scannedByKey.get(platform.skill_key)
      claimedKeys.add(folder)
      claimedKeys.add(platform.skill_key)
      return {
        key: folder,
        name: displayName || onDisk?.name || folder,
        description: (platform.description || onDisk?.description || '').trim(),
        source: 'platform' as const,
        enabled: Boolean(onDisk?.enabled),
        agentEnvironments: onDisk?.folderEnvironments ?? [],
        platformId: platform.id,
        groupKey: catalog.id
      }
    })
    groups.push({
      key: catalog.id,
      name: catalog.name,
      matched: true,
      skills: sortSkills(skills)
    })
  }

  const localSkills: WorkdirSkill[] = []
  for (const onDisk of scanned) {
    if (claimedKeys.has(onDisk.key)) continue
    localSkills.push({
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
  if (localSkills.length > 0) {
    groups.push({
      key: '__local__',
      name: 'Local',
      matched: true,
      skills: sortSkills(localSkills)
    })
  }

  return toWorkdir(record, config, groups, folderAccessible)
}

async function resolveSkillDiskEnvs(
  record: WorkdirRecord,
  key: string,
  aliases: string[] = []
): Promise<{
  folderEnvironments: SkillAgentEnvironmentId[]
  archiveEnvironments: SkillAgentEnvironmentId[]
  enabled: boolean
  /** Folder/archive name actually present on disk (may differ from skill_key). */
  diskKey: string
}> {
  let scanned: Awaited<ReturnType<typeof scanWorkdirSkills>> = []
  try {
    scanned = await scanWorkdirSkills(record)
  } catch {
    scanned = []
  }
  const candidates = [key, ...aliases]
  const onDisk = scanned.find((skill) => candidates.includes(skill.key))
  return {
    folderEnvironments: onDisk?.folderEnvironments ?? [],
    archiveEnvironments: onDisk?.archiveEnvironments ?? [],
    enabled: Boolean(onDisk?.enabled),
    diskKey: onDisk?.key ?? aliases[0] ?? key
  }
}

function catalogOption(
  options?: { catalogGroups?: readonly PencilSkillGroup[]; platformSkills?: readonly PlatformSkillRef[] }
): readonly PencilSkillGroup[] {
  return options?.catalogGroups ?? []
}

function platformIdFromCatalog(
  catalogGroups: readonly PencilSkillGroup[],
  folderOrKey: string
): string | undefined {
  for (const group of catalogGroups) {
    for (const skill of group.skills ?? []) {
      const folder = skillFolderName({ name: skill.name || skill.skill_key, skill_key: skill.skill_key })
      if (folder === folderOrKey || skill.skill_key === folderOrKey) return skill.id
    }
  }
  return undefined
}

function platformRefFromCatalog(
  catalogGroups: readonly PencilSkillGroup[],
  folderOrKey: string
): { id: string; skill_key: string; name: string; folder: string } | undefined {
  for (const group of catalogGroups) {
    for (const skill of group.skills ?? []) {
      const folder = skillFolderName({ name: skill.name || skill.skill_key, skill_key: skill.skill_key })
      if (folder === folderOrKey || skill.skill_key === folderOrKey) {
        return {
          id: skill.id,
          skill_key: skill.skill_key,
          name: skill.name || skill.skill_key,
          folder
        }
      }
    }
  }
  return undefined
}

/** Disk folder: platform skills use sanitized name; local skills keep their folder key. */
function diskKeyForSkill(
  key: string,
  source: WorkdirSkillSource,
  catalogGroups: readonly PencilSkillGroup[]
): string {
  if (source !== 'platform') return key
  const ref = platformRefFromCatalog(catalogGroups, key)
  if (ref) return ref.folder
  return skillFolderName({ name: key, skill_key: key })
}

export const workdirAPI = {
  async list(options?: {
    catalogGroups?: readonly PencilSkillGroup[]
    /** @deprecated Prefer catalogGroups — flattened skills ignore group matching. */
    platformSkills?: readonly PlatformSkillRef[]
  }): Promise<{ index: WorkdirIndex; workdirs: Workdir[] }> {
    const catalogGroups = catalogOption(options)
    const { index, workdirs: records } = await listWorkdirRecords()
    const workdirs = await Promise.all(records.map((record) => hydrate(record, catalogGroups)))
    return { index, workdirs }
  },

  async create(input: {
    path: string
    name?: string
    agentEnvironments: SkillAgentEnvironmentId[]
    directoryHandle?: FileSystemDirectoryHandle
    config?: WorkdirSkillConfig
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
    if (input.config) {
      try {
        await writeWorkdirSkillConfig(record, input.config)
      } catch {
        // Folder may be inaccessible until permission is granted.
      }
    }
    return hydrate(record, [])
  },

  async update(
    id: string,
    patch: { name?: string; agentEnvironments?: SkillAgentEnvironmentId[] },
    options?: {
      catalogGroups?: readonly PencilSkillGroup[]
      syncEnabledSkills?: boolean
    }
  ): Promise<Workdir> {
    const previous = await getWorkdirRecord(id)
    if (!previous) throw new Error('Workdir not found')
    const previousEnvs = previous.agentEnvironments
    const record = await updateWorkdirRecord(id, patch)
    const catalogGroups = catalogOption(options)

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

    return hydrate(record, catalogGroups)
  },

  async writeConfig(
    id: string,
    config: WorkdirSkillConfig,
    options?: { catalogGroups?: readonly PencilSkillGroup[] }
  ): Promise<Workdir> {
    const record = await getWorkdirRecord(id)
    if (!record) throw new Error('Workdir not found')
    await writeWorkdirSkillConfig(record, config)
    return hydrate(record, catalogOption(options))
  },

  /**
   * When config.pull is `auto`, download every platform skill in matched groups
   * that is not already enabled on disk.
   */
  async pullAuto(
    id: string,
    options?: { catalogGroups?: readonly PencilSkillGroup[] }
  ): Promise<Workdir> {
    const catalogGroups = catalogOption(options)
    const record = await getWorkdirRecord(id)
    if (!record) throw new Error('Workdir not found')
    let current = await hydrate(record, catalogGroups)
    if (current.config.pull !== 'auto') return current

    const targets = defaultInstallEnvs(record)
    for (const group of current.groups) {
      if (!group.matched || group.key === '__local__') continue
      for (const skill of group.skills) {
        if (skill.source !== 'platform' || skill.enabled || !skill.platformId) continue
        const entries = await loadPlatformSkillEntries(skill.platformId)
        const folder = skillFolderName({ name: skill.name, key: skill.key })
        await writeSkillEntriesToWorkdir(record, folder, entries, targets)
      }
    }

    const next = await getWorkdirRecord(id)
    if (!next) throw new Error('Workdir not found')
    return hydrate(next, catalogGroups)
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
      catalogGroups?: readonly PencilSkillGroup[]
      /** When enabling, write to these agent roots (defaults to workdir install targets). */
      agentEnvironments?: SkillAgentEnvironmentId[]
    }
  ): Promise<Workdir> {
    const record = await getWorkdirRecord(workdirId)
    if (!record) throw new Error('Workdir not found')
    const catalogGroups = catalogOption(options)
    const platformId =
      options?.platformId || platformIdFromCatalog(catalogGroups, key)
    const source = options?.source ?? (platformId ? 'platform' : 'local')
    const folderKey = diskKeyForSkill(key, source, catalogGroups)
    const disk = await resolveSkillDiskEnvs(record, key, [folderKey])
    const activeKey = disk.diskKey
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
        // Prefer the readable folder key; remove a leftover digit-named folder if present.
        await writeSkillEntriesToWorkdir(record, folderKey, entries, targets)
        if (activeKey !== folderKey) {
          await removeSkillFromWorkdir(record, activeKey, targets).catch(() => undefined)
        }
        if (disk.archiveEnvironments.length > 0) {
          await removeSkillArchivesFromWorkdir(record, activeKey, disk.archiveEnvironments)
          if (activeKey !== folderKey) {
            await removeSkillArchivesFromWorkdir(record, folderKey, disk.archiveEnvironments).catch(
              () => undefined
            )
          }
        }
      } else if (disk.archiveEnvironments.length > 0 && !disk.enabled) {
        await expandArchivedSkillInWorkdir(record, activeKey, targets)
      } else {
        const entries = await readSkillEntriesFromWorkdir(record, activeKey)
        if (!entries) throw new Error('Local skill folder or archive not found')
        await writeSkillEntriesToWorkdir(record, activeKey, entries, targets)
      }
    } else if (source === 'platform') {
      const removeEnvs =
        disk.folderEnvironments.length > 0 || disk.archiveEnvironments.length > 0
          ? [...new Set([...disk.folderEnvironments, ...disk.archiveEnvironments])]
          : allAgentEnvIds()
      await removeSkillFromWorkdir(record, activeKey, removeEnvs)
      if (activeKey !== folderKey) {
        await removeSkillFromWorkdir(record, folderKey, removeEnvs).catch(() => undefined)
      }
    } else {
      const archiveEnvs =
        disk.folderEnvironments.length > 0 ? disk.folderEnvironments : targets
      if (disk.enabled) {
        await archiveSkillInWorkdir(record, activeKey, archiveEnvs)
      }
    }

    const next = await getWorkdirRecord(workdirId)
    if (!next) throw new Error('Workdir not found')
    return hydrate(next, catalogGroups)
  },

  /**
   * Per-skill agent roots (disk only).
   */
  async setSkillAgentEnvironments(
    workdirId: string,
    key: string,
    nextEnvs: SkillAgentEnvironmentId[],
    options?: {
      source?: WorkdirSkillSource
      platformId?: string
      catalogGroups?: readonly PencilSkillGroup[]
    }
  ): Promise<Workdir> {
    const record = await getWorkdirRecord(workdirId)
    if (!record) throw new Error('Workdir not found')
    const catalogGroups = catalogOption(options)
    const platformId =
      options?.platformId || platformIdFromCatalog(catalogGroups, key)
    const source = options?.source ?? (platformId ? 'platform' : 'local')
    const folderKey = diskKeyForSkill(key, source, catalogGroups)
    const disk = await resolveSkillDiskEnvs(record, key, [folderKey])
    const activeKey = disk.diskKey
    const current = disk.folderEnvironments
    const next = [...new Set(nextEnvs)]
    const removed = current.filter((env) => !next.includes(env))
    const added = next.filter((env) => !current.includes(env))

    if (removed.length > 0) {
      if (source === 'platform') {
        await removeSkillFromWorkdir(record, activeKey, removed)
      } else if (next.length === 0) {
        await archiveSkillInWorkdir(record, activeKey, removed)
      } else {
        await archiveSkillInWorkdir(record, activeKey, removed)
      }
    }

    if (added.length > 0) {
      let entries = await readSkillEntriesFromWorkdir(record, activeKey)
      if (!entries && source === 'platform') {
        if (!platformId) throw new Error('Platform skill id is required')
        entries = await loadPlatformSkillEntries(platformId)
      }
      if (!entries) throw new Error('Skill package not found to install into agent folders')
      const writeKey = source === 'platform' ? folderKey : activeKey
      await writeSkillEntriesToWorkdir(record, writeKey, entries, added)
      if (disk.archiveEnvironments.length > 0) {
        await removeSkillArchivesFromWorkdir(record, activeKey, disk.archiveEnvironments)
      }
    }

    const after = await getWorkdirRecord(workdirId)
    if (!after) throw new Error('Workdir not found')
    return hydrate(after, catalogGroups)
  }
}

/** Re-export for callers that only need the default config shape. */
export { DEFAULT_WORKDIR_SKILL_CONFIG }
