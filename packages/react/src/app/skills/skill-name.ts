/**
 * Skill / skill-group display name.
 * For skills this is also the local folder under agent roots
 * (`.agents/skills/<name>/`, …).
 *
 * Allowed: Unicode letters (e.g. English / Chinese), digits, and `-`.
 * No whitespace or other symbols.
 * Kept in sync with server `PencilSkillService.sanitizeKey`.
 */

export type SkillNameIssue = 'empty' | 'invalid' | 'too_long'

export type SkillNameValidation =
  | { ok: true; name: string }
  | { ok: false; issue: SkillNameIssue }

/** Strict create/edit check — does not rewrite the value. */
export function validateSkillName(raw: string): SkillNameValidation {
  const trimmed = raw.trim()
  if (!trimmed) return { ok: false, issue: 'empty' }
  if (trimmed.length > 64) return { ok: false, issue: 'too_long' }
  if (/[^\p{L}\p{N}-]/u.test(trimmed)) return { ok: false, issue: 'invalid' }
  return { ok: true, name: trimmed }
}

export function assertSkillName(raw: string): string {
  const result = validateSkillName(raw)
  if (!result.ok) {
    if (result.issue === 'empty') throw new Error('name is required')
    if (result.issue === 'too_long') throw new Error('name is too long')
    throw new Error('name has invalid characters')
  }
  return result.name
}

/** Soft cleanup for folder paths / legacy keys (not used for form validation). */
export function sanitizeSkillName(raw: string): string {
  return raw
    .trim()
    .replace(/[^\p{L}\p{N}-]+/gu, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

/** Disk folder for a skill — always from display name (legacy key as fallback). */
export function skillFolderName(skill: { name: string; key?: string; skill_key?: string }): string {
  const strict = validateSkillName(skill.name)
  if (strict.ok) return strict.name
  const fromName = sanitizeSkillName(skill.name)
  if (fromName) return fromName
  const legacy = sanitizeSkillName(skill.key ?? skill.skill_key ?? '')
  return legacy || 'skill'
}
