import MAKE_REACT_TAILWIND_SKILL from '#react/app/make/skills/make-react-tailwind.md?raw'
import type { PencilSkill } from '#react/lib/client'

/** Built-in Make skill id — content is local; never fetched from the skills API. */
export const DEFAULT_MAKE_SKILL_ID = 'builtin:make-react-tailwind'
export const DEFAULT_MAKE_SKILL_KEY = 'make-react-tailwind'
export const DEFAULT_MAKE_SKILL_GROUP_ID = 'builtin:make'

export function isBuiltinMakeSkillId(id: string): boolean {
  return id === DEFAULT_MAKE_SKILL_ID || id.startsWith('builtin:make')
}

/** Default Make skill always loaded into the Make chat catalog. */
export function createDefaultMakeSkill(): PencilSkill {
  return {
    id: DEFAULT_MAKE_SKILL_ID,
    skill_key: DEFAULT_MAKE_SKILL_KEY,
    name: 'Make React Tailwind',
    description:
      'Author the Make project shape and load every other enabled skill. /src/index.tsx default-exports the root component (host mounts it).',
    content: MAKE_REACT_TAILWIND_SKILL,
    group_id: DEFAULT_MAKE_SKILL_GROUP_ID
  }
}

export function withDefaultMakeSkill(skills: readonly PencilSkill[]): PencilSkill[] {
  const builtin = createDefaultMakeSkill()
  if (skills.some((skill) => skill.id === builtin.id || skill.skill_key === builtin.skill_key)) {
    return [...skills]
  }
  return [builtin, ...skills]
}

/**
 * Make always runs the default skill and loads every other enabled skill package
 * (route picks are merged in, never used to drop enabled skills).
 */
export function resolveMakeSkillKeys(
  enabledSkills: readonly PencilSkill[],
  routeSelectedKeys: readonly string[] = []
): string[] {
  const keys: string[] = [DEFAULT_MAKE_SKILL_KEY]
  const seen = new Set(keys)
  for (const key of [
    ...enabledSkills.map((skill) => skill.skill_key),
    ...routeSelectedKeys
  ]) {
    if (!key || seen.has(key)) continue
    seen.add(key)
    keys.push(key)
  }
  return keys
}

/** Skills to load for Make generate — default first, then the rest of the resolved keys. */
export function resolveMakeSkillsToLoad(
  enabledSkills: readonly PencilSkill[],
  routeSelectedKeys: readonly string[] = []
): PencilSkill[] {
  const byKey = new Map(enabledSkills.map((skill) => [skill.skill_key, skill]))
  const ordered: PencilSkill[] = []
  for (const key of resolveMakeSkillKeys(enabledSkills, routeSelectedKeys)) {
    const skill = byKey.get(key)
    if (skill) ordered.push(skill)
  }
  return ordered
}
