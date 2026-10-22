import { useRef, useState } from 'react'
import { useStore } from '@nanostores/react'
import { Plus, Trash2 } from 'lucide-react'

import {
  testProviderConnection,
  type ProviderConnectionTestFailureReason
} from '#react/app/ai/chat/connection-test'
import {
  chatProviderSettings,
  createChatModelEntry,
  removeChatModel,
  setActiveChatModelId,
  setChatProviderSettings,
  upsertChatModel,
  type ChatModelEntry,
  type ModelTier
} from '#react/app/ai/chat/settings'
import {
  chatRuntimeState,
  refreshChatRuntimeMode
} from '#react/app/ai/runtime/mode'
import {
  ProviderConnectionTestButton,
  type ProviderConnectionTestStatus
} from '#react/components/chat/ProviderConnectionTestButton'
import { SettingsField } from '#react/components/settings/SettingsField'
import { AppButton } from '#react/components/ui/AppButton'
import { AppInput } from '#react/components/ui/AppInput'
import { AppSelect } from '#react/components/ui/AppSelect'
import { IconButton } from '#react/components/ui/IconButton'
import { useI18n } from '#react/i18n'

type ModelTestState = {
  status: ProviderConnectionTestStatus
  reason: ProviderConnectionTestFailureReason | null
}

const IDLE_TEST: ModelTestState = { status: 'idle', reason: null }

