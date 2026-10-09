import { withSkillsInPlan } from '#react/app/skills/package-load'

export function buildDesignRoutePrompt(options: {
  catalog: string
  sceneContext: string
}): string {
  return `You are planning an OpenPencil canvas prototype (Edit / design mode).

Do NOT call tools in this phase. Do NOT emit fenced code as the deliverable.
Reply with a short plan the editor will execute next using canvas tools (render, etc.).

Output ONLY these XML sections (no markdown fences around the whole reply):

<thinking>
Brief reasoning about the request, canvas copy, and which skills fit which steps.
</thinking>

<plan>
Numbered high-level steps for building/updating the canvas prototype.
When you pick skills, name them by key.
</plan>

<steps>
Concrete tool-oriented steps (what to create/change on the canvas).
Include skill keys next to steps that need them.
</steps>

<skills>
exact-skill-key
</skills>

<lookup>
optional-name-or-id
</lookup>

In <skills>, list exact keys from the catalog (one per line). Empty if none.
Leave <lookup> empty when the canvas context is enough.
Do not output tool calls or source code in this phase.

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
  lookupNotes: string
  sceneContext: string
}): string {
  const planWithSkills = withSkillsInPlan(options.plan, options.skillKeys)
  const packages =
    options.skillPackages.length === 0
      ? '(No skill packages loaded. Use general design best practices and the canvas tools.)'
      : options.skillPackages
          .map((pkg) => `## Skill ${pkg.name} (${pkg.key})\n${pkg.body || '(empty package)'}`)
          .join('\n\n')

  return `## Execution plan (follow this; use canvas tools)
${planWithSkills || '(no plan)'}

## Steps
${options.steps || '(none)'}

## Canvas context
${options.sceneContext || '(none)'}

## Resolved lookups
${options.lookupNotes || '(none)'}

## Loaded skill packages
Apply guidance from these skills while editing the canvas with tools.
${packages}`
}
