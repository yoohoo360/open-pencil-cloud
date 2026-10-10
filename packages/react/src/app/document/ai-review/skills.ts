import type {
  AiReviewPayload,
  AiReviewSkillSelection
} from '#react/app/document/ai-review/types'
import {
  collectPersonalSkills,
  loadSkillPackageText
} from '#react/app/skills/package-load'
import { skillChatPreferences } from '#react/app/skills/preferences'
import type { PencilSkill, SkillCatalogCategory } from '#react/lib/client'

export function emptySkillSelection(): AiReviewSkillSelection {
  return { group_ids: [], skill_ids: [] }
}

/** Seed a new review draft from design-chat skill toggles — default all selected. */
export function skillSelectionFromCodegenPrefs(): AiReviewSkillSelection {
  const prefs = skillChatPreferences('design').get()
  if (prefs.allEnabled) {
    return { all: true, group_ids: [], skill_ids: [] }
  }
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
  enabled: boolean,
  allGroupIds: readonly string[] = []
): AiReviewSkillSelection {
  if (selection.all) {
    if (enabled) return selection
    return {
      group_ids: allGroupIds.filter((id) => id !== groupId),
      skill_ids: []
    }
  }

  const next = new Set(selection.group_ids)
  if (enabled) next.add(groupId)
  else next.delete(groupId)
  const group_ids = [...next]

  if (
    allGroupIds.length > 0 &&
    selection.skill_ids.length === 0 &&
    allGroupIds.every((id) => group_ids.includes(id))
  ) {
    return { all: true, group_ids: [], skill_ids: [] }
  }

  return { ...selection, all: undefined, group_ids }
}

export function toggleSkill(
  selection: AiReviewSkillSelection,
  skillId: string,
  enabled: boolean,
  context: {
    groupId: string
    allGroupIds: readonly string[]
    siblingSkillIds: readonly string[]
  } = { groupId: '', allGroupIds: [], siblingSkillIds: [] }
): AiReviewSkillSelection {
  if (selection.all) {
    if (enabled) return selection
    return {
      group_ids: context.allGroupIds.filter((id) => id !== context.groupId),
      skill_ids: context.siblingSkillIds.filter((id) => id !== skillId)
    }
  }

  if (selection.group_ids.includes(context.groupId)) {
    if (enabled) return selection
    const group_ids = selection.group_ids.filter((id) => id !== context.groupId)
    const skill_ids = [
      ...selection.skill_ids.filter((id) => !context.siblingSkillIds.includes(id)),
      ...context.siblingSkillIds.filter((id) => id !== skillId)
    ]
    return { group_ids, skill_ids }
  }

  const next = new Set(selection.skill_ids)
  if (enabled) next.add(skillId)
  else next.delete(skillId)
  let skill_ids = [...next]

  if (
    enabled &&
    context.groupId &&
    context.siblingSkillIds.length > 0 &&
    context.siblingSkillIds.every((id) => skill_ids.includes(id))
  ) {
    const group_ids = [...new Set([...selection.group_ids, context.groupId])]
    skill_ids = skill_ids.filter((id) => !context.siblingSkillIds.includes(id))
    if (
      context.allGroupIds.length > 0 &&
      skill_ids.length === 0 &&
      context.allGroupIds.every((id) => group_ids.includes(id))
    ) {
      return { all: true, group_ids: [], skill_ids: [] }
    }
    return { group_ids, skill_ids }
  }

  return { ...selection, all: undefined, skill_ids }
}

export function isSkillSelected(
  skill: { id: string; group_id: string },
  selection: AiReviewSkillSelection
): boolean {
  if (selection.all) return true
  return selection.skill_ids.includes(skill.id) || selection.group_ids.includes(skill.group_id)
}

export function isGroupSelected(
  groupId: string,
  selection: AiReviewSkillSelection
): boolean {
  return Boolean(selection.all) || selection.group_ids.includes(groupId)
}

export function resolveSelectedSkills(
  categories: SkillCatalogCategory[],
  selection: AiReviewSkillSelection
): PencilSkill[] {
  const personal = collectPersonalSkills(categories)
  if (selection.all) return personal
  return personal.filter((skill) => isSkillSelected(skill, selection))
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
