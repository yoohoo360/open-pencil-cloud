import * as v from 'valibot'

/** Project-root `.open-pencil/config.json` for skill workspace pull. */
export type WorkdirSkillConfig = {
  /** When `auto`, matching skill groups are pulled on app/workspace open. */
  pull: 'auto' | 'manual'
  /** Skill group ids to match against the org catalog. */
  skillGroups: string[]
}

export const DEFAULT_WORKDIR_SKILL_CONFIG: Readonly<WorkdirSkillConfig> = {
  pull: 'manual',
  skillGroups: []
}

export const OPEN_PENCIL_CONFIG_DIR = '.open-pencil'
export const OPEN_PENCIL_CONFIG_FILE = 'config.json'
export const OPEN_PENCIL_CONFIG_RELATIVE = `${OPEN_PENCIL_CONFIG_DIR}/${OPEN_PENCIL_CONFIG_FILE}`

const WorkdirSkillConfigSchema = v.object({
  pull: v.optional(v.picklist(['auto', 'manual'] as const)),
  skillGroups: v.optional(v.array(v.string()))
})

function stringIds(values: readonly string[]): string[] {
  const out: string[] = []
  const seen = new Set<string>()
  for (const item of values) {
    const id = item.trim()
    if (!id || seen.has(id)) continue
    seen.add(id)
    out.push(id)
  }
  return out
}

export function normalizeWorkdirSkillConfig(value: unknown): WorkdirSkillConfig {
  const parsed = v.safeParse(WorkdirSkillConfigSchema, value)
  if (!parsed.success) return structuredClone(DEFAULT_WORKDIR_SKILL_CONFIG)
  return {
    pull: parsed.output.pull === 'auto' ? 'auto' : 'manual',
    skillGroups: stringIds(parsed.output.skillGroups ?? [])
  }
}

export function parseWorkdirSkillConfigText(text: string): WorkdirSkillConfig {
  const json = v.safeParse(v.pipe(v.string(), v.parseJson(), WorkdirSkillConfigSchema), text)
  if (!json.success) return structuredClone(DEFAULT_WORKDIR_SKILL_CONFIG)
  return normalizeWorkdirSkillConfig(json.output)
}

export function serializeWorkdirSkillConfig(config: WorkdirSkillConfig): string {
  const normalized = normalizeWorkdirSkillConfig(config)
  return `${JSON.stringify(
    {
      pull: normalized.pull,
      skillGroups: normalized.skillGroups
    },
    null,
    2
  )}\n`
}
