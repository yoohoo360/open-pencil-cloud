import IconLucideCheck from '~icons/lucide/check'
import IconLucideChevronDown from '~icons/lucide/chevron-down'
import IconLucideLoaderCircle from '~icons/lucide/loader-circle'
import IconLucideTriangleAlert from '~icons/lucide/triangle-alert'
import { getToolName, isTextUIPart, isToolUIPart } from 'ai'
import { memo, useMemo, useState } from 'react'
import Markdown from 'react-markdown'

import type { UIDataTypes, UIMessage, UIMessagePart, UITools } from 'ai'
import type { JsonObject } from '@open-pencil/scene-graph/primitives'

export type ChatMessageProps = {
  message: UIMessage
}

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

const ToolCallPart = memo(function ToolCallPart({ part }: { part: ToolPart }) {
  const [open, setOpen] = useState(false)
  const state = toolState(part)

  return (
    <div className="rounded-lg border border-border bg-canvas p-2">
      <button
        type="button"
        className="flex w-full items-center gap-2 rounded px-1 py-0.5 hover:bg-hover"
        onClick={() => state !== 'pending' && setOpen((value) => !value)}
      >
        <div
          className={[
            'flex size-4 items-center justify-center rounded-full',
            state === 'pending'
              ? 'bg-accent/20 text-accent'
              : state === 'done'
                ? 'bg-green-500/20 text-green-400'
                : 'bg-red-500/20 text-red-400'
          ].join(' ')}
        >
          {state === 'pending' ? (
            <IconLucideLoaderCircle className="size-3 animate-spin" />
          ) : state === 'done' ? (
            <IconLucideCheck className="size-3" />
          ) : (
            <IconLucideTriangleAlert className="size-3" />
          )}
        </div>
        <span className="text-[11px] text-surface">{toolDisplayName(part)}</span>
        <span className="text-[10px] text-muted">
          {state === 'pending' ? 'Running…' : state === 'done' ? 'Done' : 'Error'}
        </span>
        {state !== 'pending' ? (
          <IconLucideChevronDown
            className={['ml-auto size-3 text-muted transition-transform', open ? 'rotate-180' : ''].join(' ')}
          />
        ) : null}
      </button>
      {state !== 'pending' && open ? (
        <pre className="mt-1 overflow-x-auto rounded bg-input p-2 text-[10px] text-muted">
          {part.state === 'output-error' && part.errorText
            ? part.errorText
            : hasErrorOutput(part)
              ? (part.output as { error: string }).error
              : JSON.stringify(part.output, null, 2)}
        </pre>
      ) : null}
    </div>
  )
})

ToolCallPart.displayName = 'ToolCallPart'

export const ChatMessage = memo(function ChatMessage({ message }: ChatMessageProps) {
  const userText = useMemo(
    () =>
      message.parts
        .filter(isTextUIPart)
        .map((part) => part.text)
        .join(''),
    [message.parts]
  )

  return (
    <div
      data-test-id={`chat-message-${message.role}`}
      className={message.role === 'user' ? 'flex justify-end' : ''}
    >
      <div className={`min-w-0 space-y-1.5 ${message.role === 'user' ? 'max-w-[85%]' : ''}`}>
        {message.role === 'assistant' ? (
          message.parts.map((part, index) => {
            if (isToolUIPart(part)) {
              return <ToolCallPart key={partKey(part, index)} part={part as ToolPart} />
            }
            if (isTextUIPart(part) && part.text) {
              return (
                <div
                  key={partKey(part, index)}
                  data-test-id="chat-text-bubble"
                  className="chat-markdown rounded-xl rounded-tl-md bg-hover px-3 py-2 text-xs leading-relaxed text-surface"
                >
                  <Markdown>{part.text}</Markdown>
                </div>
              )
            }
            return null
          })
        ) : message.role === 'user' ? (
          <div
            data-test-id="chat-text-bubble"
            className="rounded-xl rounded-br-md bg-accent px-3 py-2 text-xs leading-relaxed whitespace-pre-wrap text-white"
          >
            {userText}
          </div>
        ) : null}
      </div>
    </div>
  )
})

ChatMessage.displayName = 'ChatMessage'
export default ChatMessage
