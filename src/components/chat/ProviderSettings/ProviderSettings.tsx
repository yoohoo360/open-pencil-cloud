import { useState } from 'react'
import * as Popover from '@radix-ui/react-popover'
import { useStore } from '@nanostores/react'

import IconSettings from '~icons/lucide/settings'

import { useI18n } from '@open-pencil/react'
import { testProviderConnection } from '@/app/ai/chat/connection-test'
import type { ProviderConnectionTestFailureReason } from '@/app/ai/chat/connection-test'
import { useAIChat } from '@/app/ai/chat/use'
import { ProviderSettingsContextProvider } from '@/components/chat/ProviderSettings/context'
import { ApiKeySection } from '@/components/chat/ProviderSettings/ApiKeySection'
import { ApiTypeSection } from '@/components/chat/ProviderSettings/ApiTypeSection'
import { CustomEndpointSection } from '@/components/chat/ProviderSettings/CustomEndpointSection'
import { MaxTokensSection } from '@/components/chat/ProviderSettings/MaxTokensSection'
import { ProviderSelectField } from '@/components/chat/ProviderSelect/ProviderSelectField'
import { StockPhotoKeysSection } from '@/components/chat/ProviderSettings/StockPhotoKeysSection'
import { TestConnectionSection } from '@/components/chat/ProviderSettings/TestConnectionSection'
import { Tip } from '@/components/ui/Tip'
import { usePopoverUI } from '@/components/ui/popover'

export function ProviderSettings() {
  const { dialogs } = useI18n()
  const cls = usePopoverUI({ content: 'isolate z-[51] w-64 p-3' })
  const [popoverOpen, setPopoverOpen] = useState(false)

  const chat = useAIChat()
  const currentProviderID = useStore(chat.providerID)
  const currentProviderDef = useStore(chat.providerDef)
  const currentApiKey = useStore(chat.apiKey)
  const currentCustomBaseURL = useStore(chat.customBaseURL)
  const currentCustomModelID = useStore(chat.customModelID)
  const currentCustomAPIType = useStore(chat.customAPIType)

  const isACP = currentProviderID.startsWith('acp:')

  const [keyInput, setKeyInput] = useState('')
  const [pexelsKeyInput, setPexelsKeyInput] = useState('')
  const [unsplashKeyInput, setUnsplashKeyInput] = useState('')
  const [baseURLInput, setBaseURLInput] = useState(currentCustomBaseURL)
  const [customModelInput, setCustomModelInput] = useState(currentCustomModelID)
  const [connectionTestStatus, setConnectionTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle')
  const [connectionTestReason, setConnectionTestReason] = useState<ProviderConnectionTestFailureReason | null>(null)

  const hasExistingKey = !!currentApiKey
  const hasExistingPexelsKey = !!chat.pexelsApiKey.get()
  const hasExistingUnsplashKey = !!chat.unsplashAccessKey.get()

  const canTestConnection = !isACP &&
    !!keyInput.trim() &&
    !(currentProviderDef as { supportsCustomBaseURL?: boolean }).supportsCustomBaseURL || !!baseURLInput.trim()

  function save() {
    const key = keyInput.trim()
    if (!key) return
    if ((currentProviderDef as { supportsCustomBaseURL?: boolean }).supportsCustomBaseURL) {
      chat.customBaseURL.set(baseURLInput.trim())
    }
    if ((currentProviderDef as { supportsCustomModel?: boolean }).supportsCustomModel) {
      chat.customModelID.set(customModelInput.trim())
    }
    chat.setAPIKey(key)
    setKeyInput('')
  }

  function clearKey() { chat.apiKey.set('') }
  function clearPexelsKey() { chat.pexelsApiKey.set('') }
  function clearUnsplashKey() { chat.unsplashAccessKey.set('') }

  function setCustomAPIType(value: string) {
    chat.customAPIType.set(value as 'completions' | 'responses')
    setConnectionTestStatus('idle')
    setConnectionTestReason(null)
  }

  async function testConnection() {
    if (connectionTestStatus === 'testing') return
    setConnectionTestStatus('testing')
    setConnectionTestReason(null)
    const result = await testProviderConnection({
      providerID: currentProviderID,
      apiKey: keyInput.trim(),
      modelID: chat.modelID.get(),
      customModelID: (currentProviderDef as { supportsCustomModel?: boolean }).supportsCustomModel
        ? customModelInput.trim()
        : currentCustomModelID,
      customBaseURL: (currentProviderDef as { supportsCustomBaseURL?: boolean }).supportsCustomBaseURL
        ? baseURLInput.trim()
        : currentCustomBaseURL,
      customAPIType: currentCustomAPIType
    })
    if (result.ok) {
      setConnectionTestStatus('success')
    } else {
      setConnectionTestStatus('error')
      setConnectionTestReason(result.reason)
    }
  }

  function onInteractOutside(e: Event) {
    const target = e.target as HTMLElement | null
    if (target?.closest('[role=listbox], [data-radix-popper-content-wrapper]')) {
      e.preventDefault()
      return
    }
    save()
  }

  const ctxValue = {
    providerID: chat.providerID,
    providerDef: chat.providerDef,
    apiKey: chat.apiKey,
    modelID: chat.modelID,
    customAPIType: chat.customAPIType,
    customBaseURL: chat.customBaseURL,
    customModelID: chat.customModelID,
    maxOutputTokens: chat.maxOutputTokens,
    pexelsApiKey: chat.pexelsApiKey,
    unsplashAccessKey: chat.unsplashAccessKey,
    isACP,
    keyInput,
    setKeyInput,
    pexelsKeyInput,
    setPexelsKeyInput,
    unsplashKeyInput,
    setUnsplashKeyInput,
    baseURLInput,
    setBaseURLInput,
    customModelInput,
    setCustomModelInput,
    hasExistingKey,
    hasExistingPexelsKey,
    hasExistingUnsplashKey,
    connectionTestStatus,
    connectionTestReason,
    canTestConnection,
    save,
    clearKey,
    clearPexelsKey,
    clearUnsplashKey,
    setCustomAPIType,
    testConnection
  }

  return (
    <ProviderSettingsContextProvider value={ctxValue}>
      <Popover.Root open={popoverOpen} onOpenChange={setPopoverOpen}>
        <Tip label={dialogs.providerSettings} disabled={popoverOpen}>
          <Popover.Trigger asChild>
            <button
              data-test-id="provider-settings-trigger"
              className="rounded p-0.5 text-muted hover:bg-hover hover:text-surface"
            >
              <IconSettings className="size-3" />
            </button>
          </Popover.Trigger>
        </Tip>

        <Popover.Portal>
          <Popover.Content
            side="top"
            sideOffset={8}
            align="end"
            collisionPadding={16}
            avoidCollisions
            className={cls.content}
            onInteractOutside={onInteractOutside}
          >
            <div className="flex flex-col gap-2.5">
              <h3 className="text-[11px] font-semibold text-surface">{dialogs.aiProvider}</h3>
              <ProviderSelectField data-test-id="provider-settings-provider" />
              <MaxTokensSection />
              <StockPhotoKeysSection />
              <CustomEndpointSection />
              <ApiTypeSection />
              <ApiKeySection />
              <TestConnectionSection />

              <Popover.Close
                className="mt-1 w-full rounded bg-accent px-2 py-1 text-center text-[11px] font-medium text-white hover:bg-accent/90"
                data-test-id="provider-settings-done"
                onClick={save}
              >
                {dialogs.done}
              </Popover.Close>
            </div>
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    </ProviderSettingsContextProvider>
  )
}
