import { atom } from 'nanostores'

import { AUTOMATION_HTTP_PORT, IS_BROWSER } from '@open-pencil/core/constants'

const STORAGE_KEY = 'open-pencil:react-chat'

/** Cursor-style model capability band for agent auto-routing. */
export type ModelTier = 'high' | 'medium' | 'low'

export type ChatModelEntry = {
  id: string
  /** Display name in the picker. */
  name: string
  /** Provider model id sent to the API. */
  modelId: string
  tier: ModelTier
  enabled: boolean
}

export type ChatProviderSettings = {
  apiKey: string
  baseURL: string
  /**
   * Which model the chat uses:
   * - `auto` — agent picks an enabled model by requested tier
   * - otherwise a `ChatModelEntry.id`
   */
  activeModelId: 'auto' | string
  models: ChatModelEntry[]
  /**
   * Local companion base URL (MCP HTTP on :7600). When reachable (`GET /ok`),
   * the chat runtime badge shows Agent Server; turns still run via local fetch BYOK.
   */
  agentServerUrl: string
}

const DEFAULT_MODEL: ChatModelEntry = {
  id: 'default-gpt-4o-mini',
  name: 'GPT-4o mini',
  modelId: 'gpt-4o-mini',
  tier: 'medium',
  enabled: true
}

const DEFAULTS: ChatProviderSettings = {
  apiKey: '',
  baseURL: 'https://api.openai.com/v1',
  activeModelId: 'auto',
  models: [structuredClone(DEFAULT_MODEL)],
  agentServerUrl: `http://127.0.0.1:${AUTOMATION_HTTP_PORT}`
}

/** Migrate the retired LangGraph :2024 URL onto the shared MCP companion port. */
function normalizeAgentServerUrl(value: unknown): string {
  const fallback = DEFAULTS.agentServerUrl
  if (typeof value !== 'string' || !value.trim()) return fallback
  const trimmed = value.trim().replace(/\/+$/, '')
  try {
    const url = new URL(trimmed)
    if (
      (url.hostname === '127.0.0.1' || url.hostname === 'localhost') &&
      url.port === '2024'
    ) {
      url.port = String(AUTOMATION_HTTP_PORT)
      return url.toString().replace(/\/$/, '')
    }
  } catch {
    return fallback
  }
  return trimmed
}

function newModelEntryId(): string {
  const bytes = new Uint8Array(8)
  crypto.getRandomValues(bytes)
  return `model-${[...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('')}`
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function normalizeTier(value: unknown): ModelTier {
  if (value === 'high' || value === 'medium' || value === 'low') return value
  return 'medium'
}

function normalizeModelEntry(value: unknown, index: number): ChatModelEntry | null {
  if (!isRecord(value)) return null
  const modelId =
    typeof value.modelId === 'string'
      ? value.modelId.trim()
      : typeof value.model === 'string'
        ? value.model.trim()
        : ''
  if (!modelId) return null
  const id =
    typeof value.id === 'string' && value.id.trim()
      ? value.id.trim()
      : `migrated-${index}-${modelId}`
  const name =
    typeof value.name === 'string' && value.name.trim() ? value.name.trim() : modelId
  return {
    id,
    name,
    modelId,
    tier: normalizeTier(value.tier),
    enabled: value.enabled !== false
  }
}

/** Normalize / migrate stored settings (including legacy single `model` string). */
export function normalizeChatProviderSettings(value: unknown): ChatProviderSettings {
  const stored = isRecord(value) ? value : undefined
  const apiKey = typeof stored?.apiKey === 'string' ? stored.apiKey : ''
  const baseURL =
    typeof stored?.baseURL === 'string' && stored.baseURL.trim()
      ? stored.baseURL.trim()
      : DEFAULTS.baseURL

  let models: ChatModelEntry[] = []
  if (Array.isArray(stored?.models)) {
    models = stored.models
      .map((entry, index) => normalizeModelEntry(entry, index))
      .filter((entry): entry is ChatModelEntry => entry !== null)
  }

  // Legacy: single `model` field → one medium model.
  if (models.length === 0 && typeof stored?.model === 'string' && stored.model.trim()) {
    models = [
      {
        id: 'legacy-default',
        name: stored.model.trim(),
        modelId: stored.model.trim(),
        tier: 'medium',
        enabled: true
      }
    ]
  }

  if (models.length === 0) models = [structuredClone(DEFAULT_MODEL)]

  const activeRaw = typeof stored?.activeModelId === 'string' ? stored.activeModelId : 'auto'
  const activeModelId =
    activeRaw === 'auto' || models.some((model) => model.id === activeRaw) ? activeRaw : 'auto'

  return {
    apiKey,
    baseURL,
    activeModelId,
    models,
    agentServerUrl: normalizeAgentServerUrl(stored?.agentServerUrl)
  }
}

function readSettings(): ChatProviderSettings {
  if (!IS_BROWSER) return structuredClone(DEFAULTS)
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return structuredClone(DEFAULTS)
    return normalizeChatProviderSettings(JSON.parse(raw) as unknown)
  } catch {
    return structuredClone(DEFAULTS)
  }
}

