import type { SkillAgentEnvironmentId } from './agent-environments.ts'

export type WorkdirSkillRecord = {
  key: string
  name: string
  /** When false the skill folders stay on disk but are not loaded into chat. */
  enabled: boolean
  /** Agent environments this skill was last written to. */
  agentEnvironments: SkillAgentEnvironmentId[]
  updatedAt: string
}

export type WorkdirRecord = {
  id: string
  name: string
  /** Absolute project path chosen when the workspace was created. */
  path: string
  /** Active agent environments for pull / sync (multi-select). */
  agentEnvironments: SkillAgentEnvironmentId[]
  createdAt: string
  skills: WorkdirSkillRecord[]
}

export type WorkdirIndex = {
  activeWorkdirId: string | null
  workdirs: Array<Pick<WorkdirRecord, 'id' | 'name' | 'path' | 'createdAt'>>
}

export type WorkdirSkillPackage = {
  key: string
  name: string
  body: string
}
