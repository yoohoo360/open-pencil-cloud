import IconLucideSparkles from '~icons/lucide/sparkles'
import { memo, useCallback, useEffect, useMemo, useState } from 'react'

import {
  testProviderConnection,
  type ProviderConnectionTestFailureReason
} from '@/app/ai/chat/connection-test'
import { ACP_AGENTS } from '@open-pencil/core/constants'
import { useI18n } from '@open-pencil/react'
import { openExternalLink } from '@/app/shell/ui'
import { useAIChat } from '@/app/ai/chat/use'
import ProviderConnectionTestButton from '@/components/chat/ProviderConnectionTestButton'
import ProviderSelectField from '@/components/chat/ProviderSelect/ProviderSelectField'
import AppInput from '@/components/ui/AppInput'
import AppTextButton from '@/components/ui/AppTextButton'
import { useVueRefValue } from '@/shared/useVueRefValue'

export const ProviderSetup = memo(function ProviderSetup() {
  const {
    providerID: providerIDRef,
    providerDef: providerDefRef,
    setAPIKey,
    modelID: modelIDRef,
    customBaseURL: customBaseURLRef,
    customModelID: customModelIDRef,
    customAPIType: customAPITypeRef
  } = useAIChat()
  const providerID = useVueRefValue(providerIDRef)
  const providerDef = useVueRefValue(providerDefRef)
  const modelID = useVueRefValue(modelIDRef)
  const customBaseURL = useVueRefValue(customBaseURLRef)
  const customModelID = useVueRefValue(customModelIDRef)
  const customAPIType = useVueRefValue(customAPITypeRef)
  const { dialogs } = useI18n()

  const isACP = providerID.startsWith('acp:')
  const acpAgent = useMemo(() => {
    if (!isACP) return null
    const id = providerID.replace('acp:', '')
    return ACP_AGENTS.find((a) => a.id === id) ?? null
  }, [isACP, providerID])

  const [keyInput, setKeyInput] = useState('')
  const [baseURLInput, setBaseURLInput] = useState(customBaseURL)
  const [customModelInput, setCustomModelInput] = useState(customModelID)
  const [connectionTestStatus, setConnectionTestStatus] = useState<
    'idle' | 'testing' | 'success' | 'error'
  >('idle')
  const [connectionTestReason, setConnectionTestReason] =
    useState<ProviderConnectionTestFailureReason | null>(null)

  const canTestConnection =
    !isACP &&
    !!keyInput.trim() &&
    (!providerDef.supportsCustomBaseURL || !!baseURLInput.trim()) &&
    (!providerDef.supportsCustomModel ||
      providerID === 'openrouter' ||
      !!customModelInput.trim())

  const resetConnectionTest = useCallback(() => {
    setConnectionTestStatus('idle')
    setConnectionTestReason(null)
  }, [])

  useEffect(() => {
    resetConnectionTest()
  }, [providerID, keyInput, baseURLInput, customModelInput, customAPIType, resetConnectionTest])

  const testConnection = useCallback(async () => {
    if (connectionTestStatus === 'testing') return
    setConnectionTestStatus('testing')
    setConnectionTestReason(null)

    const result = await testProviderConnection({
      providerID: providerIDRef.value,
      apiKey: keyInput.trim(),
      modelID: modelIDRef.value,
      customModelID: providerDef.supportsCustomModel
        ? customModelInput.trim()
        : customModelIDRef.value,
      customBaseURL: providerDef.supportsCustomBaseURL
        ? baseURLInput.trim()
        : customBaseURLRef.value,
      customAPIType: customAPITypeRef.value
    })

    if (result.ok) {
      setConnectionTestStatus('success')
      setConnectionTestReason(null)
      return
    }

    setConnectionTestStatus('error')
    setConnectionTestReason(result.reason)
  }, [
    baseURLInput,
    connectionTestStatus,
    customAPITypeRef,
    customBaseURLRef,
    customModelIDRef,
    customModelInput,
    keyInput,
    modelIDRef,
    providerDef.supportsCustomBaseURL,
    providerDef.supportsCustomModel,
    providerIDRef
  ])

  const save = () => {
    const key = keyInput.trim()
    if (!key) return
    if (providerDef.supportsCustomBaseURL) {
      customBaseURLRef.value = baseURLInput.trim()
    }
    if (providerDef.supportsCustomModel) {
      customModelIDRef.value = customModelInput.trim()
    }
    setAPIKey(key)
    setKeyInput('')
  }

  return (
    <div
      data-test-id="provider-setup"
      className="flex flex-1 flex-col items-center justify-center px-6"
    >
      <IconLucideSparkles className="mb-3 size-7 text-muted" />
      <p className="mb-5 text-center text-xs text-muted">{dialogs.connectAIProvider}</p>

      {!isACP ? (
        <form className="flex w-full flex-col gap-2" onSubmit={(event) => event.preventDefault()}>
          <ProviderSelectField />

          {providerDef.supportsCustomBaseURL ? (
            <AppInput
              value={baseURLInput}
              onValueChange={setBaseURLInput}
              data-test-id="provider-base-url"
              placeholder={dialogs.baseURLPlaceholder}
            />
          ) : null}

          {providerDef.supportsCustomModel && providerID !== 'openrouter' ? (
            <AppInput
              value={customModelInput}
              onValueChange={setCustomModelInput}
              data-test-id="provider-custom-model"
              placeholder={dialogs.modelIDPlaceholder}
            />
          ) : null}

          <AppInput
            value={keyInput}
            onValueChange={setKeyInput}
            type="password"
            data-test-id="api-key-input"
            placeholder={providerDef.keyPlaceholder}
          />

          <ProviderConnectionTestButton
            status={connectionTestStatus}
            reason={connectionTestReason}
            disabled={!canTestConnection}
            onTest={testConnection}
          />

          <button
            type="button"
            data-test-id="api-key-save"
            className="mt-1 w-full rounded bg-accent py-1.5 text-xs font-medium text-white hover:bg-accent/90"
            disabled={!keyInput.trim()}
            onClick={save}
          >
            {dialogs.connect}
          </button>
        </form>
      ) : (
        <div className="flex w-full flex-col gap-2">
          <ProviderSelectField />
          <p className="text-center text-[10px] leading-relaxed text-muted">
            Uses your existing {acpAgent?.name} subscription.{' '}
            {acpAgent?.installCommand ? (
              <>
                Install it with{' '}
                <code className="rounded bg-input px-1 py-0.5 font-mono text-[9px]">
                  {acpAgent.installCommand}
                </code>{' '}
                and sign in before sending your first message.
              </>
            ) : (
              <>
                Make sure{' '}
                <code className="rounded bg-input px-1 py-0.5 font-mono text-[9px]">
                  {acpAgent?.command}
                </code>{' '}
                is installed and authenticated.
              </>
            )}
          </p>
        </div>
      )}

      {!isACP && providerDef.keyURL ? (
        <AppTextButton
          data-test-id="api-key-get-link"
          underline
          ui={{ base: 'mt-2.5' }}
          onClick={() => openExternalLink(providerDef.keyURL as string)}
        >
          {dialogs.getAPIKey({ provider: providerDef.name })}
        </AppTextButton>
      ) : null}

      {providerID === 'openrouter' ? (
        <p className="mt-3 text-center text-[10px] leading-relaxed text-muted/50">
          {dialogs.oneKeyManyModels}
        </p>
      ) : null}
    </div>
  )
})

ProviderSetup.displayName = 'ProviderSetup'
export default ProviderSetup
