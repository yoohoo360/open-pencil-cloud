import { useCallback, useState, useSyncExternalStore } from 'react'
import { Check, ChevronDown, LoaderCircle, TriangleAlert } from 'lucide-react'

import {
  imageAttachmentsForMessage,
  subscribeImagePresentations,
  visibleUserMessageText
} from '#react/app/ai/attachment/image/presentation'
import { isTextPart, isToolPart, type ChatMessage } from '#react/app/ai/chat/types'
import { ImageAttachment } from '#react/components/chat/attachment/image/ImageAttachment'
import { classifyToolState } from '#react/components/chat/tool-state'
import { useI18n } from '#react/i18n'

export function ChatMessageView({
  message,
  streaming = false
}: {
  message: ChatMessage
  streaming?: boolean
}) {
  const { dialogs } = useI18n()
  const getAttachments = useCallback(() => imageAttachmentsForMessage(message.id), [message.id])
  const attachments = useSyncExternalStore(
    subscribeImagePresentations,
    getAttachments,
    getAttachments
  )

  return (
    <div
      data-test-id={`chat-message-${message.role}`}
      className={message.role === 'user' ? 'flex justify-end' : undefined}
    >
      <div
        className={`min-w-0 space-y-2 select-text ${message.role === 'user' ? 'max-w-[85%]' : ''}`}
      >
        {message.role === 'assistant'
          ? message.parts.map((part, index) => {
              if (isToolPart(part)) {
                const state = classifyToolState({
                  toolName: part.toolName,
                  state: part.state,
                  output: part.output
                })
                return (
                  <ToolCallCard
                    key={part.toolCallId}
                    name={toolDisplayName(part.toolName)}
                    state={state}
                    runningLabel={dialogs.toolRunning}
                    doneLabel={dialogs.toolFinished}
                    errorLabel={dialogs.toolError}
                    output={
                      part.state === 'output-error' && part.errorText
                        ? part.errorText
                        : JSON.stringify(part.output, null, 2)
                    }
                  />
                )
              }
              if (isTextPart(part) && part.text) {
                return (
                  <div
                    key={`part-${index}`}
                    data-test-id="chat-text-bubble"
                    data-chat-markdown-mode={streaming ? 'streaming' : 'static'}
                    className="rounded-xl rounded-tl-md bg-hover px-3 py-2 text-xs leading-relaxed whitespace-pre-wrap text-surface"
                  >
                    {part.text}
                  </div>
                )
              }
              return null
            })
          : null}

        {message.role === 'user' ? (
          <>
            {attachments.length > 0 ? (
              <div className="flex flex-wrap justify-end gap-1.5">
                {attachments.map((attachment) => (
                  <ImageAttachment key={attachment.id} attachment={attachment} />
                ))}
              </div>
            ) : null}
            <div
              data-test-id="chat-text-bubble"
              className="rounded-xl rounded-br-md bg-accent px-3 py-2 text-xs leading-relaxed whitespace-pre-wrap text-white"
            >
              {visibleUserMessageText(
                message.id,
                message.parts.filter(isTextPart).map((part) => part.text).join('')
              )}
            </div>
          </>
        ) : null}
      </div>
    </div>
  )
}

function toolDisplayName(name: string) {
  return name
    .replace(/^mcp__[^_]+__/, '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

function ToolCallCard({
  name,
  state,
  runningLabel,
  doneLabel,
  errorLabel,
  output
}: {
  name: string
  state: 'pending' | 'done' | 'error'
  runningLabel: string
  doneLabel: string
  errorLabel: string
  output: string
}) {
  const [open, setOpen] = useState(false)
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
