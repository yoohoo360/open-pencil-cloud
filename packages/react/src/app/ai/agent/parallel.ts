/**
 * Cursor-like agent subtask runner: split work into tasks and execute
 * independent waves in parallel (dependency-aware).
 */

export type ModelTier = 'high' | 'medium' | 'low'

export type AgentSubtask<TResult = string> = {
  id: string
  /** Optional display title for the UI. */
  title?: string
  /** Task ids that must finish before this one starts. */
  dependsOn?: readonly string[]
  run: () => Promise<TResult>
}

export type AgentSubtaskResult<TResult = string> = {
  id: string
  ok: boolean
  value?: TResult
  error?: string
}

function missingDeps(
  task: AgentSubtask<unknown>,
  done: ReadonlySet<string>
): string[] {
  return (task.dependsOn ?? []).filter((id) => !done.has(id))
}

/**
 * Run subtasks in waves: all ready tasks (deps satisfied) run via Promise.all,
 * then the next wave, until every task is settled or blocked.
 */
export async function runAgentSubtasks<TResult>(
  tasks: readonly AgentSubtask<TResult>[]
): Promise<AgentSubtaskResult<TResult>[]> {
  if (tasks.length === 0) return []

  const byId = new Map(tasks.map((task) => [task.id, task]))
  if (byId.size !== tasks.length) {
    throw new Error('Agent subtask ids must be unique')
  }

  const results = new Map<string, AgentSubtaskResult<TResult>>()
  const done = new Set<string>()
  const pending = new Set(tasks.map((task) => task.id))

  while (pending.size > 0) {
    const wave = [...pending]
      .map((id) => byId.get(id))
      .filter((task): task is AgentSubtask<TResult> => Boolean(task))
      .filter((task) => missingDeps(task, done).length === 0)

    if (wave.length === 0) {
      for (const id of pending) {
        results.set(id, {
          id,
          ok: false,
          error: `Blocked on unmet dependencies: ${(byId.get(id)?.dependsOn ?? []).join(', ')}`
        })
        done.add(id)
      }
      break
    }

    const settled = await Promise.all(
      wave.map(async (task) => {
        try {
          const value = await task.run()
          return { id: task.id, ok: true as const, value }
        } catch (cause) {
          return {
            id: task.id,
            ok: false as const,
            error: cause instanceof Error ? cause.message : String(cause)
          }
        }
      })
    )

    for (const result of settled) {
      results.set(result.id, result)
      done.add(result.id)
      pending.delete(result.id)
    }
  }

  return tasks.map(
    (task) => results.get(task.id) ?? { id: task.id, ok: false, error: 'Missing result' }
  )
}

/**
 * Parse `<tasks>` from an agent plan reply.
 *
 * ```
 * <tasks>
 * <task id="a" tier="high">Inspect selection</task>
 * <task id="b" depends="a" tier="medium">Rewrite App</task>
 * <task id="c" tier="low">Update package.json</task>
 * </tasks>
 * ```
 * Tasks whose dependencies are empty (or already finished) run in the same wave (parallel).
 */
export type ParsedAgentTask = {
  id: string
  title: string
  tier: ModelTier
  dependsOn: string[]
}

/** Lifecycle of a planned agent task in the chat UI. */
export type AgentTaskStatus = 'pending' | 'running' | 'done' | 'error'

export type AgentTaskState = ParsedAgentTask & {
  status: AgentTaskStatus
  error?: string
}

