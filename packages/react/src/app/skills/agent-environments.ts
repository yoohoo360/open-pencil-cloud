/**
 * Project-level skill roots for common coding agents.
 * Labels are the project folder name (e.g. `.claude`).
 * Keep in sync with `desktop-react/agent-server/src/workdir/agent-environments.ts`.
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

export function isSkillAgentEnvironmentId(value: string): value is SkillAgentEnvironmentId {
  return SKILL_AGENT_ENVIRONMENTS.some((item) => item.id === value)
}

export function agentEnvLabel(id: SkillAgentEnvironmentId): string {
  return SKILL_AGENT_ENVIRONMENTS.find((item) => item.id === id)?.label ?? id
}

export function toggleAgentEnvironment(
  current: SkillAgentEnvironmentId[],
  id: SkillAgentEnvironmentId
): SkillAgentEnvironmentId[] {
  if (current.includes(id)) {
    const next = current.filter((item) => item !== id)
    return next.length > 0 ? next : current
  }
  return [...current, id]
}
