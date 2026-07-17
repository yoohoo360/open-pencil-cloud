import { useCallback, useEffect, useState } from 'react'
import { useStore } from '@nanostores/react'
import IconSparkles from '~icons/lucide/sparkles'

import { ACP_AGENTS } from '@open-pencil/core/constants'
import { testProviderConnection } from '@/app/ai/chat/connection-test'
import type { ProviderConnectionTestFailureReason } from '@/app/ai/chat/connection-test'
import { ProviderConnectionTestButton } from '@/components/chat/ProviderConnectionTestButton'
import { ProviderSelectField } from '@/components/chat/ProviderSelect/ProviderSelectField'
import { AppInput } from '@/components/ui/AppInput'
import { AppTextButton } from '@/components/ui/AppTextButton'
import { useAIChat } from '@/app/ai/chat/use'
import { openExternalLink } from '@/app/shell/ui'
import { useI18n } from '@open-pencil/react'

type TestStatus = 'idle' | 'testing' | 'success' | 'error'

type ProviderDef = {
  name?: string
  keyPlaceholder?: string
  keyURL?: string
  supportsCustomBaseURL?: boolean
  supportsCustomModel?: boolean
}

function applyTestResult(
  ok: boolean,
  reason: ProviderConnectionTestFailureReason | null,
  setStatus: (s: TestStatus) => void,
  setReason: (r: ProviderConnectionTestFailureReason | null) => void
) {
  if (ok) {
    setStatus('success')
  } else {
    setStatus('error')
    setReason(reason)
  }
}

function computeCanTest(
  isACP: boolean,
  keyInput: string,
  providerDef: ProviderDef,
  baseURLInput: string,
  providerID: string,
  customModelInput: string
): boolean {
  return (
    !isACP &&
    !!keyInput.trim() &&
    (!providerDef.supportsCustomBaseURL || !!baseURLInput.trim()) &&
    (!providerDef.supportsCustomModel || providerID === 'openrouter' || !!customModelInput.trim())
  )
}

interface ACPSectionProps {
  acpAgent: (typeof ACP_AGENTS)[number] | null
}

function ACPSection({ acpAgent }: ACPSectionProps) {
  return (
    <div className="flex w-full flex-col gap-2">
      <ProviderSelectField data-test-id="provider-selector" />
      <p className="text-center text-[10px] leading-relaxed text-muted">
        Uses your existing {acpAgent?.name} subscription.
        {acpAgent?.installCommand ? (
          <>
            {' Install it with '}
            <code className="rounded bg-input px-1 py-0.5 font-mono text-[9px]">{acpAgent.installCommand}</code>
            {' and sign in before sending your first message.'}
          </>
        ) : (
          <>
            {' Make sure '}
            <code className="rounded bg-input px-1 py-0.5 font-mono text-[9px]">{acpAgent?.command}</code>
            {' is installed and authenticated.'}
          </>
        )}
      </p>
    </div>
  )
}

