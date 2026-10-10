import { atom, type ReadableAtom } from 'nanostores'

import { IS_BROWSER } from '@open-pencil/core/constants'

/** Chat tools that keep their own skill selection in localStorage. */
export type SkillChatScope = 'design' | 'codegen'

export type SkillCodegenPreferences = {
  version: 2
  /**
   * Default true: every personal skill is included until the user turns groups
   * or skills off for this chat tool.
   */
  allEnabled: boolean
  /** Groups whose skills are all included when `allEnabled` is false. */
  enabledGroupIds: string[]
  /** Individual skills included even when their group is not. */
  enabledSkillIds: string[]
}

const STORAGE_PREFIX = 'open-pencil:skill-chat:'
/** Legacy shared key from before per-chat scopes. */
const LEGACY_STORAGE_KEY = 'open-pencil:skill-codegen:v1'

export const DEFAULT_SKILL_CODEGEN_PREFERENCES: Readonly<SkillCodegenPreferences> = {
  version: 2,
  allEnabled: true,
  enabledGroupIds: [],
  enabledSkillIds: []
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function stringIds(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  const out: string[] = []
  const seen = new Set<string>()
  for (const item of value) {
    if (typeof item !== 'string') continue
    const id = item.trim()
    if (!id || seen.has(id)) continue
    seen.add(id)
    out.push(id)
  }
  return out
}

export function normalizeSkillCodegenPreferences(value: unknown): SkillCodegenPreferences {
  const stored = isRecord(value) ? value : undefined
  const enabledGroupIds = stringIds(stored?.enabledGroupIds ?? stored?.enabled_group_ids)
  const enabledSkillIds = stringIds(stored?.enabledSkillIds ?? stored?.enabled_skill_ids)

  if (stored && (stored.version === 2 || typeof stored.allEnabled === 'boolean')) {
    return {
      version: 2,
      allEnabled: stored.allEnabled === true,
      enabledGroupIds,
      enabledSkillIds
    }
  }

  // v1 migrate: empty selection was the old default — treat as all enabled.
  if (enabledGroupIds.length === 0 && enabledSkillIds.length === 0) {
    return structuredClone(DEFAULT_SKILL_CODEGEN_PREFERENCES)
  }
  return {
    version: 2,
    allEnabled: false,
    enabledGroupIds,
    enabledSkillIds
  }
}

function storageKey(scope: SkillChatScope): string {
  return `${STORAGE_PREFIX}${scope}:v1`
}

function readPreferences(scope: SkillChatScope): SkillCodegenPreferences {
  if (!IS_BROWSER) return structuredClone(DEFAULT_SKILL_CODEGEN_PREFERENCES)
  try {
    const raw = localStorage.getItem(storageKey(scope))
    if (raw) return normalizeSkillCodegenPreferences(JSON.parse(raw) as unknown)
    // One-time migrate from the pre-scope shared key into both chat tools.
    const legacy = localStorage.getItem(LEGACY_STORAGE_KEY)
    if (legacy) return normalizeSkillCodegenPreferences(JSON.parse(legacy) as unknown)
    return structuredClone(DEFAULT_SKILL_CODEGEN_PREFERENCES)
  } catch {
    return structuredClone(DEFAULT_SKILL_CODEGEN_PREFERENCES)
  }
}

function writePreferences(scope: SkillChatScope, value: SkillCodegenPreferences) {
  if (!IS_BROWSER) return
  localStorage.setItem(storageKey(scope), JSON.stringify(value))
}

const preferenceAtoms: Record<SkillChatScope, ReturnType<typeof atom<SkillCodegenPreferences>>> = {
  design: atom(readPreferences('design')),
  codegen: atom(readPreferences('codegen'))
}

for (const scope of ['design', 'codegen'] as const) {
  preferenceAtoms[scope].subscribe((value) => writePreferences(scope, value))
}

/** @deprecated Prefer `skillChatPreferences(scope)` — defaults to design chat. */
export const skillCodegenPreferences = preferenceAtoms.design

export function skillChatPreferences(
  scope: SkillChatScope
): ReadableAtom<SkillCodegenPreferences> {
  return preferenceAtoms[scope]
}

export function setSkillCodegenPreferences(
  patch: Partial<SkillCodegenPreferences>,
  scope: SkillChatScope = 'design'
) {
  const current = preferenceAtoms[scope].get()
  preferenceAtoms[scope].set(
    normalizeSkillCodegenPreferences({
      ...current,
      ...patch,
      version: 2
    })
  )
}

function maybeRestoreAllEnabled(
  enabledGroupIds: string[],
  enabledSkillIds: string[],
  allGroupIds: readonly string[]
): boolean {
  return (
    allGroupIds.length > 0 &&
    enabledSkillIds.length === 0 &&
    allGroupIds.every((id) => enabledGroupIds.includes(id))
  )
}

export function toggleEnabledSkillGroup(
  groupId: string,
  enabled: boolean,
  allGroupIds: readonly string[],
  scope: SkillChatScope
) {
  const current = preferenceAtoms[scope].get()

  if (current.allEnabled) {
    if (enabled) return
    setSkillCodegenPreferences(
      {
        allEnabled: false,
        enabledGroupIds: allGroupIds.filter((id) => id !== groupId),
        enabledSkillIds: []
      },
      scope
    )
    return
  }

  const nextGroups = new Set(current.enabledGroupIds)
  if (enabled) nextGroups.add(groupId)
  else nextGroups.delete(groupId)
  const enabledGroupIds = [...nextGroups]

  if (maybeRestoreAllEnabled(enabledGroupIds, current.enabledSkillIds, allGroupIds)) {
    setSkillCodegenPreferences(
      { allEnabled: true, enabledGroupIds: [], enabledSkillIds: [] },
      scope
    )
    return
  }

  setSkillCodegenPreferences({ enabledGroupIds }, scope)
}

export function toggleEnabledSkill(
  skillId: string,
  enabled: boolean,
  context: {
    groupId: string
    allGroupIds: readonly string[]
    siblingSkillIds: readonly string[]
  },
  scope: SkillChatScope
) {
  const current = preferenceAtoms[scope].get()

  if (current.allEnabled) {
    if (enabled) return
    setSkillCodegenPreferences(
      {
        allEnabled: false,
        enabledGroupIds: context.allGroupIds.filter((id) => id !== context.groupId),
        enabledSkillIds: context.siblingSkillIds.filter((id) => id !== skillId)
      },
      scope
    )
    return
  }

  if (current.enabledGroupIds.includes(context.groupId)) {
    if (enabled) return
    const enabledGroupIds = current.enabledGroupIds.filter((id) => id !== context.groupId)
    const enabledSkillIds = [
      ...current.enabledSkillIds.filter((id) => !context.siblingSkillIds.includes(id)),
      ...context.siblingSkillIds.filter((id) => id !== skillId)
    ]
    if (maybeRestoreAllEnabled(enabledGroupIds, enabledSkillIds, context.allGroupIds)) {
      setSkillCodegenPreferences(
        { allEnabled: true, enabledGroupIds: [], enabledSkillIds: [] },
        scope
      )
      return
    }
    setSkillCodegenPreferences({ enabledGroupIds, enabledSkillIds }, scope)
    return
  }

  const nextSkills = new Set(current.enabledSkillIds)
  if (enabled) nextSkills.add(skillId)
  else nextSkills.delete(skillId)
  const enabledSkillIds = [...nextSkills]

  const allSiblingsOn = context.siblingSkillIds.every((id) => enabledSkillIds.includes(id))
  if (enabled && allSiblingsOn && context.siblingSkillIds.length > 0) {
    const enabledGroupIds = [...new Set([...current.enabledGroupIds, context.groupId])]
    const trimmedSkills = enabledSkillIds.filter((id) => !context.siblingSkillIds.includes(id))
    if (maybeRestoreAllEnabled(enabledGroupIds, trimmedSkills, context.allGroupIds)) {
      setSkillCodegenPreferences(
        { allEnabled: true, enabledGroupIds: [], enabledSkillIds: [] },
        scope
      )
      return
    }
    setSkillCodegenPreferences(
      { enabledGroupIds, enabledSkillIds: trimmedSkills },
      scope
    )
    return
  }

  setSkillCodegenPreferences({ enabledSkillIds }, scope)
}

export function isSkillEnabledForCodegen(
  skill: { id: string; group_id: string },
  prefs: SkillCodegenPreferences
): boolean {
  if (prefs.allEnabled) return true
  return prefs.enabledSkillIds.includes(skill.id) || prefs.enabledGroupIds.includes(skill.group_id)
}

export function isGroupEnabledForCodegen(
  groupId: string,
  prefs: SkillCodegenPreferences
): boolean {
  return prefs.allEnabled || prefs.enabledGroupIds.includes(groupId)
}
