import { useChat } from '@ai-sdk/react'
import { DirectChatTransport, stepCountIs, ToolLoopAgent } from 'ai'
import type { ChatTransport, UIMessage } from 'ai'
import type { ReadableAtom } from 'nanostores'

import { ACP_AGENTS } from '@open-pencil/core/constants'
import type { ACPAgentID, AIProviderID } from '@open-pencil/core/constants'

import { createLanguageModel, resolveLanguageModelID } from '@/app/ai/chat/model'
import SYSTEM_PROMPT from '@/app/ai/chat/system-prompt.md?raw'
import { MAX_AGENT_STEPS, createAITools, recordStepUsage, resetRunSteps } from '@/app/ai/tools'
import type { getActiveEditorStore } from '@/app/editor/active-store'

type EditorStore = ReturnType<typeof getActiveEditorStore>

type ChatSessionOptions = {
  isConfigured: ReadableAtom<boolean>
  isACPProvider: ReadableAtom<boolean>
  providerID: ReadableAtom<AIProviderID>
  apiKey: ReadableAtom<string>
  modelID: ReadableAtom<string>
  customModelID: ReadableAtom<string>
  customBaseURL: ReadableAtom<string>
  customAPIType: ReadableAtom<'completions' | 'responses'>
  maxOutputTokens: ReadableAtom<number>
  getActiveEditorStore: () => EditorStore
}

type ToolLoopTransportOptions = {
  store: EditorStore
  providerID: AIProviderID
  apiKey: string
  modelID: string
  customModelID: string
  customBaseURL: string
  customAPIType: 'completions' | 'responses'
  maxOutputTokens: number
}

const ANTHROPIC_CACHE_CONTROL = {
  anthropic: { cacheControl: { type: 'ephemeral' } }
} as const

function supportsAnthropicCaching(providerID: AIProviderID, modelID: string): boolean {
  return (
    providerID === 'anthropic' ||
    providerID === 'anthropic-compatible' ||
    (providerID === 'openrouter' && modelID.startsWith('anthropic/'))
  )
}

export async function createACPTransport(providerID: AIProviderID) {
  const agentId = providerID.replace('acp:', '') as ACPAgentID
  const agentDef = ACP_AGENTS.find((a) => a.id === agentId)
  if (!agentDef) throw new Error(`Unknown ACP agent: ${agentId}`)

  const { ACPChatTransport } = await import('@/app/ai/acp/transport')
  const { homeDir } = await import('@tauri-apps/api/path')
  return new ACPChatTransport({ agentDef, cwd: await homeDir() })
}

export function createToolLoopTransport({
  store,
  providerID,
  apiKey,
  modelID,
  customModelID,
  customBaseURL,
  customAPIType,
  maxOutputTokens
}: ToolLoopTransportOptions) {
  const tools = createAITools(store)
  const effectiveModelID = resolveLanguageModelID({ providerID, modelID, customModelID })
  const cacheProviderOptions = supportsAnthropicCaching(providerID, effectiveModelID)
    ? ANTHROPIC_CACHE_CONTROL
    : undefined

  const agent = new ToolLoopAgent({
    model: createLanguageModel({
      providerID,
      apiKey,
      modelID,
      customModelID,
      customBaseURL,
      customAPIType
    }),
    instructions: SYSTEM_PROMPT,
    tools,
    stopWhen: stepCountIs(MAX_AGENT_STEPS),
    maxOutputTokens,
    providerOptions: cacheProviderOptions,
    prepareCall: (options) => {
      resetRunSteps(store)
      return {
        ...options,
        maxOutputTokens,
        providerOptions: cacheProviderOptions
      }
    },
    onStepFinish: ({ usage }) => {
      recordStepUsage(
        {
          inputTokens: usage.inputTokens ?? 0,
          outputTokens: usage.outputTokens ?? 0,
          cacheReadTokens: usage.inputTokenDetails.cacheReadTokens ?? 0,
          cacheWriteTokens: usage.inputTokenDetails.cacheWriteTokens ?? 0,
          timestamp: Date.now()
        },
        store
      )
    }
  })

  return new DirectChatTransport({ agent }) as ChatTransport<UIMessage>
}

export function createChatSessionManager({
  isConfigured,
  isACPProvider,
  providerID,
  apiKey,
  modelID,
  customModelID,
  customBaseURL,
  customAPIType,
  maxOutputTokens,
  getActiveEditorStore
}: ChatSessionOptions) {
  let transportDirty = false
  let currentChatStore: EditorStore | null = null
  let currentChatMessages = new WeakMap<EditorStore, UIMessage[]>()
  let chat: ReturnType<typeof useChat> | null = null
  let acpTransportInstance: { destroy(): Promise<void> } | null = null
  let overrideTransport: (() => ChatTransport<UIMessage>) | null = null

  function markTransportDirty() {
    transportDirty = true
    currentChatStore = null
    currentChatMessages = new WeakMap()
  }

  async function createActiveACPTransport() {
    await acpTransportInstance?.destroy()
    const transport = await createACPTransport(providerID.get())
    acpTransportInstance = transport
    return transport as ChatTransport<UIMessage>
  }

  function createTransport(store: EditorStore) {
    if (overrideTransport) return overrideTransport()

    void acpTransportInstance?.destroy()
    acpTransportInstance = null

    return createToolLoopTransport({
      store,
      providerID: providerID.get(),
      apiKey: apiKey.get(),
      modelID: modelID.get(),
      customModelID: customModelID.get(),
      customBaseURL: customBaseURL.get(),
      customAPIType: customAPIType.get(),
      maxOutputTokens: maxOutputTokens.get()
    })
  }

  async function ensureChat(
    chatHook: ReturnType<typeof useChat>
  ): Promise<ReturnType<typeof useChat> | null> {
    if (!isConfigured.get()) return null

    const store = getActiveEditorStore()
    chat = chatHook

    if (!chat || transportDirty || currentChatStore !== store) {
      currentChatStore = store
      transportDirty = false

      if (isACPProvider.get()) {
        await createActiveACPTransport()
      } else {
        createTransport(store)
      }
    }
    return chat
  }

  function resetChat() {
    if (currentChatStore) currentChatMessages.delete(currentChatStore)
    chat = null
    currentChatStore = null
    transportDirty = false
  }

  function setOverrideTransport(factory: (() => ChatTransport<UIMessage>) | null) {
    overrideTransport = factory
    markTransportDirty()
  }

  return { ensureChat, resetChat, markTransportDirty, setOverrideTransport }
}
