import type {
  AiReviewPayload,
  AiReviewSkillSelection
} from '#react/app/document/ai-review/types'
import {
  collectPersonalSkills,
  loadSkillPackageText
} from '#react/app/skills/package-load'
import { skillCodegenPreferences } from '#react/app/skills/preferences'
import type { PencilSkill, SkillCatalogCategory } from '#react/lib/client'

export function emptySkillSelection(): AiReviewSkillSelection {
  return { group_ids: [], skill_ids: [] }
}

/** Seed a new review draft from Settings → Skills codegen toggles. */
export function skillSelectionFromCodegenPrefs(): AiReviewSkillSelection {
  const prefs = skillCodegenPreferences.get()
  return {
    group_ids: [...prefs.enabledGroupIds],
    skill_ids: [...prefs.enabledSkillIds]
  }
}

export function skillSelectionOf(payload: AiReviewPayload): AiReviewSkillSelection {
  return payload.skills ?? emptySkillSelection()
}

export function withSkillSelection(
  payload: AiReviewPayload,
  skills: AiReviewSkillSelection
): AiReviewPayload {
  return { ...payload, skills }
}

export function toggleSkillGroup(
  selection: AiReviewSkillSelection,
  groupId: string,
  enabled: boolean
): AiReviewSkillSelection {
  const next = new Set(selection.group_ids)
  if (enabled) next.add(groupId)
  else next.delete(groupId)
  return { ...selection, group_ids: [...next] }
}

export function toggleSkill(
  selection: AiReviewSkillSelection,
  skillId: string,
  enabled: boolean
): AiReviewSkillSelection {
  const next = new Set(selection.skill_ids)
  if (enabled) next.add(skillId)
  else next.delete(skillId)
  return { ...selection, skill_ids: [...next] }
}

export function isSkillSelected(
  skill: { id: string; group_id: string },
  selection: AiReviewSkillSelection
): boolean {
  return selection.skill_ids.includes(skill.id) || selection.group_ids.includes(skill.group_id)
}

export function resolveSelectedSkills(
  categories: SkillCatalogCategory[],
  selection: AiReviewSkillSelection
): PencilSkill[] {
  return collectPersonalSkills(categories).filter((skill) => isSkillSelected(skill, selection))
}

const MAX_SKILL_CHARS = 24_000

/** Load selected skill package texts for the AI review prompt. */
export async function loadSelectedSkillPromptBlock(
  categories: SkillCatalogCategory[],
  selection: AiReviewSkillSelection
): Promise<string> {
  const skills = resolveSelectedSkills(categories, selection)
  if (skills.length === 0) return ''
  const parts: string[] = []
  let used = 0
  for (const skill of skills) {
    const body = (await loadSkillPackageText(skill)).trim()
    if (!body) continue
    const chunk = `## Skill ${skill.skill_key} (${skill.name})\n${body}`
    if (used + chunk.length > MAX_SKILL_CHARS) {
      parts.push(`## Skill ${skill.skill_key}\n(truncated — budget reached)`)
      break
    }
    parts.push(chunk)
    used += chunk.length
  }
  if (parts.length === 0) return ''
  return `Organization skills to apply while reviewing:\n\n${parts.join('\n\n')}`
}
