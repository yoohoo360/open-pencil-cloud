import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from 'react'

import {
  testProviderConnection,
  type ProviderConnectionTestFailureReason
} from '@/app/ai/chat/connection-test'
import { useAIChat } from '@/app/ai/chat/use'
import { useVueRefValue } from '@/shared/useVueRefValue'

function useProviderSettingsState() {
  const {
    providerID: providerIDRef,
    providerDef: providerDefRef,
    apiKey: apiKeyRef,
    setAPIKey,
    customBaseURL: customBaseURLRef,
    customModelID: customModelIDRef,
    modelID: modelIDRef,
    customAPIType: customAPITypeRef,
    maxOutputTokens: maxOutputTokensRef,
    pexelsApiKey: pexelsApiKeyRef,
    unsplashAccessKey: unsplashAccessKeyRef
  } = useAIChat()

  const providerID = useVueRefValue(providerIDRef)
  const providerDef = useVueRefValue(providerDefRef)
  const apiKey = useVueRefValue(apiKeyRef)
  const customBaseURL = useVueRefValue(customBaseURLRef)
  const customModelID = useVueRefValue(customModelIDRef)
  const modelID = useVueRefValue(modelIDRef)
  const customAPIType = useVueRefValue(customAPITypeRef)
  const maxOutputTokens = useVueRefValue(maxOutputTokensRef)
  const pexelsApiKey = useVueRefValue(pexelsApiKeyRef)
  const unsplashAccessKey = useVueRefValue(unsplashAccessKeyRef)

  const isACP = providerID.startsWith('acp:')
  const [keyInput, setKeyInput] = useState('')
  const [pexelsKeyInput, setPexelsKeyInput] = useState('')
  const [unsplashKeyInput, setUnsplashKeyInput] = useState('')
  const [baseURLInput, setBaseURLInput] = useState(customBaseURL)
  const [customModelInput, setCustomModelInput] = useState(customModelID)
  const [hasExistingKey, setHasExistingKey] = useState(!!apiKey)
  const [hasExistingPexelsKey, setHasExistingPexelsKey] = useState(!!pexelsApiKey)
  const [hasExistingUnsplashKey, setHasExistingUnsplashKey] = useState(!!unsplashAccessKey)
  const [connectionTestStatus, setConnectionTestStatus] = useState<
    'idle' | 'testing' | 'success' | 'error'
  >('idle')
  const [connectionTestReason, setConnectionTestReason] =
    useState<ProviderConnectionTestFailureReason | null>(null)

  const effectiveAPIKey = keyInput.trim() || apiKey
  const canTestConnection =
    !isACP &&
    !!effectiveAPIKey.trim() &&
    (!providerDef.supportsCustomBaseURL || !!baseURLInput.trim()) &&
    (!providerDef.supportsCustomModel || !!customModelInput.trim())

  const resetConnectionTest = useCallback(() => {
    setConnectionTestStatus('idle')
    setConnectionTestReason(null)
  }, [])

  useEffect(() => {
    setKeyInput('')
    setHasExistingKey(!!apiKeyRef.value)
    setBaseURLInput(customBaseURLRef.value)
    setCustomModelInput(customModelIDRef.value)
    resetConnectionTest()
  }, [providerID, apiKeyRef, customBaseURLRef, customModelIDRef, resetConnectionTest])

  useEffect(() => {
    resetConnectionTest()
  }, [keyInput, baseURLInput, customModelInput, customAPIType, resetConnectionTest])

  const save = useCallback(() => {
    if (keyInput.trim()) {
      setAPIKey(keyInput.trim())
      setHasExistingKey(true)
      setKeyInput('')
    }
    if (pexelsKeyInput.trim()) {
      pexelsApiKeyRef.value = pexelsKeyInput.trim()
      setHasExistingPexelsKey(true)
      setPexelsKeyInput('')
    }
    if (unsplashKeyInput.trim()) {
      unsplashAccessKeyRef.value = unsplashKeyInput.trim()
      setHasExistingUnsplashKey(true)
      setUnsplashKeyInput('')
    }
    if (providerDef.supportsCustomBaseURL) {
      customBaseURLRef.value = baseURLInput.trim()
    }
    if (providerDef.supportsCustomModel) {
      customModelIDRef.value = customModelInput.trim()
    }
  }, [
    baseURLInput,
    customBaseURLRef,
    customModelIDRef,
    customModelInput,
    keyInput,
    pexelsApiKeyRef,
    pexelsKeyInput,
    providerDef.supportsCustomBaseURL,
    providerDef.supportsCustomModel,
    setAPIKey,
    unsplashAccessKeyRef,
    unsplashKeyInput
  ])

  const clearKey = useCallback(() => {
    setAPIKey('')
    setKeyInput('')
    setHasExistingKey(false)
  }, [setAPIKey])

  const clearPexelsKey = useCallback(() => {
    pexelsApiKeyRef.value = ''
    setPexelsKeyInput('')
    setHasExistingPexelsKey(false)
  }, [pexelsApiKeyRef])

  const clearUnsplashKey = useCallback(() => {
    unsplashAccessKeyRef.value = ''
    setUnsplashKeyInput('')
    setHasExistingUnsplashKey(false)
  }, [unsplashAccessKeyRef])

  const setCustomAPIType = useCallback(
    (value: string) => {
      customAPITypeRef.value = value as 'completions' | 'responses'
      save()
    },
    [customAPITypeRef, save]
  )

  const testConnection = useCallback(async () => {
    if (connectionTestStatus === 'testing') return
    setConnectionTestStatus('testing')
    setConnectionTestReason(null)

    const result = await testProviderConnection({
      providerID: providerIDRef.value,
      apiKey: effectiveAPIKey,
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
    effectiveAPIKey,
    modelIDRef,
    providerDef.supportsCustomBaseURL,
    providerDef.supportsCustomModel,
    providerIDRef
  ])

  return useMemo(
    () => ({
      providerID,
      providerDef,
      apiKey,
      modelID,
      customAPIType,
      customBaseURL,
      customModelID,
      maxOutputTokens,
      pexelsApiKey,
      unsplashAccessKey,
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
      setMaxOutputTokens: (value: number) => {
        maxOutputTokensRef.value = value
      },
      save,
      clearKey,
      clearPexelsKey,
      clearUnsplashKey,
      setCustomAPIType,
      testConnection
    }),
    [
      apiKey,
      baseURLInput,
      canTestConnection,
      clearKey,
      clearPexelsKey,
      clearUnsplashKey,
      connectionTestReason,
      connectionTestStatus,
      customAPIType,
      customBaseURL,
      customModelID,
      customModelInput,
      hasExistingKey,
      hasExistingPexelsKey,
      hasExistingUnsplashKey,
      isACP,
      keyInput,
      maxOutputTokens,
      maxOutputTokensRef,
      modelID,
      pexelsApiKey,
      pexelsKeyInput,
      providerDef,
      providerID,
      save,
      setCustomAPIType,
      testConnection,
      unsplashAccessKey,
      unsplashKeyInput
    ]
  )
}

export type ProviderSettingsContext = ReturnType<typeof useProviderSettingsState>

const ProviderSettingsContext = createContext<ProviderSettingsContext | null>(null)
ProviderSettingsContext.displayName = 'ProviderSettings'

export function ProviderSettingsProvider({ children }: { children: ReactNode }) {
  const value = useProviderSettingsState()
  return (
    <ProviderSettingsContext.Provider value={value}>{children}</ProviderSettingsContext.Provider>
  )
}

export function useProviderSettingsContext(): ProviderSettingsContext {
  const ctx = useContext(ProviderSettingsContext)
  if (!ctx) throw new Error('Provider settings controls must be used within ProviderSettings')
  return ctx
}
