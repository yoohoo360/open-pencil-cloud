/**
 * Project-level skill roots for common coding agents.
 * Labels are the project folder name (e.g. `.claude`).
 * Keep in sync with `packages/react/src/app/skills/agent-environments.ts`.
 */
export const SKILL_AGENT_ENVIRONMENTS = [
  { id: 'claude', label: '.claude', relativeSkillsDir: '.claude/skills' },
  { id: 'github', label: '.github', relativeSkillsDir: '.github/skills' },
  { id: 'agents', label: '.agents', relativeSkillsDir: '.agents/skills' },
  { id: 'cursor', label: '.cursor', relativeSkillsDir: '.cursor/skills' },
  { id: 'codex', label: '.codex', relativeSkillsDir: '.codex/skills' },
  { id: 'gemini', label: '.gemini', relativeSkillsDir: '.gemini/skills' },
  { id: 'windsurf', label: '.windsurf', relativeSkillsDir: '.windsurf/skills' },
  { id: 'agent', label: '.agent', relativeSkillsDir: '.agent/skills' },
  { id: 'goose', label: '.goose', relativeSkillsDir: '.goose/skills' },
  { id: 'continue', label: '.continue', relativeSkillsDir: '.continue/skills' },
  { id: 'roo', label: '.roo', relativeSkillsDir: '.roo/skills' },
  { id: 'openhands', label: '.openhands', relativeSkillsDir: '.openhands/skills' },
  { id: 'trae', label: '.trae', relativeSkillsDir: '.trae/skills' },
  { id: 'kilocode', label: '.kilocode', relativeSkillsDir: '.kilocode/skills' },
  { id: 'kiro', label: '.kiro', relativeSkillsDir: '.kiro/skills' },
  { id: 'augment', label: '.augment', relativeSkillsDir: '.augment/skills' },
  { id: 'factory', label: '.factory', relativeSkillsDir: '.factory/skills' },
  { id: 'aider', label: '.aider-desk', relativeSkillsDir: '.aider-desk/skills' },
  { id: 'qwen', label: '.qwen', relativeSkillsDir: '.qwen/skills' },
  { id: 'qoder', label: '.qoder', relativeSkillsDir: '.qoder/skills' }
] as const

/** Default when creating a workspace — only `.agents`. */
export const DEFAULT_SKILL_AGENT_ENVIRONMENTS = [
  'agents'
] as const satisfies readonly SkillAgentEnvironmentId[]

export type SkillAgentEnvironmentId = (typeof SKILL_AGENT_ENVIRONMENTS)[number]['id']

const byId = new Map(SKILL_AGENT_ENVIRONMENTS.map((item) => [item.id, item]))

export function isSkillAgentEnvironmentId(value: string): value is SkillAgentEnvironmentId {
  return byId.has(value as SkillAgentEnvironmentId)
}

export function normalizeAgentEnvironments(
  values: unknown,
  fallback: readonly SkillAgentEnvironmentId[] = DEFAULT_SKILL_AGENT_ENVIRONMENTS
): SkillAgentEnvironmentId[] {
  if (!Array.isArray(values)) return [...fallback]
  const next = values.flatMap((value) => {
    if (typeof value !== 'string') return []
    // Migrate older ids
    if (value === 'copilot') return ['github' as const]
    if (value === 'antigravity') return ['agent' as const]
    if (value === 'opencode') return ['agents' as const]
    return isSkillAgentEnvironmentId(value) ? [value] : []
  })
  return next.length > 0 ? [...new Set(next)] : [...fallback]
}

export function relativeSkillsDirFor(id: SkillAgentEnvironmentId): string {
  return byId.get(id)!.relativeSkillsDir
}

/** Unique project skill roots for a multi-select (shared dirs written once). */
export function uniqueRelativeSkillsDirs(ids: SkillAgentEnvironmentId[]): string[] {
  return [...new Set(ids.map((id) => relativeSkillsDirFor(id)))]
}
