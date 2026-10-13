import { useCallback, useState, useSyncExternalStore } from 'react'
import { ChevronDown, LoaderCircle } from 'lucide-react'

import {
  imageAttachmentsForMessage,
  subscribeImagePresentations,
  visibleUserMessageText
} from '#react/app/ai/attachment/image/presentation'
import {
  isTextPart,
  type ChatMessage,
  type ChatPlanPhase,
  type DesignPlanArtifacts
} from '#react/app/ai/chat/types'
import { lastNonEmptyLine } from '#react/app/skills/codegen-reply'
import { AgentTaskList } from '#react/components/chat/AgentTaskList'
import { ImageAttachment } from '#react/components/chat/attachment/image/ImageAttachment'
import {
  groupAssistantParts,
  ToolCallGroup
} from '#react/components/chat/tool-call-group'
import { useI18n } from '#react/i18n'

function mergeThinkingText(artifacts: DesignPlanArtifacts): string {
  return [artifacts.thinking, artifacts.plan, artifacts.steps]
    .map((part) => part.trim())
    .filter(Boolean)
    .join('\n\n')
}

export function ChatMessageView({
  message,
  streaming = false,
  canEdit = false,
  onEdit
}: {
  message: ChatMessage
  streaming?: boolean
  /** Idle last user turn (or any prior turn) may be pulled back into the composer. */
  canEdit?: boolean
  onEdit?: (messageId: string) => void
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
            {canEdit && onEdit ? (
              <div className="flex justify-end">
                <button
                  type="button"
                  data-test-id="chat-edit-message"
                  className="text-[10px] text-muted hover:text-surface"
                  onClick={() => onEdit(message.id)}
                >
                  {dialogs.editMessage}
                </button>
              </div>
            ) : null}
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
  const thinkingText = mergeThinkingText(artifacts)
  const hasThinking = Boolean(thinkingText)
  const thinkingActive = streaming && (phase === 'route' || phase === 'loading-skills')
  const agentTasks = message.agentTasks ?? []
  const partGroups = groupAssistantParts(message.parts)

  return (
    <div className="space-y-1.5">
      {hasThinking || agentTasks.length > 0 || thinkingActive ? (
        <>
          {thinkingText || thinkingActive ? (
            <CollapsedSection
              title={labels.thinking}
              text={thinkingText}
              active={thinkingActive && agentTasks.length === 0}
              emptyActiveLabel={
                phase === 'loading-skills' ? labels.loadingSkills : labels.thinking
              }
            />
          ) : null}
          {agentTasks.length > 0 ? <AgentTaskList tasks={agentTasks} /> : null}
          {message.selectedSkillKeys && message.selectedSkillKeys.length > 0 ? (
            <div className="px-1 text-[10px] text-muted">
              {labels.skillsUsed({ keys: message.selectedSkillKeys.join(', ') })}
            </div>
          ) : null}
        </>
      ) : null}

      {partGroups.map((group) => {
        if (group.kind === 'tools') {
          return (
            <ToolCallGroup
              key={group.key}
              tools={group.tools}
              runningLabel={labels.toolRunning}
              doneLabel={labels.toolFinished}
              errorLabel={labels.toolError}
            />
          )
        }
        return (
          <div
            key={group.key}
            data-test-id="chat-text-bubble"
            data-chat-markdown-mode={streaming ? 'streaming' : 'static'}
            className="rounded-xl rounded-tl-md bg-hover px-3 py-2 text-xs leading-relaxed whitespace-pre-wrap text-surface"
          >
            {group.text}
          </div>
        )
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
