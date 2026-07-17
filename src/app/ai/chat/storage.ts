import { atom, computed } from 'nanostores'

import { AI_PROVIDERS, DEFAULT_AI_MODEL, DEFAULT_AI_PROVIDER, IS_BROWSER, IS_TAURI } from '@open-pencil/core/constants'
import type { AIProviderID } from '@open-pencil/core/constants'
import { setPexelsApiKey, setUnsplashAccessKey } from '@open-pencil/core/tools'

const STORAGE_PREFIX = 'open-pencil:'
const LEGACY_KEY_STORAGE = `${STORAGE_PREFIX}openrouter-api-key`

export function keyStorageKey(id: string) {
  return `${STORAGE_PREFIX}ai-key:${id}`
}

function readLS(key: string, fallback: string): string {
  if (!IS_BROWSER) return fallback
  return localStorage.getItem(key) ?? fallback
}

function writeLS(key: string, value: string) {
  if (IS_BROWSER) localStorage.setItem(key, value)
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

function persistedAtom<T extends string | number>(
  key: string,
  fallback: T
): ReturnType<typeof atom<T>> {
  const $a = atom<T>(readLS(key, String(fallback)) as T)
  $a.subscribe((v) => writeLS(key, String(v)))
  return $a
}

export const providerID = persistedAtom<AIProviderID>(
  `${STORAGE_PREFIX}ai-provider`,
  DEFAULT_AI_PROVIDER
)

export const $apiKeyStorageKey = computed(providerID, (id) => keyStorageKey(id))

// apiKey is derived from the current provider's storage key
export const apiKey = atom<string>(readLS($apiKeyStorageKey.get(), ''))

$apiKeyStorageKey.subscribe((newKey) => {
  apiKey.set(readLS(newKey, ''))
})
apiKey.subscribe((v) => {
  writeLS($apiKeyStorageKey.get(), v)
})

export const modelID = persistedAtom(`${STORAGE_PREFIX}ai-model`, DEFAULT_AI_MODEL)
export const customBaseURL = persistedAtom(`${STORAGE_PREFIX}ai-base-url`, '')
export const customModelID = persistedAtom(`${STORAGE_PREFIX}ai-custom-model`, '')
export const customAPIType = persistedAtom<'completions' | 'responses'>(
  `${STORAGE_PREFIX}ai-api-type`,
  'completions'
)
export const maxOutputTokens = persistedAtom(`${STORAGE_PREFIX}ai-max-output-tokens`, 16384)
export const pexelsApiKey = persistedAtom(`${STORAGE_PREFIX}pexels-api-key`, '')
export const unsplashAccessKey = persistedAtom(`${STORAGE_PREFIX}unsplash-access-key`, '')

export const providerDef = computed(
  providerID,
  (id) => AI_PROVIDERS.find((p) => p.id === id) ?? AI_PROVIDERS[0]
)

export const isACPProvider = computed(providerID, (id) => id.startsWith('acp:'))

export const isConfigured = computed(
  [providerID, apiKey, customBaseURL, isACPProvider],
  (id, key, baseURL, isACP) => {
    if (isACP) return IS_TAURI
    if (!key) return false
    const needsBaseURL = id === 'openai-compatible' || id === 'anthropic-compatible'
    if (needsBaseURL && !baseURL) return false
    return true
  }
)

export function setAPIKey(key: string) {
  apiKey.set(key)
}

export function registerAIChatEffects(markTransportDirty: () => void) {
  pexelsApiKey.subscribe((key) => {
    setPexelsApiKey(key || null)
  })

  unsplashAccessKey.subscribe((key) => {
    setUnsplashAccessKey(key || null)
  })

  providerID.subscribe((id) => {
    const def = AI_PROVIDERS.find((p) => p.id === id)
    if (def?.defaultModel) {
      modelID.set(def.defaultModel)
    }
    markTransportDirty()
  })

  modelID.subscribe(markTransportDirty)
  customModelID.subscribe(markTransportDirty)
  customAPIType.subscribe(markTransportDirty)
  apiKey.subscribe(markTransportDirty)
  customBaseURL.subscribe(markTransportDirty)
}
