import { useCallback, useEffect, useRef, useState } from 'react'
import { useStore } from '@nanostores/react'
import { ChevronDown, LoaderCircle, MessageCircle, Trash2 } from 'lucide-react'

import { isTextPart, type ChatStatus } from '#react/app/ai/chat/types'
import { useChatStickScroll } from '#react/app/ai/chat/use-stick-scroll'
import type { EditorStore } from '#react/app/editor/store'
import {
  chatRuntimeState,
  startChatRuntimeProbing,
  stopChatRuntimeProbing
} from '#react/app/ai/runtime/mode'
import {
  lastNonEmptyLine,
  parseCodegenReply,
  type CodegenArtifacts
} from '#react/app/skills/codegen-reply'
import {
  useCodegenChat,
  type CodegenChatMessage,
  type CodegenPhase
} from '#react/app/skills/use-codegen-chat'
import { AgentTaskList } from '#react/components/chat/AgentTaskList'
import { ChatInput } from '#react/components/chat/ChatInput'
import { ChatSkillPicker } from '#react/components/chat/ChatSkillPicker'
import { ProviderSetup } from '#react/components/chat/ProviderSetup'
import { AppButton } from '#react/components/ui/AppButton'
import { AppPlaceholder } from '#react/components/ui/AppPlaceholder'
import { useI18n } from '#react/i18n'

const STICK_BOTTOM_PX = 48

/** Full AI tab: plan + task graph; code applies via onArtifacts / optional Apply (no in-chat generate box). */
export function CodegenChat(props: {
  active: boolean
  store: EditorStore
  sourceLabel: string
  getBaselineCode: () => string | Promise<string>
  onArtifacts: (artifacts: CodegenArtifacts, phase: CodegenPhase) => void
  /** Apply finished code to the editor (no in-chat code preview / generate loading). */
  onApplyCode?: (code: string) => void
  skillScope?: 'design' | 'codegen' | 'make'
  /** Sent once when the chat becomes active and configured. */
  initialPrompt?: string
  title?: string
}) {
  const runtime = useStore(chatRuntimeState)

  useEffect(() => {
    startChatRuntimeProbing()
    return () => stopChatRuntimeProbing()
  }, [])

  return (
    <ClientCodegenChat
      {...props}
      preferAgentServerLabel={runtime.mode === 'agent-server'}
    />
  )
}

function ClientCodegenChat({
  active,
  store,
  sourceLabel,
  getBaselineCode,
  onArtifacts,
  onApplyCode,
  skillScope = 'codegen',
  initialPrompt,
  title,
  preferAgentServerLabel
}: {
  active: boolean
  store: EditorStore
  sourceLabel: string
  getBaselineCode: () => string | Promise<string>
  onArtifacts: (artifacts: CodegenArtifacts, phase: CodegenPhase) => void
  onApplyCode?: (code: string) => void
  skillScope?: 'design' | 'codegen' | 'make'
  initialPrompt?: string
  title?: string
  preferAgentServerLabel?: boolean
}) {
  const { panels, dialogs } = useI18n()
  const {
    isConfigured,
    messages,
    status,
    enabledSkills,
    skillsReady,
    sendMessage,
    stop,
    resetChat
  } = useCodegenChat({
    active,
    store,
    sourceLabel,
    getBaselineCode,
    onArtifacts,
    skillScope
  })

  return (
    <CodegenChatShell
      active={active}
      title={title}
      skillScope={skillScope}
      isConfigured={isConfigured}
      messages={messages}
      status={status}
      enabledSkills={enabledSkills}
      skillsReady={skillsReady}
      sendMessage={sendMessage}
      stop={stop}
      resetChat={resetChat}
      initialPrompt={initialPrompt}
      onApplyCode={onApplyCode}
      runtimeLabel={
        preferAgentServerLabel ? dialogs.chatRuntimeAgentServer : dialogs.chatRuntimeFetch
      }
      panels={panels}
    />
  )
}

