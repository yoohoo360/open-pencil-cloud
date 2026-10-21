/** Single Skills page query key: which top-level tab is open. */
export const SKILLS_TAB_PARAM = 'tab'

export const SKILLS_TAB = {
  /** All personal skills (and skill groups under that side). */
  skills: 'skills',
  /** Skill workspace. */
  workspace: 'workspace'
} as const

export type SkillsTab = (typeof SKILLS_TAB)[keyof typeof SKILLS_TAB]

export const SKILLS_TAB_IDS = {
  allPersonal: '__all_personal__',
  /** Owned skills with no team binding. */
  ownerSkills: '__owner_skills__',
  workspace: '__skill_workspace__'
} as const

export function readSkillsTab(params: URLSearchParams): SkillsTab {
  const raw = params.get(SKILLS_TAB_PARAM)?.trim()
  if (raw === SKILLS_TAB.workspace || raw === SKILLS_TAB_IDS.workspace) {
    return SKILLS_TAB.workspace
  }
  // Legacy `group=` deep links — only workspace vs skills matters now.
  const legacyGroup = params.get('group')?.trim()
  if (legacyGroup === SKILLS_TAB_IDS.workspace) return SKILLS_TAB.workspace
  return SKILLS_TAB.skills
}

export function skillsTabFromGroupId(groupId: string): SkillsTab {
  return groupId === SKILLS_TAB_IDS.workspace ? SKILLS_TAB.workspace : SKILLS_TAB.skills
}

export function groupIdFromSkillsTab(tab: SkillsTab): string {
  return tab === SKILLS_TAB.workspace
    ? SKILLS_TAB_IDS.workspace
    : SKILLS_TAB_IDS.allPersonal
}

/**
 * Write only `tab`. Clears legacy deep-link keys.
 * Does nothing (same URLSearchParams instance content) when already correct — callers
 * should still avoid setSearchParams if unchanged.
 */
export function writeSkillsTab(
  current: URLSearchParams,
  tab: SkillsTab
): URLSearchParams {
  const next = new URLSearchParams(current)
  next.delete('group')
  next.delete('skill')
  next.delete('entry')
  next.delete('workdir')
  if (tab === SKILLS_TAB.workspace) next.set(SKILLS_TAB_PARAM, SKILLS_TAB.workspace)
  else next.delete(SKILLS_TAB_PARAM)
  return next
}

export function skillsTabSearchEquals(a: URLSearchParams, b: URLSearchParams): boolean {
  return a.toString() === b.toString()
}