export function ProviderSetup() {
  const { providerID, providerDef, setAPIKey, modelID, customBaseURL, customModelID, customAPIType } = useAIChat()
  const { dialogs } = useI18n()

  const currentProviderID = useStore(providerID)
  const currentProviderDef = useStore(providerDef) as ProviderDef
  const currentCustomAPIType = useStore(customAPIType)
  const currentCustomBaseURL = useStore(customBaseURL)
  const currentCustomModelID = useStore(customModelID)
  const currentModelID = useStore(modelID)

  const isACP = currentProviderID.startsWith('acp:')
  const acpAgent = isACP
    ? (ACP_AGENTS.find((a) => a.id === currentProviderID.replace('acp:', '')) ?? null)
    : null

  const [keyInput, setKeyInput] = useState('')
  const [baseURLInput, setBaseURLInput] = useState(currentCustomBaseURL)
  const [customModelInput, setCustomModelInput] = useState(currentCustomModelID)
  const [connectionTestStatus, setConnectionTestStatus] = useState<TestStatus>('idle')
  const [connectionTestReason, setConnectionTestReason] = useState<ProviderConnectionTestFailureReason | null>(null)

  useEffect(() => {
    setConnectionTestStatus('idle')
    setConnectionTestReason(null)
  }, [currentProviderID, keyInput, baseURLInput, customModelInput, currentCustomAPIType])

  const canTestConnection = computeCanTest(
    isACP, keyInput, currentProviderDef, baseURLInput, currentProviderID, customModelInput
  )

  const testConnection = useCallback(async () => {
    if (connectionTestStatus === 'testing') return
    setConnectionTestStatus('testing')
    setConnectionTestReason(null)
    const result = await testProviderConnection({
      providerID: currentProviderID,
      apiKey: keyInput.trim(),
      modelID: currentModelID,
      customModelID: currentProviderDef.supportsCustomModel ? customModelInput.trim() : currentCustomModelID,
      customBaseURL: currentProviderDef.supportsCustomBaseURL ? baseURLInput.trim() : currentCustomBaseURL,
      customAPIType: currentCustomAPIType
    })
    applyTestResult(result.ok, result.ok ? null : result.reason, setConnectionTestStatus, setConnectionTestReason)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connectionTestStatus, currentProviderID, keyInput, currentModelID, currentProviderDef, customModelInput, currentCustomModelID, baseURLInput, currentCustomBaseURL, currentCustomAPIType])

  const save = useCallback(() => {
    const key = keyInput.trim()
    if (!key) return
    if (currentProviderDef.supportsCustomBaseURL) customBaseURL.set(baseURLInput.trim())
    if (currentProviderDef.supportsCustomModel) customModelID.set(customModelInput.trim())
    setAPIKey(key)
    setKeyInput('')
  }, [keyInput, currentProviderDef, customBaseURL, baseURLInput, customModelID, customModelInput, setAPIKey])

  return (
    <div data-test-id="provider-setup" className="flex flex-1 flex-col items-center justify-center px-6">
      <IconSparkles className="mb-3 size-7 text-muted" />
      <p className="mb-5 text-center text-xs text-muted">{dialogs.connectAIProvider}</p>

      {isACP ? (
        <ACPSection acpAgent={acpAgent} />
      ) : (
        <form className="flex w-full flex-col gap-2" onSubmit={(e) => { e.preventDefault(); save() }}>
          <ProviderSelectField data-test-id="provider-selector" />

          {currentProviderDef.supportsCustomBaseURL && (
            <AppInput
              value={baseURLInput}
              data-test-id="provider-base-url"
              placeholder={dialogs.baseURLPlaceholder}
              onChange={(e) => setBaseURLInput(e.target.value)}
            />
          )}

          {currentProviderDef.supportsCustomModel && currentProviderID !== 'openrouter' && (
            <AppInput
              value={customModelInput}
              data-test-id="provider-custom-model"
              placeholder={dialogs.modelIDPlaceholder}
              onChange={(e) => setCustomModelInput(e.target.value)}
            />
          )}

          <AppInput
            value={keyInput}
            type="password"
            data-test-id="api-key-input"
            placeholder={currentProviderDef.keyPlaceholder ?? ''}
            onChange={(e) => setKeyInput(e.target.value)}
          />

          <ProviderConnectionTestButton
            status={connectionTestStatus}
            reason={connectionTestReason}
            disabled={!canTestConnection}
            onTest={testConnection}
          />

          <button
            type="submit"
            data-test-id="api-key-save"
            className="mt-1 w-full rounded bg-accent py-1.5 text-xs font-medium text-white hover:bg-accent/90"
            disabled={!keyInput.trim()}
          >
            {dialogs.connect}
          </button>
        </form>
      )}

      {!isACP && currentProviderDef.keyURL && (
        <AppTextButton
          data-test-id="api-key-get-link"
          underline
          ui={{ base: 'mt-2.5' }}
          onClick={() => openExternalLink(currentProviderDef.keyURL as string)}
        >
          {dialogs.getAPIKey({ provider: currentProviderDef.name ?? '' })}
        </AppTextButton>
      )}

      {currentProviderID === 'openrouter' && (
        <p className="mt-3 text-center text-[10px] leading-relaxed text-muted/50">
          {dialogs.oneKeyManyModels}
        </p>
      )}
    </div>
  )
}
