import {
  AI_PROVIDERS,
  DEFAULT_AI_MODEL,
  DEFAULT_AI_PROVIDER,
  IS_BROWSER,
  IS_TAURI
} from '@open-pencil/core/constants'
import type { AIProviderID } from '@open-pencil/core/constants'
import { setPexelsApiKey, setUnsplashAccessKey } from '@open-pencil/core/tools'

import {
  createComputedValue,
  createPersistedValue,
  watchValues,
  type MutableValue
} from '@/shared/persistedValue'

const STORAGE_PREFIX = 'open-pencil:'
const LEGACY_KEY_STORAGE = `${STORAGE_PREFIX}openrouter-api-key`

export function keyStorageKey(id: string) {
  return `${STORAGE_PREFIX}ai-key:${id}`
}

function migrateLegacyStorage() {
  const legacyKey = localStorage.getItem(LEGACY_KEY_STORAGE)
  if (legacyKey) {
    localStorage.setItem(keyStorageKey('openrouter'), legacyKey)
    localStorage.removeItem(LEGACY_KEY_STORAGE)
    if (!localStorage.getItem(`${STORAGE_PREFIX}ai-provider`)) {
      localStorage.setItem(`${STORAGE_PREFIX}ai-provider`, 'openrouter')
    }
  }
}

if (IS_BROWSER) migrateLegacyStorage()

export const providerID = createPersistedValue<AIProviderID>(
  `${STORAGE_PREFIX}ai-provider`,
  DEFAULT_AI_PROVIDER
)

const apiKeyListeners = new Set<() => void>()

export const apiKey: MutableValue<string> & { subscribe: (listener: () => void) => () => void } = {
  get value() {
    return readApiKey(providerID.value)
  },
  set value(key: string) {
    writeApiKey(providerID.value, key)
    for (const listener of apiKeyListeners) listener()
  },
  subscribe(listener: () => void) {
    apiKeyListeners.add(listener)
    return () => apiKeyListeners.delete(listener)
  }
}

function readApiKey(id: AIProviderID): string {
  if (typeof window === 'undefined') return ''
  return window.localStorage.getItem(keyStorageKey(id)) ?? ''
}

function writeApiKey(id: AIProviderID, key: string): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(keyStorageKey(id), key)
}

export const modelID = createPersistedValue(`${STORAGE_PREFIX}ai-model`, DEFAULT_AI_MODEL)
export const customBaseURL = createPersistedValue(`${STORAGE_PREFIX}ai-base-url`, '')
export const customModelID = createPersistedValue(`${STORAGE_PREFIX}ai-custom-model`, '')
export const customAPIType = createPersistedValue<'completions' | 'responses'>(
  `${STORAGE_PREFIX}ai-api-type`,
  'completions'
)
export const maxOutputTokens = createPersistedValue(`${STORAGE_PREFIX}ai-max-output-tokens`, 16384)
export const pexelsApiKey = createPersistedValue(`${STORAGE_PREFIX}pexels-api-key`, '')
export const unsplashAccessKey = createPersistedValue(`${STORAGE_PREFIX}unsplash-access-key`, '')

export const providerDef = createComputedValue(
  () => AI_PROVIDERS.find((provider) => provider.id === providerID.value) ?? AI_PROVIDERS[0]
)

export const isACPProvider = createComputedValue(() => providerID.value.startsWith('acp:'))

export const isConfigured = createComputedValue(() => {
  if (isACPProvider.value) return IS_TAURI
  if (!apiKey.value) return false
  const needsBaseURL =
    providerID.value === 'openai-compatible' || providerID.value === 'anthropic-compatible'
  if (needsBaseURL && !customBaseURL.value) return false
  return true
})

export function setAPIKey(key: string) {
  apiKey.value = key
}

export function registerAIChatEffects(markTransportDirty: () => void) {
  setPexelsApiKey(pexelsApiKey.value || null)
  setUnsplashAccessKey(unsplashAccessKey.value || null)

  const unwatch = watchValues(markTransportDirty, [
    pexelsApiKey,
    unsplashAccessKey,
    providerID,
    modelID,
    customModelID,
    customAPIType,
    customBaseURL,
    maxOutputTokens,
    apiKey
  ])

  const unsubProvider = providerID.subscribe(() => {
    const def = AI_PROVIDERS.find((provider) => provider.id === providerID.value)
    if (def?.defaultModel) modelID.value = def.defaultModel
  })

  return () => {
    unwatch()
    unsubProvider()
  }
}
