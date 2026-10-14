import { DESIGN_AGENT_TASKS_PROMPT } from '#react/app/ai/agent/parallel'
import { withSkillsInPlan } from '#react/app/skills/package-load'

export function buildDesignRoutePrompt(options: {
  catalog: string
  sceneContext: string
}): string {
  return `Plan an OpenPencil canvas prototype (Edit / design mode).

This phase is planning only: no tools, no fenced deliverable code.
Keep <thinking> to 2–4 short lines. Prefer one <task>.

Reply with these XML sections (no markdown fences around the whole reply):

<thinking>
Short approach: what to inspect/build, which skills (by key), and which reads can run in parallel in one tool turn (get_selection + find_nodes + describe + calc together). Do not split into a separate plan and steps list.
</thinking>

${DESIGN_AGENT_TASKS_PROMPT}

<skills>
exact-skill-key
</skills>

<lookup>
optional-name-or-id
</lookup>

In <skills>, exact catalog keys (one per line), or empty. Leave <lookup> empty when scene context is enough.

Enabled skill catalog:
${options.catalog}

Current scene / selection context:
${options.sceneContext || '(none)'}`
}

export function buildDesignExecuteExtra(options: {
  plan: string
  steps: string
  skillKeys: string[]
  skillPackages: Array<{ key: string; name: string; body: string }>
  skillTemplatesCatalog: string
  lookupNotes: string
  sceneContext: string
  /** When set, only perform this task (deps already finished). */
  task?: { id: string; title: string; tier: string }
  priorTaskNotes?: string
}): string {
  const planWithSkills = withSkillsInPlan(options.plan, options.skillKeys)
  const packages =
    options.skillPackages.length === 0
      ? '(No skill packages loaded. Use general design best practices and the canvas tools.)'
      : options.skillPackages
          .map((pkg) => `## Skill ${pkg.name} (${pkg.key})\n${pkg.body || '(empty package)'}`)
          .join('\n\n')

  const focus = options.task
    ? `## Current task (do only this now)
[${options.task.id}] (${options.task.tier}) ${options.task.title}

Prior finished task notes:
${options.priorTaskNotes || '(none)'}
`
    : ''

  const hasTemplates =
    options.skillTemplatesCatalog.trim().length > 0 &&
    !options.skillTemplatesCatalog.includes('No design clipboard templates')

  const templateRules = hasTemplates
    ? `## Skill design templates (Figma / OpenPencil XML)
Loaded skills include clipboard templates (ids below). On a new plan the host pastes them first (\`insert_skill_template\` results in the transcript) — modify those \`created\` ids. On follow-ups, keep editing existing nodes; call \`insert_skill_template\` only if the user asks for another paste. Never rebuild the same UI with \`render\`.
${options.skillTemplatesCatalog}
`
    : `## Skill design templates
${options.skillTemplatesCatalog}
`

  return `${hasTemplates ? templateRules : ''}## Thinking (follow this; use canvas tools)
${planWithSkills || options.steps || '(none)'}

${focus}## Canvas context
${options.sceneContext || '(none)'}

## Resolved lookups
${options.lookupNotes || '(none)'}

## Tool throughput
In each assistant turn emit as many tool_calls as possible (one model round-trip).
Inspect the canvas in ONE turn: get_selection + find_nodes + describe (+ calc/eval) as multiple tool_calls — never one read per turn.
Prefer batch_update / calc arrays / stock_photo batches. eval is already loaded — do not discover_tools/enable_tools for it.
${hasTemplates ? '' : templateRules}
## Loaded skill packages
Apply guidance from these skills while editing the canvas with tools.
${packages}`
}
