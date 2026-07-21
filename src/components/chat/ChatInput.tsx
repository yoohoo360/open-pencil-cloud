import IconLucideBot from '~icons/lucide/bot'
import IconLucideSend from '~icons/lucide/send'
import IconLucideSquare from '~icons/lucide/square'
import * as Tooltip from '@radix-ui/react-tooltip'
import { memo, useMemo, useState } from 'react'

import { ACP_AGENTS } from '@open-pencil/core/constants'
import { useI18n } from '@open-pencil/react'
import { useAIChat } from '@/app/ai/chat/use'
import ProviderModelSelect from '@/components/chat/ProviderModelSelect'
import ProviderSettings from '@/components/chat/ProviderSettings/ProviderSettings'
import AppInput from '@/components/ui/AppInput'
import Tip from '@/components/ui/Tip'
import { useButtonUI } from '@/components/ui/button'
import { useVueRefValue } from '@/shared/useVueRefValue'

export type ChatInputProps = {
  status: 'ready' | 'submitted' | 'streaming' | 'error'
  onSubmit: (text: string) => void
  onStop: () => void
}

export const ChatInput = memo(function ChatInput({ status, onSubmit, onStop }: ChatInputProps) {
  const {
    providerID: providerIDRef,
    providerDef: providerDefRef,
    modelID: modelIDRef,
    customModelID: customModelIDRef
  } = useAIChat()
  const providerID = useVueRefValue(providerIDRef)
  const providerDef = useVueRefValue(providerDefRef)
  const modelID = useVueRefValue(modelIDRef)
  const customModelID = useVueRefValue(customModelIDRef)
  const { dialogs } = useI18n()
  const [input, setInput] = useState('')

  const isStreaming = status === 'streaming' || status === 'submitted'
  const isACPProvider = providerID.startsWith('acp:')
  const acpAgentName = useMemo(() => {
    const agentId = providerID.replace('acp:', '')
    return ACP_AGENTS.find((a) => a.id === agentId)?.name ?? agentId
  }, [providerID])
  const isCustomProvider =
    providerID === 'openai-compatible' || providerID === 'anthropic-compatible'
  const stopButton = useButtonUI({
    tone: 'ghost',
    shape: 'rounded',
    size: 'sm',
    ui: { base: 'shrink-0 border border-border px-2 py-1.5' }
  })
  const sendButton = useButtonUI({
    tone: 'accent',
    shape: 'rounded',
    size: 'sm',
    ui: { base: 'shrink-0 px-2.5 py-1.5 font-medium' }
  })
  const customModelName = customModelID.trim()
  const usesCustomModel = !!providerDef.supportsCustomModel && !!customModelName

  const selectedModelName = useMemo(() => {
    if (usesCustomModel) return customModelName
    if (isCustomProvider) return 'No model'
    return providerDef.models.find((m) => m.id === modelID)?.name ?? modelID
  }, [customModelName, isCustomProvider, modelID, providerDef.models, usesCustomModel])

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    const text = input.trim()
    if (!text) return
    onSubmit(text)
    setInput('')
  }

  return (
    <Tooltip.Provider>
      <div className="shrink-0 border-t border-border px-3 py-2">
        <div className="mb-1.5 flex items-center gap-1">
          {isACPProvider ? (
            <div className="flex items-center gap-1 px-1.5 py-0.5 text-[10px] text-muted">
              <IconLucideBot className="size-3" />
              {acpAgentName}
            </div>
          ) : isCustomProvider || usesCustomModel ? (
            <div
              className="flex items-center gap-1 px-1.5 py-0.5 text-[10px] text-muted"
              data-test-id="chat-custom-model-label"
            >
              <IconLucideBot className="size-3" />
              {selectedModelName}
            </div>
          ) : (
            <ProviderModelSelect>{selectedModelName}</ProviderModelSelect>
          )}
          <div className="ml-auto">
            <ProviderSettings />
          </div>
        </div>
        <form className="flex gap-1.5" onSubmit={handleSubmit}>
          <AppInput
            value={input}
            onValueChange={setInput}
            data-test-id="chat-input"
            placeholder={dialogs.describeChange}
            className="min-w-0 flex-1 placeholder:text-muted"
            disabled={isStreaming}
            onPaste={(event) => event.stopPropagation()}
            onCopy={(event) => event.stopPropagation()}
            onCut={(event) => event.stopPropagation()}
          />
          {isStreaming ? (
            <Tip label={dialogs.stopGenerating}>
              <button
                type="button"
                data-test-id="chat-stop-button"
                className={stopButton.base}
                onClick={onStop}
              >
                <IconLucideSquare className="size-3" />
              </button>
            </Tip>
          ) : (
            <Tip label={dialogs.sendMessage}>
              <button
                type="submit"
                data-test-id="chat-send-button"
                className={sendButton.base}
                disabled={!input.trim()}
              >
                <IconLucideSend className="size-3" />
              </button>
            </Tip>
          )}
        </form>
      </div>
    </Tooltip.Provider>
  )
})

ChatInput.displayName = 'ChatInput'
export default ChatInput
