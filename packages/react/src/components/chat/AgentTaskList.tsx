import { Check, LoaderCircle, TriangleAlert } from 'lucide-react'

import { isAgentTaskUnlocked, type AgentTaskState } from '#react/app/ai/agent/parallel'
import { useI18n } from '#react/i18n'

/** Pending dependent tasks stay hidden until prior tasks finish — next loading only then. */
export function AgentTaskList({ tasks }: { tasks: readonly AgentTaskState[] }) {
  const { panels } = useI18n()
  const visible = tasks.filter((task) => isAgentTaskUnlocked(task, tasks))
  if (visible.length === 0) return null

  return (
    <div
      data-test-id="agent-task-list"
      className="overflow-hidden rounded-lg border border-border/80 bg-panel"
    >
      <div className="border-b border-border/60 px-2.5 py-1.5">
        <span className="text-[11px] font-medium text-muted">{panels.codeTabTasks}</span>
      </div>
      <ul className="divide-y divide-border/50">
        {visible.map((task) => {
          const statusLabel =
            task.status === 'running'
              ? panels.agentTaskRunning
              : task.status === 'done'
                ? panels.agentTaskDone
                : task.status === 'error'
                  ? panels.agentTaskError
                  : panels.agentTaskPending
          const depLabel =
            task.dependsOn.length > 0
              ? panels.agentTaskAfter({ ids: task.dependsOn.join(', ') })
              : panels.agentTaskParallel
          return (
            <li
              key={task.id}
              data-test-id={`agent-task-${task.id}`}
              data-status={task.status}
              className="flex items-start gap-2 px-2.5 py-1.5"
            >
              <TaskStatusIcon status={task.status} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
                  <span className="text-[11px] font-medium text-surface">[{task.id}]</span>
                  <span className="text-[10px] text-muted">{task.tier}</span>
                  <span className="text-[10px] text-muted">· {depLabel}</span>
                  <span className="text-[10px] text-muted">· {statusLabel}</span>
                </div>
                <p className="mt-0.5 text-[11px] leading-snug text-surface/85">{task.title}</p>
                {task.error ? (
                  <p className="mt-0.5 text-[10px] text-danger">{task.error}</p>
                ) : null}
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function TaskStatusIcon({ status }: { status: AgentTaskState['status'] }) {
  if (status === 'running') {
    return <LoaderCircle className="mt-0.5 size-3 shrink-0 animate-spin text-accent" />
  }
  if (status === 'done') {
    return <Check className="mt-0.5 size-3 shrink-0 text-green-400" />
  }
  if (status === 'error') {
    return <TriangleAlert className="mt-0.5 size-3 shrink-0 text-red-400" />
  }
  return <span className="mt-1 size-2.5 shrink-0 rounded-full border border-muted" />
}
