import { useCallback, useEffect, useRef, useState } from 'react'
import { Check, ChevronDown, Copy, LoaderCircle, MessageCircle, Trash2 } from 'lucide-react'

import { isTextPart } from '#react/app/ai/chat/types'
import type { EditorStore } from '#react/app/editor/store'
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
import { ChatInput } from '#react/components/chat/ChatInput'
import { ChatSkillPicker } from '#react/components/chat/ChatSkillPicker'
import { ProviderSetup } from '#react/components/chat/ProviderSetup'
import { AppButton } from '#react/components/ui/AppButton'
import { AppPlaceholder } from '#react/components/ui/AppPlaceholder'
import { useI18n } from '#react/i18n'

async function copyText(text: string) {
  if (typeof navigator === 'undefined' || !navigator.clipboard?.writeText) return
  await navigator.clipboard.writeText(text)
}

const STICK_BOTTOM_PX = 48

/** Full AI tab: structured artifacts; code box is code-only; think/plan animate with …. */
export function CodegenChat({
  active,
  store,
  sourceLabel,
  getBaselineCode,
  onArtifacts,
  onApplyCode
}: {
  active: boolean
  store: EditorStore
  sourceLabel: string
  getBaselineCode: () => string
  onArtifacts: (artifacts: CodegenArtifacts) => void
  onApplyCode?: (code: string) => void
}) {
  const { panels } = useI18n()
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
    onArtifacts
  })
  const scrollerRef = useRef<HTMLDivElement>(null)
  const messagesEnd = useRef<HTMLDivElement>(null)
  const stickToBottom = useRef(true)

  const updateStick = useCallback(() => {
    const el = scrollerRef.current
    if (!el) return
    stickToBottom.current =
      el.scrollHeight - el.scrollTop - el.clientHeight <= STICK_BOTTOM_PX
  }, [])

  useEffect(() => {
    if (!stickToBottom.current) return
    messagesEnd.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages, status])

  const handleSubmit = useCallback(
    (text: string) => {
      stickToBottom.current = true
      void sendMessage(text)
    },
    [sendMessage]
  )

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
          {panels.codegenChatTitle}
        </span>
        <ChatSkillPicker
          scope="codegen"
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
        onScroll={updateStick}
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
            <div ref={messagesEnd} />
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
    .map((part) => part.text)
    .join('\n')
  const hasStructure =
    Boolean(artifacts.thinking.trim()) ||
    Boolean(artifacts.plan.trim()) ||
    Boolean(artifacts.steps.trim()) ||
    Boolean(artifacts.code.trim())
  const [copied, setCopied] = useState(false)

  const thinkingActive = streaming && (phase === 'route' || !artifacts.plan.trim())
  const planActive =
    streaming && (phase === 'route' || phase === 'loading-skills' || phase === 'generate')
  const stepsActive = streaming && phase === 'route'
  const codeActive = streaming && phase === 'generate'

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
      {artifacts.thinking.trim() || thinkingActive ? (
        <CollapsedSection
          title={thinkingActive ? panels.codegenThinking : panels.codegenThought}
          text={artifacts.thinking}
          active={thinkingActive}
          emptyActiveLabel={panels.codegenThinking}
        />
      ) : null}
      {artifacts.plan.trim() || planActive ? (
        <CollapsedSection
          title={panels.codeTabPlan}
          text={artifacts.plan}
          active={planActive && phase !== 'done'}
          emptyActiveLabel={
            phase === 'loading-skills'
              ? panels.codegenLoadingSkills
              : panels.codeTabPlan
          }
        />
      ) : null}
      {artifacts.steps.trim() || stepsActive ? (
        <CollapsedSection
          title={panels.codeTabSteps}
          text={artifacts.steps}
          active={stepsActive}
          emptyActiveLabel={panels.codeTabSteps}
        />
      ) : null}
      {message.selectedSkillKeys && message.selectedSkillKeys.length > 0 ? (
        <div className="px-1 text-[10px] text-muted">
          {panels.codegenSkillsUsed({ keys: message.selectedSkillKeys.join(', ') })}
        </div>
      ) : null}
      {artifacts.code.trim() || codeActive ? (
        <div className="overflow-hidden rounded-lg border border-border bg-canvas">
          <div className="flex h-7 items-center gap-1 border-b border-border px-2">
            <span className="min-w-0 flex-1 truncate text-[10px] font-medium text-muted">
              {panels.codeTabGenerated}
              {codeActive ? (
                <span className="ml-1 font-normal">
                  <AnimatedEllipsis />
                </span>
              ) : null}
            </span>
            {artifacts.code.trim() ? (
              <>
                <AppButton
                  color="neutral"
                  variant="ghost"
                  size="xs"
                  shape="square"
                  onClick={() => {
                    void copyText(artifacts.code).then(() => {
                      setCopied(true)
                      setTimeout(() => setCopied(false), 2000)
                    })
                  }}
                >
                  {copied ? (
                    <Check className="size-3 text-[var(--color-success)]" />
                  ) : (
                    <Copy className="size-3" />
                  )}
                </AppButton>
                {onApplyCode ? (
                  <AppButton
                    color="neutral"
                    variant="ghost"
                    size="xs"
                    data-test-id="codegen-apply-code"
                    onClick={() => onApplyCode(artifacts.code)}
                  >
                    {panels.codeApplyGenerated}
                  </AppButton>
                ) : null}
              </>
            ) : null}
          </div>
          <pre className="m-0 max-h-64 overflow-auto px-2 py-2 font-mono text-[10px] leading-relaxed whitespace-pre text-surface">
            {artifacts.code.trim() ? (
              artifacts.code
            ) : (
              <span className="text-muted">
                {panels.generatingCode}
                <AnimatedEllipsis />
              </span>
            )}
          </pre>
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
