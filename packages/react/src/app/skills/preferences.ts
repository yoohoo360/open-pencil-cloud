import { atom } from 'nanostores'

import { IS_BROWSER } from '@open-pencil/core/constants'

export type SkillCodegenPreferences = {
  version: 1
  /** Groups whose skills are all included in Edit prototype and Dev codegen chat. */
  enabledGroupIds: string[]
  /** Individual skills included even when their group is not. */
  enabledSkillIds: string[]
}

const STORAGE_KEY = 'open-pencil:skill-codegen:v1'

export const DEFAULT_SKILL_CODEGEN_PREFERENCES: Readonly<SkillCodegenPreferences> = {
  version: 1,
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
  return {
    version: 1,
    enabledGroupIds: stringIds(stored?.enabledGroupIds ?? stored?.enabled_group_ids),
    enabledSkillIds: stringIds(stored?.enabledSkillIds ?? stored?.enabled_skill_ids)
  }
}

function readPreferences(): SkillCodegenPreferences {
  if (!IS_BROWSER) return structuredClone(DEFAULT_SKILL_CODEGEN_PREFERENCES)
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return structuredClone(DEFAULT_SKILL_CODEGEN_PREFERENCES)
    return normalizeSkillCodegenPreferences(JSON.parse(raw) as unknown)
  } catch {
    return structuredClone(DEFAULT_SKILL_CODEGEN_PREFERENCES)
  }
}

export const skillCodegenPreferences = atom<SkillCodegenPreferences>(readPreferences())

skillCodegenPreferences.subscribe((value) => {
  if (!IS_BROWSER) return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(value))
})

export function setSkillCodegenPreferences(patch: Partial<SkillCodegenPreferences>) {
  const current = skillCodegenPreferences.get()
  skillCodegenPreferences.set(
    normalizeSkillCodegenPreferences({
      ...current,
      ...patch,
      version: 1
    })
  )
}

export function toggleEnabledSkillGroup(groupId: string, enabled: boolean) {
  const current = skillCodegenPreferences.get()
  const next = new Set(current.enabledGroupIds)
  if (enabled) next.add(groupId)
  else next.delete(groupId)
  setSkillCodegenPreferences({ enabledGroupIds: [...next] })
}

export function toggleEnabledSkill(skillId: string, enabled: boolean) {
  const current = skillCodegenPreferences.get()
  const next = new Set(current.enabledSkillIds)
  if (enabled) next.add(skillId)
  else next.delete(skillId)
  setSkillCodegenPreferences({ enabledSkillIds: [...next] })
}

export function isSkillEnabledForCodegen(
  skill: { id: string; group_id: string },
  prefs: SkillCodegenPreferences = skillCodegenPreferences.get()
): boolean {
  return prefs.enabledSkillIds.includes(skill.id) || prefs.enabledGroupIds.includes(skill.group_id)
}