export const chatProviderSettings = atom<ChatProviderSettings>(readSettings())

chatProviderSettings.subscribe((value) => {
  if (!IS_BROWSER) return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(value))
})

export function enabledChatModels(
  settings = chatProviderSettings.get()
): ChatModelEntry[] {
  return settings.models.filter((model) => model.enabled && model.modelId.trim())
}

export function isChatConfigured(settings = chatProviderSettings.get()): boolean {
  return settings.apiKey.trim().length > 0 && enabledChatModels(settings).length > 0
}

export function setChatProviderSettings(patch: Partial<ChatProviderSettings>) {
  const current = chatProviderSettings.get()
  chatProviderSettings.set(
    normalizeChatProviderSettings({
      ...current,
      ...patch,
      models: patch.models ?? current.models
    })
  )
}

export function createChatModelEntry(
  partial?: Partial<Omit<ChatModelEntry, 'id'>> & { id?: string }
): ChatModelEntry {
  const modelId = partial?.modelId?.trim() || 'gpt-4o-mini'
  return {
    id: partial?.id?.trim() || newModelEntryId(),
    name: partial?.name?.trim() || modelId,
    modelId,
    tier: partial?.tier ?? 'medium',
    enabled: partial?.enabled !== false
  }
}

export function upsertChatModel(entry: ChatModelEntry) {
  const current = chatProviderSettings.get()
  const models = [...current.models]
  const index = models.findIndex((model) => model.id === entry.id)
  if (index >= 0) models[index] = entry
  else models.push(entry)
  setChatProviderSettings({ models })
}

export function removeChatModel(id: string) {
  const current = chatProviderSettings.get()
  const models = current.models.filter((model) => model.id !== id)
  const activeModelId =
    current.activeModelId === id || models.length === 0 ? 'auto' : current.activeModelId
  setChatProviderSettings({
    models: models.length > 0 ? models : [structuredClone(DEFAULT_MODEL)],
    activeModelId
  })
}

export function setActiveChatModelId(activeModelId: 'auto' | string) {
  setChatProviderSettings({ activeModelId })
}

/** Resolved credentials for one API call. */
export type ResolvedChatModel = {
  apiKey: string
  baseURL: string
  model: string
  entry: ChatModelEntry
  /** Whether selection was Auto. */
  auto: boolean
  requestedTier: ModelTier
}

const TIER_RANK: Record<ModelTier, number> = { low: 0, medium: 1, high: 2 }

/**
 * Pick the model for a call.
 * Manual selection wins; Auto picks the closest enabled model by tier
 * (exact → higher → lower).
 */
export function resolveChatModel(
  settings: ChatProviderSettings = chatProviderSettings.get(),
  preferredTier: ModelTier = 'medium'
): ResolvedChatModel | null {
  const enabled = enabledChatModels(settings)
  if (enabled.length === 0 || !settings.apiKey.trim()) return null

  const auto = settings.activeModelId === 'auto'
  let entry: ChatModelEntry | undefined

  if (!auto) {
    entry = enabled.find((model) => model.id === settings.activeModelId)
  }

  if (!entry) {
    const exact = enabled.filter((model) => model.tier === preferredTier)
    if (exact.length > 0) {
      entry = exact[0]
    } else {
      const want = TIER_RANK[preferredTier]
      const sorted = [...enabled].sort((left, right) => {
        const leftDelta = Math.abs(TIER_RANK[left.tier] - want)
        const rightDelta = Math.abs(TIER_RANK[right.tier] - want)
        if (leftDelta !== rightDelta) return leftDelta - rightDelta
        // Prefer higher tier on ties (better quality).
        return TIER_RANK[right.tier] - TIER_RANK[left.tier]
      })
      entry = sorted[0]
    }
  }

  if (!entry) return null
  return {
    apiKey: settings.apiKey,
    baseURL: settings.baseURL,
    model: entry.modelId,
    entry,
    auto,
    requestedTier: preferredTier
  }
}

/** Label for the chat composer model chip. */
export function chatModelSelectionLabel(
  settings: ChatProviderSettings = chatProviderSettings.get()
): string {
  if (settings.activeModelId === 'auto') return 'Auto'
  const entry = settings.models.find((model) => model.id === settings.activeModelId)
  return entry?.name || entry?.modelId || 'Auto'
}