function CodegenChatShell({
  active,
  title,
  skillScope,
  isConfigured,
  messages,
  status,
  enabledSkills,
  skillsReady,
  sendMessage,
  stop,
  resetChat,
  initialPrompt,
  onApplyCode,
  runtimeLabel,
  panels
}: {
  active: boolean
  title?: string
  skillScope: 'design' | 'codegen' | 'make'
  isConfigured: boolean
  messages: CodegenChatMessage[]
  status: ChatStatus
  enabledSkills: { length: number }
  skillsReady: boolean
  sendMessage: (text: string) => void | Promise<void>
  stop: () => void
  resetChat: () => void
  initialPrompt?: string
  onApplyCode?: (code: string) => void
  runtimeLabel: string
  panels: ReturnType<typeof useI18n>['panels']
}) {
  const initialPromptSent = useRef(false)
  const { scrollerRef, messagesEndRef, onScroll, resumeStick } = useChatStickScroll([
    messages,
    status
  ])

  const handleSubmit = useCallback(
    (text: string) => {
      resumeStick()
      void sendMessage(text)
    },
    [resumeStick, sendMessage]
  )

  useEffect(() => {
    if (!active || !isConfigured || !initialPrompt?.trim()) return
    if (initialPromptSent.current || messages.length > 0) return
    if (status === 'streaming' || status === 'submitted') return
    initialPromptSent.current = true
    resumeStick()
    void sendMessage(initialPrompt.trim())
  }, [active, initialPrompt, isConfigured, messages.length, resumeStick, sendMessage, status])

  if (!isConfigured) {
    return (
      <div data-test-id="code-panel-codegen-chat" className="flex min-h-0 flex-1 flex-col">
        <ProviderSetup />
      </div>
    )
  }

  return (
    <div data-test-id="code-panel-codegen-chat" className="flex min-h-0 flex-1 flex-col">
      <div className="flex h-8 shrink-0 items-center gap-1 border-b border-border px-2">
        <span className="min-w-0 flex-1 truncate text-[11px] font-medium text-muted">
          {title ?? panels.codegenChatTitle}
          <span className="ml-2 text-[10px] font-normal text-muted/80">{runtimeLabel}</span>
        </span>
        <ChatSkillPicker
          scope={skillScope}
          enabledCount={enabledSkills.length}
          ready={skillsReady}
        />
        {messages.length > 0 ? (
          <AppButton color="neutral" variant="ghost" size="xs" shape="square" onClick={resetChat}>
            <Trash2 className="size-3" />
          </AppButton>
        ) : null}
      </div>

      <div
        ref={scrollerRef}
        className="min-h-0 flex-1 overflow-y-auto px-2 py-2"
        onScroll={onScroll}
      >
        {messages.length === 0 ? (
          <AppPlaceholder
            data-test-id="codegen-chat-empty"
            label={panels.codegenChatEmpty}
            ui={{ root: 'h-full' }}
            icon={<MessageCircle className="size-4" />}
          />
        ) : (
          <div className="flex flex-col gap-3">
            {messages.map((message, index) => {
              const streaming =
                message.role === 'assistant' &&
                index === messages.length - 1 &&
                (status === 'submitted' || status === 'streaming')
              if (message.role === 'user') {
                return <CodegenUserBubble key={message.id} message={message} />
              }
              return (
                <CodegenAssistantBubble
                  key={message.id}
                  message={message}
                  streaming={streaming}
                  onApplyCode={onApplyCode}
                />
              )
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      <ChatInput
        status={status}
        onSubmit={(text) => handleSubmit(text)}
        onStop={stop}
        onError={() => {
          /* toast optional */
        }}
      />
    </div>
  )
}

function CodegenUserBubble({ message }: { message: CodegenChatMessage }) {
  const text = message.parts
    .filter(isTextPart)
    .map((part) => part.text)
    .join('\n')
  return (
    <div data-test-id="chat-message-user" className="flex justify-end">
      <div className="max-w-[85%] rounded-xl rounded-br-md bg-accent px-3 py-2 text-xs leading-relaxed whitespace-pre-wrap text-white">
        {text}
      </div>
    </div>
  )
}

function resolveArtifacts(message: CodegenChatMessage): CodegenArtifacts {
  if (message.artifacts) return message.artifacts
  const text = message.parts
    .filter(isTextPart)
    .map((part) => part.text)
    .join('\n')
  return parseCodegenReply(text, message.reasoning ?? '')
}

function CodegenAssistantBubble({
  message,
  streaming,
  onApplyCode
}: {
  message: CodegenChatMessage
  streaming: boolean
  onApplyCode?: (code: string) => void
}) {
  const { panels } = useI18n()
  const artifacts = resolveArtifacts(message)
  const phase: CodegenPhase = message.phase ?? (streaming ? 'route' : 'done')
  const text = message.parts
    .filter(isTextPart)
  const thinkingText = [artifacts.thinking, artifacts.plan, artifacts.steps]
    .map((part) => part.trim())
    .filter(Boolean)
    .join('\n\n')
  const agentTasks = message.agentTasks ?? []
  const hasStructure = Boolean(thinkingText) || agentTasks.length > 0
  const finishedCode = !streaming && phase === 'done' ? artifacts.code.trim() : ''

  const thinkingActive = streaming && (phase === 'route' || phase === 'loading-skills')

  if (!hasStructure && streaming) {
    return (
      <div data-test-id="chat-message-assistant" className="space-y-1.5">
        <CollapsedSection
          title={panels.codegenThinking}
          text=""
          active
          emptyActiveLabel={panels.codegenThinking}
        />
      </div>
    )
  }

  if (!hasStructure && text.trim()) {
    // Error / plain failure text
    return (
      <div data-test-id="chat-message-assistant">
        <div className="rounded-xl rounded-tl-md bg-hover px-3 py-2 text-xs leading-relaxed whitespace-pre-wrap text-surface">
          {text}
        </div>
      </div>
    )
  }

  return (
    <div data-test-id="chat-message-assistant" className="space-y-1.5">
      {thinkingText || thinkingActive ? (
        <CollapsedSection
          title={panels.codegenThinking}
          text={thinkingText}
          active={thinkingActive && agentTasks.length === 0}
          emptyActiveLabel={
            phase === 'loading-skills'
              ? panels.codegenLoadingSkills
              : panels.codegenThinking
          }
          active={stepsActive}
          emptyActiveLabel={panels.codeTabSteps}
        />
      ) : null}
      {agentTasks.length > 0 ? <AgentTaskList tasks={agentTasks} /> : null}
      {message.selectedSkillKeys && message.selectedSkillKeys.length > 0 ? (
        <div className="px-1 text-[10px] text-muted">
          {panels.codegenSkillsUsed({ keys: message.selectedSkillKeys.join(', ') })}
        </div>
      ) : null}
      {finishedCode && onApplyCode ? (
        <div className="flex justify-end px-1">
          <AppButton
            color="neutral"
            variant="ghost"
            size="xs"
            data-test-id="codegen-apply-code"
            onClick={() => onApplyCode(finishedCode)}
          >
            {panels.codeApplyGenerated}
          </AppButton>
        </div>
      ) : null}
    </div>
  )
}

/** Collapsed by default: title + last line (or animated … while active). */
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
      data-test-id="codegen-collapsed-section"
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
