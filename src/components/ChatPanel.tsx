import type { Chat } from '@ai-sdk/react'
import IconLucideBug from '~icons/lucide/bug'
import IconLucideCheck from '~icons/lucide/check'
import IconLucideClipboardCopy from '~icons/lucide/clipboard-copy'
import IconLucideMessageCircle from '~icons/lucide/message-circle'
import IconLucidePlay from '~icons/lucide/play'
import IconLucideTrash2 from '~icons/lucide/trash-2'
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'

import type { UIMessage } from 'ai'
import type { JsonObject } from '@open-pencil/scene-graph/primitives'
import { useI18n } from '@open-pencil/react'
import { useClipboard } from '#react/shared/dom/hooks'
import { getAcpDebugText, clearAcpDebugLog, hasAcpDebugEntries } from '@/app/ai/acp/transport'
import { copyChatLog } from '@/app/ai/debug'
import { clearToolLogEntries, didHitStepLimit } from '@/app/ai/tools'
import { useAIChat } from '@/app/ai/chat/use'
import { subscribe } from '@/app/tabs'
import { toast } from '@/app/shell/ui'
import AcpPermissionDialog from '@/components/chat/AcpPermissionDialog'
import ChatInput from '@/components/chat/ChatInput'
import ChatMessage from '@/components/chat/ChatMessage'
import ProviderSetup from '@/components/chat/ProviderSetup'
import AppTextButton from '@/components/ui/AppTextButton'
import { useVueRefValue } from '@/shared/useVueRefValue'

const IS_DEV = import.meta.env.DEV

function useChatRuntime(chat: Chat<UIMessage> | null) {
  const [messages, setMessages] = useState<UIMessage[]>(() => chat?.messages ?? [])
  const [status, setStatus] = useState(() => chat?.status ?? 'ready')
  const [error, setError] = useState<Error | undefined>(() => chat?.error)

  useEffect(() => {
    if (!chat) {
      setMessages([])
      setStatus('ready')
      setError(undefined)
      return
    }

    setMessages(chat.messages)
    setStatus(chat.status)
    setError(chat.error)

    const unsubMessages = chat['~registerMessagesCallback'](() => {
      setMessages([...chat.messages])
    })
    const unsubStatus = chat['~registerStatusCallback'](() => {
      setStatus(chat.status)
    })
    const unsubError = chat['~registerErrorCallback'](() => {
      setError(chat.error)
    })

    return () => {
      unsubMessages()
      unsubStatus()
      unsubError()
    }
  }, [chat])

  return { messages, status, error }
}

