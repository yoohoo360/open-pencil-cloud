import { useState } from 'react'
import { isTextUIPart, isToolUIPart, getToolName } from 'ai'
import ReactMarkdown from 'react-markdown'

import IconLoaderCircle from '~icons/lucide/loader-circle'
import IconCheck from '~icons/lucide/check'
import IconTriangleAlert from '~icons/lucide/triangle-alert'
import IconChevronDown from '~icons/lucide/chevron-down'

import type { UIDataTypes, UIMessage, UIMessagePart, UITools } from 'ai'

type ToolPart = Extract<UIMessagePart<UIDataTypes, UITools>, { toolCallId: string }>

function toolDisplayName(part: ToolPart): string {
  return getToolName(part)
    .replace(/^mcp__[^_]+__/, '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

function hasErrorOutput(part: ToolPart): boolean {
  return (
    part.state === 'output-available' &&
    typeof part.output === 'object' &&
    part.output !== null &&
    'error' in part.output
  )
}

function toolState(part: ToolPart): 'pending' | 'done' | 'error' {
  if (part.state === 'output-error' || hasErrorOutput(part)) return 'error'
  if (part.state === 'output-available') return 'done'
  return 'pending'
}

function partKey(part: UIMessagePart<UIDataTypes, UITools>, index: number): string {
  if ('toolCallId' in part) return part.toolCallId
  return `part-${index}`
}

interface ToolCallBlockProps {
  part: ToolPart
}

function ToolCallBlock({ part }: ToolCallBlockProps) {
  const [open, setOpen] = useState(false)
  const state = toolState(part)
  const isDone = state !== 'pending'

  return (
    <div className="rounded-lg border border-border bg-canvas p-2">
      <button
        className="flex w-full items-center gap-2 rounded px-1 py-0.5 hover:bg-hover"
        onClick={() => setOpen(!open)}
      >
        <div
          className={`flex size-4 items-center justify-center rounded-full ${
            state === 'pending'
              ? 'bg-accent/20 text-accent'
              : (state === 'done' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400')
          }`}
        >
          {state === 'pending'
            ? <IconLoaderCircle className="size-3 animate-spin" />
            : (state === 'done' ? <IconCheck className="size-3" /> : <IconTriangleAlert className="size-3" />)
          }
        </div>
        <span className="text-[11px] text-surface">{toolDisplayName(part)}</span>
        <span className="text-[10px] text-muted">
          {state === 'pending' ? 'Running…' : (state === 'done' ? 'Done' : 'Error')}
        </span>
        {isDone && (
          <IconChevronDown
            className={`ml-auto size-3 text-muted transition-transform ${open ? 'rotate-180' : ''}`}
          />
        )}
      </button>
      {isDone && open && (
        <pre className="mt-1 overflow-x-auto rounded bg-input p-2 text-[10px] text-muted">
          {(part.state === 'output-error' && part.errorText)
            ? part.errorText
            : (hasErrorOutput(part)
              ? (part.output as { error: string }).error
              : JSON.stringify(part.output, null, 2))}
        </pre>
      )}
    </div>
  )
}

interface ChatMessageProps {
  message: UIMessage
}

export function ChatMessage({ message }: ChatMessageProps) {
  return (
    <div
      data-test-id={`chat-message-${message.role}`}
      className={message.role === 'user' ? 'flex justify-end' : ''}
    >
      <div className={`min-w-0 space-y-1.5 ${message.role === 'user' ? 'max-w-[85%]' : ''}`}>
        {message.role === 'assistant' ? (
          message.parts.map((part, i) => {
            if (isToolUIPart(part)) {
              return <ToolCallBlock key={partKey(part, i)} part={part as ToolPart} />
            }
            if (isTextUIPart(part) && part.text) {
              return (
                <div
                  key={partKey(part, i)}
                  data-test-id="chat-text-bubble"
                  className="rounded-xl rounded-tl-md bg-hover px-3 py-2 text-xs leading-relaxed text-surface"
                >
                  <ReactMarkdown className="chat-markdown">{part.text}</ReactMarkdown>
                </div>
              )
            }
            return null
          })
        ) : (message.role === 'user' ? (
          <div
            data-test-id="chat-text-bubble"
            className="rounded-xl rounded-br-md bg-accent px-3 py-2 text-xs leading-relaxed whitespace-pre-wrap text-white"
          >
            {message.parts
              .filter(isTextUIPart)
              .map((p) => p.text)
              .join('')}
          </div>
        ) : null)}
      </div>
    </div>
  )
}
