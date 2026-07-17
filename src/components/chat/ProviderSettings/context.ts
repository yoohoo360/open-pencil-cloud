import { createContext, useContext } from 'react'

import type { ReadableAtom, WritableAtom } from 'nanostores'

import type { AIProviderID } from '@open-pencil/core/constants'
import type { ProviderConnectionTestFailureReason } from '@/app/ai/chat/connection-test'

export type ProviderSettingsContext = {
  providerID: WritableAtom<AIProviderID>
  providerDef: ReadableAtom<{ supportsCustomBaseURL?: boolean; supportsCustomModel?: boolean; defaultModel?: string }>
  apiKey: WritableAtom<string>
  modelID: WritableAtom<string>
  customAPIType: WritableAtom<'completions' | 'responses'>
  customBaseURL: WritableAtom<string>
  customModelID: WritableAtom<string>
  maxOutputTokens: WritableAtom<number>
  pexelsApiKey: WritableAtom<string>
  unsplashAccessKey: WritableAtom<string>
  isACP: boolean
  keyInput: string
  setKeyInput: (value: string) => void
  pexelsKeyInput: string
  setPexelsKeyInput: (value: string) => void
  unsplashKeyInput: string
  setUnsplashKeyInput: (value: string) => void
  baseURLInput: string
  setBaseURLInput: (value: string) => void
  customModelInput: string
  setCustomModelInput: (value: string) => void
  hasExistingKey: boolean
  hasExistingPexelsKey: boolean
  hasExistingUnsplashKey: boolean
  connectionTestStatus: 'idle' | 'testing' | 'success' | 'error'
  connectionTestReason: ProviderConnectionTestFailureReason | null
  canTestConnection: boolean
  save: () => void
  clearKey: () => void
  clearPexelsKey: () => void
  clearUnsplashKey: () => void
  setCustomAPIType: (value: string) => void
  testConnection: () => Promise<void>
}

const ProviderSettingsReactContext = createContext<ProviderSettingsContext | null>(null)

export const ProviderSettingsContextProvider = ProviderSettingsReactContext.Provider

export function useProviderSettingsContext(): ProviderSettingsContext {
  const ctx = useContext(ProviderSettingsReactContext)
  if (!ctx) throw new Error('Provider settings controls must be used within ProviderSettings')
  return ctx
}
