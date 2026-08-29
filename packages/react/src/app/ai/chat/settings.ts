import { atom } from 'nanostores'

import { IS_BROWSER } from '@open-pencil/core/constants'

const STORAGE_KEY = 'open-pencil:react-chat'

export type ChatProviderSettings = {
  apiKey: string
  baseURL: string
  model: string
}

const DEFAULTS: ChatProviderSettings = {
  apiKey: '',
  baseURL: 'https://api.openai.com/v1',
  model: 'gpt-4o-mini'
}

function readSettings(): ChatProviderSettings {
  if (!IS_BROWSER) return { ...DEFAULTS }
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...DEFAULTS }
    const parsed = JSON.parse(raw) as Partial<ChatProviderSettings>
    return {
      apiKey: typeof parsed.apiKey === 'string' ? parsed.apiKey : '',
      baseURL: typeof parsed.baseURL === 'string' && parsed.baseURL.trim() ? parsed.baseURL : DEFAULTS.baseURL,
      model: typeof parsed.model === 'string' && parsed.model.trim() ? parsed.model : DEFAULTS.model
    }
  } catch {
    return { ...DEFAULTS }
  }
}

export const chatProviderSettings = atom<ChatProviderSettings>(readSettings())

chatProviderSettings.subscribe((value) => {
  if (!IS_BROWSER) return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(value))
})

export function isChatConfigured(settings = chatProviderSettings.get()): boolean {
  return settings.apiKey.trim().length > 0 && settings.model.trim().length > 0
}

export function setChatProviderSettings(patch: Partial<ChatProviderSettings>) {
  chatProviderSettings.set({ ...chatProviderSettings.get(), ...patch })
}