export const ChatPanel = memo(function ChatPanel() {
  const { isConfigured, ensureChat, resetChat } = useAIChat()
  const isConfiguredValue = useVueRefValue(isConfigured)
  const { copy } = useClipboard()
  const { dialogs } = useI18n()
  const [chat, setChat] = useState<Chat<UIMessage> | null>(null)
  const [debugCopied, setDebugCopied] = useState(false)
  const [acpLogCopied, setAcpLogCopied] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { messages, status, error } = useChatRuntime(chat)

  useEffect(() => {
    void ensureChat()
      .then((nextChat) => setChat(nextChat))
      .catch((err: unknown) => {
        toast.error(err instanceof Error ? err.message : 'Failed to initialize chat')
      })
  }, [ensureChat])

  useEffect(() => {
    if (error) toast.error(error.message)
  }, [error])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages])

  useEffect(() => {
    const unsub = subscribe(async () => {
      const nextChat = await ensureChat()
      setChat(nextChat)
    })
    return () => {
      unsub()
    }
  }, [ensureChat])

  const isThinking = useMemo(() => {
    if (status !== 'submitted' && status !== 'streaming') return false
    if (messages.length === 0) return true
    const last = messages[messages.length - 1]
    if (last.role !== 'assistant') return true
    const parts = last.parts
    if (parts.length === 0) return true
    const lastPart = parts[parts.length - 1] as JsonObject
    if (lastPart.type === 'step-start') return true
    if ('toolCallId' in lastPart && lastPart.state === 'output-available') return true
    if ('toolCallId' in lastPart && lastPart.state === 'output-error') return true
    return status === 'submitted'
  }, [messages, status])

  const showContinue = useMemo(() => {
    if (status !== 'ready') return false
    if (messages.length === 0) return false
    const last = messages[messages.length - 1]
    return last.role === 'assistant' && didHitStepLimit()
  }, [messages, status])

  const handleSubmit = useCallback(
    async (text: string) => {
      if (status === 'streaming' || status === 'submitted') return
      try {
        const nextChat = await ensureChat()
        if (nextChat) setChat(nextChat)
        nextChat?.sendMessage({ text }).catch((err: unknown) => {
          console.error('Chat error:', err)
          toast.error(err instanceof Error ? err.message : String(err))
        })
      } catch (err) {
        console.error('Failed to initialize chat:', err)
        toast.error(err instanceof Error ? err.message : String(err))
      }
    },
    [ensureChat, status]
  )

  const handleStop = useCallback(() => {
    chat?.stop()
  }, [chat])

  const handleCopyDebug = useCallback(async () => {
    await copyChatLog(messages)
    setDebugCopied(true)
    window.setTimeout(() => setDebugCopied(false), 1500)
  }, [messages])

  const handleCopyAcpLog = useCallback(async () => {
    const text = getAcpDebugText()
    if (!text) return
    await copy(text)
    setAcpLogCopied(true)
    window.setTimeout(() => setAcpLogCopied(false), 1500)
  }, [copy])

  const handleClearChat = useCallback(() => {
    setChat(null)
    resetChat()
    clearToolLogEntries()
    clearAcpDebugLog()
  }, [resetChat])

  if (!isConfiguredValue) {
    return (
      <div data-test-id="chat-panel" className="flex min-w-0 flex-1 flex-col overflow-hidden select-text">
        <ProviderSetup />
      </div>
    )
  }

  return (
    <div data-test-id="chat-panel" className="flex min-w-0 flex-1 flex-col overflow-hidden select-text">
      <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto px-3 py-3">
        {messages.length === 0 ? (
          <div
            data-test-id="chat-empty-state"
            className="flex h-full flex-col items-center justify-center gap-3 text-muted"
          >
            <IconLucideMessageCircle className="size-8 opacity-50" />
            <p className="text-center text-xs">{dialogs.describeCreateOrChange}</p>
          </div>
        ) : (
          <div data-test-id="chat-messages" className="flex flex-col gap-3">
            {messages.map((msg) => (
              <ChatMessage key={msg.id} message={msg} />
            ))}
            {isThinking ? (
              <div data-test-id="chat-typing-indicator" className="flex gap-2">
                <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted/20 text-[10px] font-bold text-muted">
                  AI
                </div>
                <div className="flex items-center gap-1 py-2">
                  <span className="size-1.5 animate-bounce rounded-full bg-muted" style={{ animationDelay: '0ms' }} />
                  <span className="size-1.5 animate-bounce rounded-full bg-muted" style={{ animationDelay: '150ms' }} />
                  <span className="size-1.5 animate-bounce rounded-full bg-muted" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            ) : null}
            {showContinue ? (
              <div className="flex justify-center py-2">
                <button
                  type="button"
                  className="flex items-center gap-1.5 rounded-full bg-accent/10 px-4 py-1.5 text-xs font-medium text-accent transition-colors hover:bg-accent/20"
                  onClick={() => void handleSubmit('Continue where you left off')}
                >
                  <IconLucidePlay className="size-3" />
                  Continue
                </button>
              </div>
            ) : null}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {messages.length > 0 ? (
        <div className="flex shrink-0 items-center gap-1 border-t border-border px-3 py-1">
          {IS_DEV ? (
            <AppTextButton
              ui={{ base: 'flex items-center gap-1 rounded px-1.5 py-0.5 hover:bg-hover' }}
              onClick={() => void handleCopyDebug()}
            >
              {!debugCopied ? <IconLucideClipboardCopy className="size-3" /> : <IconLucideCheck className="size-3 text-green-400" />}
              {debugCopied ? 'Copied' : 'Copy log'}
            </AppTextButton>
          ) : null}
          {IS_DEV && hasAcpDebugEntries() ? (
            <AppTextButton
              ui={{ base: 'flex items-center gap-1 rounded px-1.5 py-0.5 hover:bg-hover' }}
              onClick={() => void handleCopyAcpLog()}
            >
              {!acpLogCopied ? <IconLucideBug className="size-3" /> : <IconLucideCheck className="size-3 text-green-400" />}
              {acpLogCopied ? 'Copied' : 'ACP log'}
            </AppTextButton>
          ) : null}
          <AppTextButton
            ui={{ base: 'flex items-center gap-1 rounded px-1.5 py-0.5 hover:bg-hover' }}
            onClick={handleClearChat}
          >
            <IconLucideTrash2 className="size-3" />
            Clear
          </AppTextButton>
        </div>
      ) : null}

      <ChatInput status={status} onSubmit={handleSubmit} onStop={handleStop} />
      <AcpPermissionDialog />
    </div>
  )
})

ChatPanel.displayName = 'ChatPanel'
export default ChatPanel