export function AISettingsPanel() {
  const { dialogs } = useI18n()
  const chatSettings = useStore(chatProviderSettings)
  const runtime = useStore(chatRuntimeState)
  const [modelTests, setModelTests] = useState<Record<string, ModelTestState>>({})
  const testGeneration = useRef(new Map<string, number>())

  const tierOptions: { value: ModelTier; label: string }[] = [
    { value: 'high', label: dialogs.modelTierHigh },
    { value: 'medium', label: dialogs.modelTierMedium },
    { value: 'low', label: dialogs.modelTierLow }
  ]

  const selectionOptions = [
    { value: 'auto', label: dialogs.modelAuto },
    ...chatSettings.models.map((model) => ({
      value: model.id,
      label: model.enabled ? model.name : `${model.name} (${dialogs.modelDisabled})`,
      disabled: !model.enabled
    }))
  ]

  function resetModelTest(id: string) {
    const next = (testGeneration.current.get(id) ?? 0) + 1
    testGeneration.current.set(id, next)
    setModelTests((current) => ({ ...current, [id]: IDLE_TEST }))
  }

  function patchModel(id: string, patch: Partial<ChatModelEntry>) {
    const current = chatSettings.models.find((model) => model.id === id)
    if (!current) return
    resetModelTest(id)
    upsertChatModel({ ...current, ...patch })
  }

  function addModel() {
    const entry = createChatModelEntry({
      name: dialogs.modelNewName,
      modelId: 'gpt-4o-mini',
      tier: 'medium',
      enabled: true
    })
    upsertChatModel(entry)
  }

  async function testModel(modelId: string) {
    const generation = (testGeneration.current.get(modelId) ?? 0) + 1
    testGeneration.current.set(modelId, generation)
    setModelTests((current) => ({
      ...current,
      [modelId]: { status: 'testing', reason: null }
    }))
    const result = await testProviderConnection(chatProviderSettings.get(), {
      modelEntryId: modelId
    })
    if (testGeneration.current.get(modelId) !== generation) return
    setModelTests((current) => ({
      ...current,
      [modelId]: result.ok
        ? { status: 'success', reason: null }
        : { status: 'error', reason: result.reason }
    }))
  }

  return (
    <section className="flex flex-col gap-4" data-test-id="settings-ai-panel">
      <div>
        <h3 className="text-xs font-semibold text-surface">{dialogs.settingsAIAndAgents}</h3>
        <p className="mt-1 text-[11px] text-muted">{dialogs.modelsDescription}</p>
      </div>

      <div className="flex flex-col gap-3 rounded border border-border p-3">
        <SettingsField label={dialogs.baseURL} htmlFor="settings-ai-base-url">
          <AppInput
            id="settings-ai-base-url"
            type="url"
            tone="default"
            size="sm"
            className="w-full"
            placeholder={dialogs.baseURLPlaceholder}
            value={chatSettings.baseURL}
            onChange={(event) => {
              setChatProviderSettings({ baseURL: event.target.value })
              for (const model of chatSettings.models) resetModelTest(model.id)
            }}
          />
        </SettingsField>
        <SettingsField label={dialogs.apiKey} htmlFor="settings-ai-api-key">
          <AppInput
            id="settings-ai-api-key"
            type="password"
            autoComplete="off"
            tone="default"
            size="sm"
            className="w-full"
            value={chatSettings.apiKey}
            onChange={(event) => {
              setChatProviderSettings({ apiKey: event.target.value })
              for (const model of chatSettings.models) resetModelTest(model.id)
            }}
          />
        </SettingsField>

        <div className="flex items-center gap-2">
          <AppButton
            color="neutral"
            variant="ghost"
            size="xs"
            disabled={runtime.probing}
            onClick={() => void refreshChatRuntimeMode({ ensure: true })}
          >
            {dialogs.agentServerProbe}
          </AppButton>
          <span data-test-id="settings-ai-agent-runtime" className="text-[10px] text-muted">
            {runtime.mode === 'agent-server'
              ? dialogs.agentServerOnline
              : dialogs.agentServerOffline}
          </span>
        </div>

        <SettingsField label={dialogs.modelDefaultSelection} htmlFor="settings-ai-active-model">
          <AppSelect
            value={chatSettings.activeModelId}
            label={dialogs.modelDefaultSelection}
            data-test-id="settings-ai-active-model"
            className="w-full"
            options={selectionOptions}
            onChange={(value) => setActiveChatModelId(value === 'auto' ? 'auto' : value)}
          />
        </SettingsField>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[11px] font-medium text-surface">{dialogs.modelsListTitle}</p>
            <p className="text-[10px] text-muted">{dialogs.modelsListHint}</p>
          </div>
          <AppButton color="neutral" variant="ghost" size="xs" onClick={addModel}>
            <Plus className="size-3" />
            {dialogs.modelAdd}
          </AppButton>
        </div>

        <ul className="flex flex-col gap-2" data-test-id="settings-ai-models">
          {chatSettings.models.map((model) => {
            const test = modelTests[model.id] ?? IDLE_TEST
            const canTest =
              Boolean(chatSettings.apiKey.trim()) &&
              Boolean(chatSettings.baseURL.trim()) &&
              Boolean(model.modelId.trim())
            return (
              <li
                key={model.id}
                className="rounded border border-border bg-canvas/50 p-3"
                data-test-id={`settings-ai-model-${model.id}`}
              >
                <div className="mb-2 flex items-center gap-2">
                  <label className="flex min-w-0 flex-1 items-center gap-1.5 text-[11px] text-surface">
                    <input
                      type="checkbox"
                      className="size-3.5 shrink-0 accent-[var(--color-accent)]"
                      checked={model.enabled}
                      onChange={(event) =>
                        patchModel(model.id, { enabled: event.target.checked })
                      }
                    />
                    <span className="truncate font-medium">{dialogs.modelEnabled}</span>
                  </label>
                  <IconButton
                    label={dialogs.modelRemove}
                    size="xs"
                    disabled={chatSettings.models.length <= 1}
                    onClick={() => {
                      resetModelTest(model.id)
                      removeChatModel(model.id)
                    }}
                  >
                    <Trash2 className="size-3" />
                  </IconButton>
                </div>

                <div className="grid grid-cols-1 gap-2">
                  <SettingsField
                    label={dialogs.modelDisplayName}
                    htmlFor={`model-name-${model.id}`}
                  >
                    <AppInput
                      id={`model-name-${model.id}`}
                      tone="default"
                      size="sm"
                      className="w-full"
                      value={model.name}
                      onChange={(event) => patchModel(model.id, { name: event.target.value })}
                    />
                  </SettingsField>
                  <SettingsField label={dialogs.modelID} htmlFor={`model-id-${model.id}`}>
                    <AppInput
                      id={`model-id-${model.id}`}
                      tone="default"
                      size="sm"
                      className="w-full"
                      placeholder={dialogs.modelIDPlaceholder}
                      value={model.modelId}
                      onChange={(event) => patchModel(model.id, { modelId: event.target.value })}
                    />
                  </SettingsField>
                  <SettingsField label={dialogs.modelTier} htmlFor={`model-tier-${model.id}`}>
                    <AppSelect
                      value={model.tier}
                      label={dialogs.modelTier}
                      data-test-id={`settings-ai-model-tier-${model.id}`}
                      className="w-full"
                      options={tierOptions}
                      onChange={(tier) => patchModel(model.id, { tier })}
                    />
                  </SettingsField>
                  <ProviderConnectionTestButton
                    status={test.status}
                    reason={test.reason}
                    disabled={!canTest}
                    data-test-id={`provider-test-connection-${model.id}`}
                    onTest={() => void testModel(model.id)}
                  />
                </div>
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}
