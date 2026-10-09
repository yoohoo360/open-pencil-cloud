import { useCallback, useState, useSyncExternalStore } from 'react'
import { Check, ChevronDown, LoaderCircle, TriangleAlert } from 'lucide-react'

import {
  imageAttachmentsForMessage,
  subscribeImagePresentations,
  visibleUserMessageText
} from '#react/app/ai/attachment/image/presentation'
import {
  isTextPart,
  isToolPart,
  type ChatMessage,
  type ChatPlanPhase,
  type DesignPlanArtifacts
} from '#react/app/ai/chat/types'
import { lastNonEmptyLine } from '#react/app/skills/codegen-reply'
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
  const { dialogs, panels } = useI18n()
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
        {message.role === 'assistant' ? (
          <DesignAssistantBody
            message={message}
            streaming={streaming}
            labels={{
              thinking: panels.codegenThinking,
              thought: panels.codegenThought,
              plan: panels.codeTabPlan,
              steps: panels.codeTabSteps,
              loadingSkills: panels.codegenLoadingSkills,
              skillsUsed: panels.codegenSkillsUsed,
              toolRunning: dialogs.toolRunning,
              toolFinished: dialogs.toolFinished,
              toolError: dialogs.toolError
            }}
          />
        ) : null}

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

function DesignAssistantBody({
  message,
  streaming,
  labels
}: {
  message: ChatMessage
  streaming: boolean
  labels: {
    thinking: string
    thought: string
    plan: string
    steps: string
    loadingSkills: string
    skillsUsed: (params: { keys: string }) => string
    toolRunning: string
    toolFinished: string
    toolError: string
  }
}) {
  const artifacts: DesignPlanArtifacts = message.planArtifacts ?? {
    thinking: '',
    plan: '',
    steps: ''
  }
  const phase: ChatPlanPhase = message.phase ?? (streaming ? 'route' : 'done')
  const hasPlan =
    Boolean(artifacts.thinking.trim()) ||
    Boolean(artifacts.plan.trim()) ||
    Boolean(artifacts.steps.trim())
  const thinkingActive = streaming && (phase === 'route' || !artifacts.plan.trim())
  const planActive =
    streaming && (phase === 'route' || phase === 'loading-skills' || phase === 'execute')
  const stepsActive = streaming && phase === 'route'

  return (
    <div className="space-y-1.5">
      {hasPlan || (streaming && phase === 'route') ? (
        <>
          {artifacts.thinking.trim() || thinkingActive ? (
            <CollapsedSection
              title={thinkingActive ? labels.thinking : labels.thought}
              text={artifacts.thinking}
              active={thinkingActive}
              emptyActiveLabel={labels.thinking}
            />
          ) : null}
          {artifacts.plan.trim() || planActive ? (
            <CollapsedSection
              title={labels.plan}
              text={artifacts.plan}
              active={planActive}
              emptyActiveLabel={
                phase === 'loading-skills' ? labels.loadingSkills : labels.plan
              }
            />
          ) : null}
          {artifacts.steps.trim() || stepsActive ? (
            <CollapsedSection
              title={labels.steps}
              text={artifacts.steps}
              active={stepsActive}
              emptyActiveLabel={labels.steps}
            />
          ) : null}
          {message.selectedSkillKeys && message.selectedSkillKeys.length > 0 ? (
            <div className="px-1 text-[10px] text-muted">
              {labels.skillsUsed({ keys: message.selectedSkillKeys.join(', ') })}
            </div>
          ) : null}
        </>
      ) : null}

      {message.parts.map((part, index) => {
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
              runningLabel={labels.toolRunning}
              doneLabel={labels.toolFinished}
              errorLabel={labels.toolError}
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
      })}
    </div>
  )
}

function CollapsedSection({
  title,
  text,
  active = false,
  emptyActiveLabel
}: {
  title: string
  text: string
  active?: boolean
  emptyActiveLabel?: string
}) {
  const [open, setOpen] = useState(false)
  const preview = lastNonEmptyLine(text)

  return (
    <div
      data-test-id="design-collapsed-section"
      className="overflow-hidden rounded-lg border border-border/80 bg-panel"
    >
      <button
        type="button"
        className="flex w-full items-start gap-2 px-2.5 py-1.5 text-left hover:bg-hover"
        onClick={() => setOpen((value) => !value)}
      >
        {active ? (
          <LoaderCircle className="mt-0.5 size-3 shrink-0 animate-spin text-muted" />
        ) : (
          <ChevronDown
            className={`mt-0.5 size-3 shrink-0 text-muted transition-transform ${open ? 'rotate-180' : ''}`}
          />
        )}
        <span className="min-w-0 flex-1">
          <span className="block text-[11px] font-medium text-muted">
            {title}
            {active ? (
              <span className="ml-1 font-normal">
                <AnimatedEllipsis />
              </span>
            ) : null}
          </span>
          {!open ? (
            <span className="mt-0.5 block truncate text-[11px] text-surface/80">
              {preview || (active ? emptyActiveLabel : '')}
              {active && preview ? (
                <span className="ml-0.5">
                  <AnimatedEllipsis />
                </span>
              ) : null}
            </span>
          ) : null}
        </span>
      </button>
      {open && text.trim() ? (
        <div className="border-t border-border/60 px-2.5 py-2">
          <pre className="m-0 whitespace-pre-wrap font-sans text-[11px] leading-relaxed text-muted">
            {text}
            {active ? (
              <span className="ml-0.5">
                <AnimatedEllipsis />
              </span>
            ) : null}
          </pre>
        </div>
      ) : null}
    </div>
  )
}

function AnimatedEllipsis() {
  return (
    <span className="inline-flex gap-px text-[11px] text-muted" aria-hidden>
      <span className="animate-bounce [animation-delay:0ms]">.</span>
      <span className="animate-bounce [animation-delay:150ms]">.</span>
      <span className="animate-bounce [animation-delay:300ms]">.</span>
    </span>
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
