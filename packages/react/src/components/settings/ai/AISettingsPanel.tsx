import { useRef, useState } from 'react'
import { useStore } from '@nanostores/react'

import {
  testProviderConnection,
  type ProviderConnectionTestFailureReason
} from '#react/app/ai/chat/connection-test'
import {
  chatProviderSettings,
  setChatProviderSettings
} from '#react/app/ai/chat/settings'
import {
  ProviderConnectionTestButton,
  type ProviderConnectionTestStatus
} from '#react/components/chat/ProviderConnectionTestButton'
import { SettingsField } from '#react/components/settings/SettingsField'
import { AppInput } from '#react/components/ui/AppInput'
import { useI18n } from '#react/i18n'

export function AISettingsPanel() {
  const { dialogs } = useI18n()
  const chatSettings = useStore(chatProviderSettings)
  const [testStatus, setTestStatus] = useState<ProviderConnectionTestStatus>('idle')
  const [testReason, setTestReason] = useState<ProviderConnectionTestFailureReason | null>(null)
  const testGeneration = useRef(0)
  const canTest =
    Boolean(chatSettings.apiKey.trim()) &&
    Boolean(chatSettings.baseURL.trim()) &&
    Boolean(chatSettings.model.trim())

  function resetConnectionTest() {
    testGeneration.current += 1
    setTestStatus('idle')
    setTestReason(null)
  }

  async function testConnection() {
    const generation = ++testGeneration.current
    setTestStatus('testing')
    setTestReason(null)
    const result = await testProviderConnection(chatProviderSettings.get())
    if (generation !== testGeneration.current) return
    if (result.ok) {
      setTestStatus('success')
      return
    }
    setTestStatus('error')
    setTestReason(result.reason)
  }

  return (
    <section className="flex flex-col gap-4" data-test-id="settings-ai-panel">
      <div>
        <h3 className="text-xs font-semibold text-surface">{dialogs.settingsAIAndAgents}</h3>
        <p className="mt-1 text-[11px] text-muted">{dialogs.modelsDescription}</p>
      </div>

      <div className="flex flex-col gap-3 rounded border border-border p-3">
        <SettingsField label={dialogs.apiKey} htmlFor="settings-ai-api-key">
          <AppInput
            id="settings-ai-api-key"
            type="password"
            autoComplete="off"
            tone="default"
            size="sm"
            value={chatSettings.apiKey}
            onChange={(event) => {
              resetConnectionTest()
              setChatProviderSettings({ apiKey: event.target.value })
            }}
          />
        </SettingsField>
        <SettingsField label={dialogs.baseURL} htmlFor="settings-ai-base-url">
          <AppInput
            id="settings-ai-base-url"
            type="url"
            tone="default"
            size="sm"
            placeholder={dialogs.baseURLPlaceholder}
            value={chatSettings.baseURL}
            onChange={(event) => {
              resetConnectionTest()
              setChatProviderSettings({ baseURL: event.target.value })
            }}
          />
        </SettingsField>
        <SettingsField label={dialogs.modelID} htmlFor="settings-ai-model-id">
          <AppInput
            id="settings-ai-model-id"
            type="text"
            tone="default"
            size="sm"
            placeholder={dialogs.modelIDPlaceholder}
            value={chatSettings.model}
            onChange={(event) => {
              resetConnectionTest()
              setChatProviderSettings({ model: event.target.value })
            }}
          />
        </SettingsField>
        <ProviderConnectionTestButton
          status={testStatus}
          reason={testReason}
          disabled={!canTest}
          onTest={() => void testConnection()}
        />
      </div>
    </section>
  )
}
