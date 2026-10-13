import { useState, type ReactNode } from 'react'
import { Check, ChevronDown, ListChecks, LoaderCircle, TriangleAlert } from 'lucide-react'

import { isToolPart, type ChatMessagePart, type ChatToolPart } from '#react/app/ai/chat/types'
import { classifyToolState } from '#react/components/chat/tool-state'
import { useI18n } from '#react/i18n'

/** Longer runs fold all but the latest call into one expandable batch row. */
const INLINE_CALLS = 1

export function toolDisplayName(name: string) {
  return name
    .replace(/^mcp__[^_]+__/, '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

/** Split assistant parts into text bubbles and consecutive tool runs. */
export function groupAssistantParts(parts: readonly ChatMessagePart[]): Array<
  | { kind: 'text'; text: string; key: string }
  | { kind: 'tools'; tools: ChatToolPart[]; key: string }
> {
  const groups: Array<
    | { kind: 'text'; text: string; key: string }
    | { kind: 'tools'; tools: ChatToolPart[]; key: string }
  > = []
  let toolBuf: ChatToolPart[] = []
  let textIndex = 0

  const flushTools = () => {
    if (toolBuf.length === 0) return
    groups.push({
      kind: 'tools',
      tools: toolBuf,
      key: `tools-${toolBuf[0]?.toolCallId ?? groups.length}`
    })
    toolBuf = []
  }

  for (const part of parts) {
    if (isToolPart(part)) {
      toolBuf.push(part)
      continue
    }
    flushTools()
    if (part.type === 'text' && part.text) {
      groups.push({ kind: 'text', text: part.text, key: `text-${textIndex++}` })
    }
  }
  flushTools()
  return groups
}

export function ToolCallGroup({
  tools,
  runningLabel,
  doneLabel,
  errorLabel
}: {
  tools: readonly ChatToolPart[]
  runningLabel: string
  doneLabel: string
  errorLabel: string
}) {
  const { dialogs } = useI18n()
  if (tools.length <= INLINE_CALLS) {
    return (
      <div className="space-y-1.5">
        {tools.map((part) => (
          <ToolCallCard
            key={part.toolCallId}
            part={part}
            runningLabel={runningLabel}
            doneLabel={doneLabel}
            errorLabel={errorLabel}
          />
        ))}
      </div>
    )
  }

  const earlier = tools.slice(0, -1)
  const latest = tools[tools.length - 1]
  const failed = earlier.filter(
    (part) =>
      classifyToolState({
        toolName: part.toolName,
        state: part.state,
        output: part.output
      }) === 'error'
  ).length
  const names = earlier.map((part) => toolDisplayName(part.toolName)).join(' · ')
  const label = failed
    ? `${dialogs.toolSteps({ count: earlier.length })} · ${dialogs.toolStepsFailed({ count: failed })}`
    : dialogs.toolSteps({ count: earlier.length })

  return (
    <div className="space-y-1.5" data-slot="chat-tool-group">
      <EarlierToolsBatch label={label} names={names} count={earlier.length} failed={failed}>
        {earlier.map((part) => (
          <ToolCallCard
            key={part.toolCallId}
            part={part}
            runningLabel={runningLabel}
            doneLabel={doneLabel}
            errorLabel={errorLabel}
          />
        ))}
      </EarlierToolsBatch>
      {latest ? (
        <ToolCallCard
          part={latest}
          runningLabel={runningLabel}
          doneLabel={doneLabel}
          errorLabel={errorLabel}
        />
      ) : null}
    </div>
  )
}

function EarlierToolsBatch({
  label,
  names,
  count,
  failed,
  children
}: {
  label: string
  names: string
  count: number
  failed: number
  children: ReactNode
}) {
  const [open, setOpen] = useState(false)
  return (
    <div className="overflow-hidden rounded-lg border border-border/80 bg-panel">
      <button
        type="button"
        aria-label={label}
        data-test-id="chat-tool-batch"
        className="flex w-full items-center gap-2 px-2.5 py-1.5 text-left hover:bg-hover"
        onClick={() => setOpen((value) => !value)}
      >
        <ListChecks className="size-3.5 shrink-0 text-muted" aria-hidden />
        <span className="min-w-0 flex-1 truncate text-[11px] text-surface/80">{names}</span>
        {failed > 0 ? (
          <span className="shrink-0 rounded bg-red-500/15 px-1.5 py-0.5 text-[10px] text-red-400">
            {failed}
          </span>
        ) : null}
        <span className="shrink-0 rounded bg-muted/20 px-1.5 py-0.5 text-[10px] text-muted">
          {count}
        </span>
        <ChevronDown
          className={`size-3 shrink-0 text-muted transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open ? <div className="space-y-1.5 border-t border-border/60 p-2">{children}</div> : null}
    </div>
  )
}

function ToolCallCard({
  part,
  runningLabel,
  doneLabel,
  errorLabel
}: {
  part: ChatToolPart
  runningLabel: string
  doneLabel: string
  errorLabel: string
}) {
  const [open, setOpen] = useState(false)
  const state = classifyToolState({
    toolName: part.toolName,
    state: part.state,
    output: part.output
  })
  const output =
    part.state === 'output-error' && part.errorText
      ? part.errorText
      : JSON.stringify(part.output, null, 2)
  const name = toolDisplayName(part.toolName)

  return (
    <div className="rounded-lg border border-border bg-canvas p-2">
      <button
        type="button"
        className="flex w-full items-center gap-2 rounded px-1 py-0.5 hover:bg-hover"
        onClick={() => state !== 'pending' && setOpen((value) => !value)}
      >
        <div
          className={`flex size-4 items-center justify-center rounded-full ${
            state === 'pending'
              ? 'bg-accent/20 text-accent'
              : state === 'done'
                ? 'bg-green-500/20 text-green-400'
                : 'bg-red-500/20 text-red-400'
          }`}
        >
          {state === 'pending' ? (
            <LoaderCircle className="size-3 animate-spin" />
          ) : state === 'done' ? (
            <Check className="size-3" />
          ) : (
            <TriangleAlert className="size-3" />
          )}
        </div>
        <span className="text-[11px] text-surface">{name}</span>
        <span className="text-[10px] text-muted">
          {state === 'pending' ? runningLabel : state === 'done' ? doneLabel : errorLabel}
        </span>
        {state !== 'pending' ? (
          <ChevronDown
            className={`ml-auto size-3 text-muted transition-transform ${open ? 'rotate-180' : ''}`}
          />
        ) : null}
      </button>
      {open && state !== 'pending' ? (
        <pre className="mt-1 overflow-x-auto rounded bg-input p-2 text-[10px] text-muted">
          {output}
        </pre>
      ) : null}
    </div>
  )
}
