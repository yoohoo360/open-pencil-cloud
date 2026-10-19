import { useEffect, useState } from 'react'
import { useStore } from '@nanostores/react'
import { Check, ClipboardCopy, MessageCircle, Trash2 } from 'lucide-react'

import { useAIChat } from '#react/app/ai/chat/use'
import { useChatStickScroll } from '#react/app/ai/chat/use-stick-scroll'
import { chatRuntimeState } from '#react/app/ai/runtime/mode'
import { useActionToast } from '#react/app/shell/toast/action'
import { ChatInput } from '#react/components/chat/ChatInput'
import { ChatMessageView } from '#react/components/chat/ChatMessage'
import { ChatSkillPicker } from '#react/components/chat/ChatSkillPicker'
import { ProviderSetup } from '#react/components/chat/ProviderSetup'
import { AppButton } from '#react/components/ui/AppButton'
import { AppPlaceholder } from '#react/components/ui/AppPlaceholder'
import { useI18n } from '#react/i18n'
import type { JSONObject } from '@open-pencil/scene-graph/primitives'

const IS_DEV = import.meta.env.DEV

/**
 * Agent Server probe only gates the runtime badge (checked when sending).
 * Design intelligence always runs through the client harness.
 */
export function ChatPanel() {
  const runtime = useStore(chatRuntimeState)
  const {
    isConfigured,
    messages,
    status,
    chatFailure,
    clearChatFailure,
    enabledSkills,
    skillsReady,
    sendMessage,
    stopAndEdit,
    composerSeed,
    resetChat
  } = useAIChat()
  const runtimeMode = runtime.mode
  const { dialogs } = useI18n()
  const { showActionToast } = useActionToast()
  const [debugCopied, setDebugCopied] = useState(false)
  const idle = status === 'ready' || status === 'error'

  const failureMessage =
    chatFailure?.reason === 'insufficient-credit'
      ? dialogs.chatInsufficientCredit
      : chatFailure?.reason === 'output-limit'
        ? dialogs.chatOutputLimit
        : chatFailure?.reason === 'vision-unsupported'
          ? dialogs.chatVisionUnsupported
          : chatFailure?.reason === 'request-failed'
            ? dialogs.chatRequestFailed
            : null

  function isStreamingMessage(index: number) {
    const message = messages[index]
    return (
      message?.role === 'assistant' &&
      index === messages.length - 1 &&
      (status === 'submitted' || status === 'streaming')
    )
  }

  const isThinking = (() => {
    if (status !== 'submitted' && status !== 'streaming') return false
    if (messages.length === 0) return true
    const last = messages[messages.length - 1]
    if (last.role !== 'assistant') return true
    const plan = last.planArtifacts
    const hasPlan =
      Boolean(plan?.thinking?.trim()) ||
      Boolean(plan?.plan?.trim()) ||
      Boolean(plan?.steps?.trim()) ||
      last.phase === 'route' ||
      last.phase === 'loading-skills'
    const parts = last.parts
    const hasVisibleText = parts.some((part) => part.type === 'text' && part.text.length > 0)
    const hasTools = parts.some((part) => part.type === 'tool')
    if (hasPlan || hasVisibleText || hasTools) {
      if (parts.length === 0) return false
      const lastPart = parts[parts.length - 1] as JSONObject
      if (lastPart?.type === 'step-start') return true
      if ('toolCallId' in lastPart && lastPart.state === 'output-available') return true
      if ('toolCallId' in lastPart && lastPart.state === 'output-error') return true
    }
    return true
  })()

  const { scrollerRef, messagesEndRef, onScroll, resumeStick } = useChatStickScroll([
    messages,
    isThinking
  ])

  useEffect(() => {
    if (!chatFailure?.reason) return
    showActionToast(failureMessage ?? dialogs.chatRequestFailed)
  }, [chatFailure?.reason, dialogs.chatRequestFailed, failureMessage, showActionToast])

  async function handleSubmit(text: string, images: Parameters<typeof sendMessage>[1] = []) {
    if (status === 'streaming' || status === 'submitted') return
    resumeStick()
    clearChatFailure()
    try {
      await sendMessage(text, images)
    } catch {
      showActionToast(dialogs.chatRequestFailed)
    }
  }

  async function handleCopyDebug() {
    const text = JSON.stringify(messages, null, 2)
    await navigator.clipboard.writeText(text)
    setDebugCopied(true)
    setTimeout(() => setDebugCopied(false), 1500)
  }

  const modeLabel =
    runtimeMode === 'agent-server' ? dialogs.chatRuntimeAgentServer : dialogs.chatRuntimeFetch

  return (
    <div data-test-id="chat-panel" className="flex min-w-0 flex-1 flex-col overflow-hidden select-text">
      {!isConfigured ? (
        <ProviderSetup />
      ) : (
        <>
          <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border px-3 py-1.5">
            <div className="min-w-0">
              <span className="truncate text-[11px] text-muted">{dialogs.chatPrototypeTitle}</span>
              <span
                data-test-id="chat-runtime-mode"
                className="ml-2 truncate text-[10px] text-muted/80"
              >
                {modeLabel}
              </span>
            </div>
            <ChatSkillPicker
              scope="design"
              enabledCount={enabledSkills.length}
              ready={skillsReady}
            />
          </div>
          <div
            ref={scrollerRef}
            className="min-h-0 flex-1 overflow-y-auto px-3 py-3"
            onScroll={onScroll}
          >
            {messages.length === 0 ? (
              <AppPlaceholder
                data-test-id="chat-empty-state"
                label={dialogs.describeCreateOrChange}
                ui={{ root: 'h-full' }}
                icon={<MessageCircle className="size-5" />}
              />
            ) : (
              <div data-test-id="chat-messages" className="flex flex-col gap-3">
                {messages.map((message, index) => (
                  <ChatMessageView
                    key={message.id}
                    message={message}
                    streaming={isStreamingMessage(index)}
                    canEdit={idle && message.role === 'user'}
                    onEdit={(messageId) => stopAndEdit(messageId)}
                  />
                ))}
                {isThinking ? (
                  <div data-test-id="chat-typing-indicator" className="flex gap-2">
                    <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted/20 text-[10px] font-bold text-muted">
                      AI
                    </div>
                    <div className="flex items-center gap-1 py-2">
                      <span className="size-1.5 animate-bounce rounded-full bg-muted" />
                      <span className="size-1.5 animate-bounce rounded-full bg-muted [animation-delay:150ms]" />
                      <span className="size-1.5 animate-bounce rounded-full bg-muted [animation-delay:300ms]" />
                    </div>
                  </div>
                ) : null}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {messages.length > 0 ? (
            <div className="flex shrink-0 items-center gap-1 border-t border-border px-3 py-1">
              {IS_DEV ? (
                <AppButton color="neutral" variant="ghost" size="xs" onClick={() => void handleCopyDebug()}>
                  {debugCopied ? <Check className="size-3 text-green-400" /> : <ClipboardCopy className="size-3" />}
                  {debugCopied ? 'Copied' : 'Copy log'}
                </AppButton>
              ) : null}
              <AppButton color="error" variant="ghost" size="xs" onClick={() => void resetChat()}>
                <Trash2 className="size-3" />
                Clear
              </AppButton>
            </div>
          ) : null}

          <ChatInput
            status={status}
            onSubmit={(text, images) => void handleSubmit(text, images)}
            onStop={() => stopAndEdit()}
            onError={showActionToast}
            seedKey={composerSeed?.key}
            seedText={composerSeed?.text}
          />
        </>
      )}
    </div>
  )
}
