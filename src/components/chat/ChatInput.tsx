import { useState } from 'react'
import { useStore } from '@nanostores/react'

import IconBot from '~icons/lucide/bot'
import IconSend from '~icons/lucide/send'
import IconSquare from '~icons/lucide/square'

import { useI18n } from '@open-pencil/react'
import { ACP_AGENTS } from '@open-pencil/core/constants'
import { ProviderModelSelect } from '@/components/chat/ProviderModelSelect'
import { ProviderSettings } from '@/components/chat/ProviderSettings/ProviderSettings'
import { AppInput } from '@/components/ui/AppInput'
import { Tip } from '@/components/ui/Tip'
import { useButtonUI } from '@/components/ui/button'
import { useAIChat } from '@/app/ai/chat/use'

interface ChatInputProps {
  status: 'ready' | 'submitted' | 'streaming' | 'error'
  onSubmit?: (text: string) => void
  onStop?: () => void
}

export function ChatInput({ status, onSubmit, onStop }: ChatInputProps) {
  const { providerID, providerDef, modelID, customModelID } = useAIChat()
  const { dialogs } = useI18n()
  const [input, setInput] = useState('')

  const currentProviderID = useStore(providerID)
  const currentProviderDef = useStore(providerDef) as {
    models: Array<{ id: string; name: string }>
    supportsCustomModel?: boolean
    name?: string
  }
  const currentModelID = useStore(modelID)
  const currentCustomModelID = useStore(customModelID)

  const isStreaming = status === 'streaming' || status === 'submitted'
  const isACPProvider = currentProviderID.startsWith('acp:')
  const acpAgentName = ACP_AGENTS.find((a) => a.id === currentProviderID.replace('acp:', ''))?.name ?? currentProviderID.replace('acp:', '')
  const isCustomProvider = currentProviderID === 'openai-compatible' || currentProviderID === 'anthropic-compatible'
  const customModelName = currentCustomModelID.trim()
  const usesCustomModel = !!(currentProviderDef.supportsCustomModel && customModelName)
  const selectedModelName = usesCustomModel
    ? customModelName
    : (isCustomProvider
      ? 'No model'
      : (currentProviderDef.models.find((m) => m.id === currentModelID)?.name ?? currentModelID))

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const text = input.trim()
    if (!text) return
    onSubmit?.(text)
    setInput('')
  }

  const stopButtonCls = useButtonUI({
    tone: 'ghost',
    shape: 'rounded',
    size: 'sm',
    ui: { base: 'shrink-0 border border-border px-2 py-1.5' }
  })

  const sendButtonCls = useButtonUI({
    tone: 'accent',
    shape: 'rounded',
    size: 'sm',
    ui: { base: 'shrink-0 px-2.5 py-1.5 font-medium' }
  })

  return (
    <div className="shrink-0 border-t border-border px-3 py-2">
      <div className="mb-1.5 flex items-center gap-1">
        {isACPProvider ? (
          <div className="flex items-center gap-1 px-1.5 py-0.5 text-[10px] text-muted">
            <IconBot className="size-3" />
            {acpAgentName}
          </div>
        ) : ((isCustomProvider || usesCustomModel) ? (
          <div className="flex items-center gap-1 px-1.5 py-0.5 text-[10px] text-muted" data-test-id="chat-custom-model-label">
            <IconBot className="size-3" />
            {selectedModelName}
          </div>
        ) : (
          <ProviderModelSelect>
            {selectedModelName}
          </ProviderModelSelect>
        ))}
        <div className="ml-auto">
          <ProviderSettings />
        </div>
      </div>

      <form className="flex gap-1.5" onSubmit={handleSubmit}>
        <AppInput
          value={input}
          data-test-id="chat-input"
          placeholder={dialogs.describeChange}
          className="min-w-0 flex-1 placeholder:text-muted"
          disabled={isStreaming}
          onChange={(e) => setInput(e.target.value)}
          onFocus={(e) => { e.stopPropagation() }}
        />
        {isStreaming ? (
          <Tip label={dialogs.stopGenerating}>
            <button
              type="button"
              data-test-id="chat-stop-button"
              className={stopButtonCls.base}
              onClick={onStop}
            >
              <IconSquare className="size-3" />
            </button>
          </Tip>
        ) : (
          <Tip label={dialogs.sendMessage}>
            <button
              type="submit"
              data-test-id="chat-send-button"
              className={sendButtonCls.base}
              disabled={!input.trim()}
            >
              <IconSend className="size-3" />
            </button>
          </Tip>
        )}
      </form>
    </div>
  )
}
