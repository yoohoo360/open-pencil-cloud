import { atom } from 'nanostores'

import { IS_BROWSER } from '@open-pencil/core/constants'

import {
  chatProviderSettings,
  type ChatProviderSettings
} from '#react/app/ai/chat/settings'
import { ensureDevAgentServer } from '#react/app/ai/runtime/ensure-agent-server'
import {
  DEFAULT_AGENT_SERVER_URL,
  probeAgentServer
} from '#react/app/ai/runtime/probe'

/** How chat request/response is transported. */
export type ChatRuntimeMode = 'agent-server' | 'fetch'

export type ChatRuntimeState = {
  mode: ChatRuntimeMode
  /** Last successful probe URL when mode is agent-server. */
  apiUrl: string
  probing: boolean
  lastCheckedAt: number | null
}

const INITIAL: ChatRuntimeState = {
  mode: 'fetch',
  apiUrl: DEFAULT_AGENT_SERVER_URL,
  probing: false,
  lastCheckedAt: null
}

export const chatRuntimeState = atom<ChatRuntimeState>(INITIAL)

let probeGeneration = 0

export function agentServerUrlFromSettings(
  settings: ChatProviderSettings = chatProviderSettings.get()
): string {
  const raw = settings.agentServerUrl?.trim()
  return raw && raw.length > 0 ? raw.replace(/\/+$/, '') : DEFAULT_AGENT_SERVER_URL
}

/** Probe once (e.g. before sending a chat turn, or from Settings). No polling. */
export async function refreshChatRuntimeMode(options?: {
  signal?: AbortSignal
  /** When true, ask rspack to lazy-start the local Agent Server before probing. */
  ensure?: boolean
}): Promise<ChatRuntimeState> {
  const generation = ++probeGeneration
  const apiUrl = agentServerUrlFromSettings()
  chatRuntimeState.set({
    ...chatRuntimeState.get(),
    probing: true,
    apiUrl
  })
  if (options?.ensure) {
    await ensureDevAgentServer(apiUrl, { signal: options?.signal })
    if (generation !== probeGeneration) return chatRuntimeState.get()
  }
  const ok = await probeAgentServer(apiUrl, { signal: options?.signal })
  if (generation !== probeGeneration) return chatRuntimeState.get()
  const next: ChatRuntimeState = {
    mode: ok ? 'agent-server' : 'fetch',
    apiUrl,
    probing: false,
    lastCheckedAt: Date.now()
  }
  chatRuntimeState.set(next)
  return next
}

/** Keep the settings URL on the atom; do not probe until the next send / manual check. */
if (IS_BROWSER) {
  chatProviderSettings.subscribe((settings) => {
    const next = agentServerUrlFromSettings(settings)
    const current = chatRuntimeState.get()
    if (next === current.apiUrl) return
    chatRuntimeState.set({
      ...current,
      apiUrl: next,
      mode: 'fetch',
      lastCheckedAt: null
    })
  })
}
