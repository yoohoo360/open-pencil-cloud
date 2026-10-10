import { skillAPI, type PencilSkill, type SkillCatalogCategory, type SkillEntry } from '#react/lib/client'

function flattenFiles(nodes: SkillEntry[]): SkillEntry[] {
  const out: SkillEntry[] = []
  for (const node of nodes) {
    if (node.kind === 'file') out.push(node)
    if (node.children?.length) out.push(...flattenFiles(node.children))
  }
  return out
}

export async function loadSkillPackageText(skill: PencilSkill): Promise<string> {
  try {
    const response = await skillAPI.tree(skill.id)
    const files = flattenFiles(response.data ?? []).sort((a, b) => {
      if (a.path === 'SKILL.md') return -1
      if (b.path === 'SKILL.md') return 1
      return a.path.localeCompare(b.path)
    })
    if (files.length === 0) return skill.content ?? ''
    return files.map((file) => `### ${file.path}\n${file.content ?? ''}`).join('\n\n')
  } catch {
    return skill.content ?? ''
  }
}

function isPersonalSkillGroup(group: { id: string; group_key?: string | null }): boolean {
  return !group.group_key?.startsWith('tr-') && !group.id.startsWith('__team_remotes__:')
}

export function collectPersonalSkills(categories: SkillCatalogCategory[]): PencilSkill[] {
  const unique = new Map<string, PencilSkill>()
  for (const category of categories) {
    if (category.kind !== 'personal') continue
    for (const group of category.groups) {
      if (!isPersonalSkillGroup(group)) continue
      for (const skill of group.skills ?? []) {
        if (skill.team_id) continue
        unique.set(skill.id, skill)
      }
    }
  }
  return [...unique.values()]
}

export function skillCatalogBlock(skills: PencilSkill[]): string {
  if (skills.length === 0) return '(No skills enabled in AI settings.)'
  return skills
    .map(
      (skill) =>
        `- key: ${skill.skill_key} | name: ${skill.name}${skill.description ? ` | ${skill.description}` : ''}`
    )
    .join('\n')
}

export function withSkillsInPlan(plan: string, skillKeys: string[]): string {
  if (skillKeys.length === 0) return plan
  const line = `Skills: ${skillKeys.join(', ')}`
  if (!plan.trim()) return line
  if (plan.includes(line)) return plan
  return `${plan.trim()}\n\n${line}`
}