export function parseAgentTasksXml(text: string): ParsedAgentTask[] {
  const section = text.match(/<tasks>([\s\S]*?)<\/tasks>/i)?.[1] ?? ''
  if (!section.trim()) return []
  const out: ParsedAgentTask[] = []
  const seen = new Set<string>()
  for (const match of section.matchAll(
    /<task\b([^>]*)>([\s\S]*?)<\/task>/gi
  )) {
    const attrs = match[1] ?? ''
    const title = (match[2] ?? '').trim()
    const idMatch = attrs.match(/\bid\s*=\s*["']?([^\s"'>]+)["']?/i)
    const id = (idMatch?.[1] ?? `task-${out.length + 1}`).trim()
    if (!id || seen.has(id)) continue
    seen.add(id)
    const tierMatch = attrs.match(/\btier\s*=\s*["']?(high|medium|low)["']?/i)
    const tier =
      tierMatch?.[1]?.toLowerCase() === 'high'
        ? 'high'
        : tierMatch?.[1]?.toLowerCase() === 'low'
          ? 'low'
          : 'medium'
    const dependsRaw =
      attrs.match(/\bdepends(?:On)?\s*=\s*["']([^"']+)["']/i)?.[1] ??
      attrs.match(/\bdepends(?:On)?\s*=\s*([^\s>]+)/i)?.[1] ??
      ''
    const dependsOn = dependsRaw
      .split(/[, ]+/)
      .map((part) => part.trim())
      .filter(Boolean)
    out.push({ id, title, tier, dependsOn })
  }
  return out
}

/** Prefer parsed `<tasks>`; otherwise one fallback generate task from plan/steps. */
export function resolveAgentTasks(
  routeText: string,
  fallback: { plan?: string; steps?: string } = {}
): ParsedAgentTask[] {
  const parsed = parseAgentTasksXml(routeText)
  if (parsed.length > 0) return parsed
  const title =
    fallback.steps?.trim() ||
    fallback.plan?.trim().split('\n').find((line) => line.trim()) ||
    'Generate'
  return [{ id: 'generate', title: title.slice(0, 200), tier: 'high', dependsOn: [] }]
}

export function toPendingAgentTasks(tasks: readonly ParsedAgentTask[]): AgentTaskState[] {
  return tasks.map((task) => ({ ...task, status: 'pending' as const }))
}

/** Pending dependent tasks stay locked until every dependency is done. */
export function isAgentTaskUnlocked(
  task: AgentTaskState,
  tasks: readonly AgentTaskState[]
): boolean {
  if (task.status !== 'pending') return true
  return task.dependsOn.every((id) => {
    const dep = tasks.find((item) => item.id === id)
    return dep?.status === 'done'
  })
}

/** Human-readable execution order for the plan/steps UI. */
export function formatAgentTasksSteps(tasks: readonly ParsedAgentTask[]): string {
  if (tasks.length === 0) return ''
  return tasks
    .map((task, index) => {
      const deps =
        task.dependsOn.length > 0
          ? ` (after ${task.dependsOn.join(', ')}; ${task.tier})`
          : ` (parallel-ok; ${task.tier})`
      return `${index + 1}. [${task.id}]${deps} ${task.title}`
    })
    .join('\n')
}

/** Prompt fragment: how to author the execution graph (codegen / Make). */
export const AGENT_TASKS_PROMPT = `Put the agent execution graph in <tasks>.
Maximize safe parallelism: same wave for independent work; serialize when outputs would conflict.

- Each <task>: unique id, tier="high|medium|low", short instruction with one deliverable.
- Prefer many small parallel tasks over one long chain.
- Parallel only when tasks touch different files or unrelated canvas regions and do not invent the same export/API.
- Use depends="id1,id2" to reuse earlier outputs, edit the same path, wire imports after components exist, or merge work.
- Typical Make: package.json (low) ∥ leaf components (high) → App/pages → index entry last.
- One writer per path per wave; keep generate work in <tasks>, not only in free-form <steps>.

<tasks>
<task id="pkg" tier="low">Write /package.json deps only</task>
<task id="button" tier="medium">Write /src/components/Button.tsx only</task>
<task id="app" depends="button" tier="high">Write /src/App.tsx importing Button</task>
<task id="entry" depends="app" tier="medium">Write /src/index.tsx default export</task>
</tasks>`

/**
 * Design / canvas chat: one agent loop is faster than N parallel LLM tasks
 * (each task re-inspects the canvas and pays another TTFT). Checklist only.
 */
export const DESIGN_AGENT_TASKS_PROMPT = `Put a short checklist in <tasks> (UI only — the app runs ONE tool agent, not one LLM per task).

- Prefer a **single** <task id="build" tier="high">…</task> covering the whole request.
- Add more tasks only as a human-readable checklist; do not split into many sequential LLM jobs.
- Parallel file-style fan-out is for codegen/Make, not canvas Edit.

<tasks>
<task id="build" tier="high">Inspect canvas in one multi-tool turn, then build/fix with batch_update/render</task>
</tasks>`
