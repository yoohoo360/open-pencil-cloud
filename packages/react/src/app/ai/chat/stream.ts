import SYSTEM_PROMPT from '#react/app/ai/chat/system-prompt.md?raw'
import type { EditorStore } from '#react/app/editor/store'
import type { ChatMessage, ChatMessagePart, ChatToolPart } from '#react/app/ai/chat/types'
import { throwChatHttpError } from '#react/app/ai/chat/provider-error'
import {
  resolveChatModel,
  type ChatProviderSettings,
  type ModelTier
} from '#react/app/ai/chat/settings'
import {
  createDesignToolSession,
  designToolsAsOpenAI,
  executeDesignTool,
  INSERT_SKILL_TEMPLATE,
  MAX_AGENT_STEPS,
  pruneUnmountedAfterAiTurn,
  type DesignToolSession
} from '#react/app/ai/chat/tools'
import type { SkillTemplateEntry } from '#react/app/ai/chat/tools-catalog'
import { planDesignToolWaves, runDesignToolWaves } from '#react/app/ai/chat/tool-waves'
import { chatCompletionsURL } from '#react/app/ai/chat/url'

type OpenAIToolCall = {
  id: string
  type: 'function'
  function: { name: string; arguments: string }
}

type OpenAIChatMessage =
  | { role: 'system'; content: string }
  | { role: 'user'; content: string }
  | {
      role: 'assistant'
      content: string | null
      /** Required by thinking-mode providers when the request includes `tools`. */
      reasoning_content?: string
      tool_calls?: OpenAIToolCall[]
    }
  | { role: 'tool'; tool_call_id: string; content: string }

/** DeepSeek thinking mode rejects empty reasoning on tool turns; a space satisfies the check. */
const REASONING_PLACEHOLDER = ' '

type ToolCallDelta = {
  index?: number
  id?: string
  type?: string
  function?: { name?: string; arguments?: string }
}

export async function streamChatCompletion(options: {
  store: EditorStore
  settings: ChatProviderSettings
  messages: ChatMessage[]
  /** Appended after the base design system prompt (plan, skills, scene notes). */
  systemExtra?: string
  /** Design clipboard templates from loaded skills (insert_skill_template). */
  skillTemplates?: SkillTemplateEntry[]
  /**
   * When true, paste skill clipboard templates onto the canvas before the agent runs.
   * Used instead of forced tool_choice (unsupported in thinking mode). Skip on follow-ups.
   */
  preinsertTemplates?: boolean
  /** Auto mode uses this tier to pick a model (default high for tool-using agent). */
  tier?: ModelTier
  signal?: AbortSignal
  onAssistantParts: (parts: ChatMessagePart[]) => void
}): Promise<void> {
  const resolved = resolveChatModel(options.settings, options.tier ?? 'high')
  if (!resolved) throw new Error('Configure at least one enabled AI model.')
  const openaiMessages = toOpenAIMessages(options.messages, options.systemExtra)
  const completed: ChatMessagePart[] = []
  const toolSession: DesignToolSession = createDesignToolSession(options.skillTemplates ?? [])
  let ranTools = false

  try {
    // Thinking-mode providers reject forced tool_choice — paste templates host-side instead.
    const preinserted =
      options.preinsertTemplates === true
        ? await preinsertSkillTemplates(options.store, toolSession)
        : []
    if (preinserted.length > 0) {
      ranTools = true
      // UI-only tool parts — do not inject synthetic assistant/tool_calls into the API
      // transcript (thinking mode requires real reasoning_content on those turns).
      const toolParts: ChatToolPart[] = preinserted.map((item) => ({
        type: 'tool',
        toolCallId: item.toolCallId,
        toolName: INSERT_SKILL_TEMPLATE,
        state: item.ok ? 'output-available' : 'output-error',
        input: { template_id: item.templateId },
        output: item.ok ? item.result : undefined,
        errorText: item.ok ? undefined : item.error
      }))
      completed.push(...toolParts)
      options.onAssistantParts([...completed])

      const createdSummary = preinserted
        .filter((item) => item.ok)
        .map((item) => JSON.stringify(item.result))
        .join('\n')
      const failedSummary = preinserted
        .filter((item) => !item.ok)
        .map((item) => `${item.templateId}: ${item.error}`)
        .join('\n')
      const note =
        `\n\n## Already pasted skill templates\n` +
        (createdSummary
          ? `Templates were pasted onto the canvas by the host. Modify these created node ids with batch_update / set_* / describe. Do not rebuild with render.\n${createdSummary}\n`
          : '') +
        (failedSummary ? `Template paste failures:\n${failedSummary}\n` : '')
      const systemMessage = openaiMessages[0]
      if (systemMessage?.role === 'system') {
        systemMessage.content += note
      } else {
        openaiMessages.unshift({ role: 'system', content: note.trim() })
      }
    }

    for (let step = 0; step < MAX_AGENT_STEPS; step++) {
      const streamed = await streamOnce({
        apiKey: resolved.apiKey,
        baseURL: resolved.baseURL,
        model: resolved.model,
        messages: openaiMessages,
        tools: designToolsAsOpenAI(toolSession),
        signal: options.signal,
        onPartial(text, pendingTools) {
          options.onAssistantParts([...completed, ...liveParts(text, pendingTools)])
        }
      })

      if (streamed.toolCalls.length === 0) {
        options.onAssistantParts([...completed, ...liveParts(streamed.text, [])])
        return
      }

      openaiMessages.push({
        role: 'assistant',
        content: streamed.text || null,
        reasoning_content: streamed.reasoning || REASONING_PLACEHOLDER,
        tool_calls: streamed.toolCalls
      })

      const toolParts: ChatToolPart[] = streamed.toolCalls.map((call) => ({
        type: 'tool',
        toolCallId: call.id,
        toolName: call.function.name,
        state: 'input-available',
        input: parseToolArguments(call.function.arguments)
      }))
      if (streamed.text) completed.push({ type: 'text', text: streamed.text })
      completed.push(...toolParts)
      options.onAssistantParts([...completed])

      // Serial execution only — CanvasKit/WASM cannot overlap tool work safely.
      // Many tool_calls in one model turn still save LLM round-trips.
      const indexed = streamed.toolCalls.map((call, index) => ({
        index,
        call,
        name: call.function.name
      }))
      const waves = planDesignToolWaves(indexed)
      const toolReplies = new Map<string, string>()

      await runDesignToolWaves(waves, async ({ index, call }) => {
        const args = parseToolArguments(call.function.arguments)
        const executed = await executeDesignTool(
          options.store,
          call.function.name,
          args,
          toolSession
        )
        ranTools = true
        const part = toolParts[index]
        if (executed.ok) {
          part.state = 'output-available'
          part.output = executed.result
          toolReplies.set(call.id, JSON.stringify(executed.result ?? null))
        } else {
          part.state = 'output-error'
          part.errorText = executed.error
          toolReplies.set(call.id, JSON.stringify({ error: executed.error }))
        }
        options.onAssistantParts([...completed])
      })

      // Preserve OpenAI tool-message order matching tool_calls.
      for (const call of streamed.toolCalls) {
        openaiMessages.push({
          role: 'tool',
          tool_call_id: call.id,
          content: toolReplies.get(call.id) ?? JSON.stringify({ error: 'Tool produced no reply' })
        })
      }
    }
  } finally {
    // Drop graph nodes never attached under the document root after a tool turn.
    if (ranTools && !options.signal?.aborted) {
      pruneUnmountedAfterAiTurn(options.store)
    }
  }
}

function liveParts(text: string, pendingTools: OpenAIToolCall[]): ChatMessagePart[] {
  const parts: ChatMessagePart[] = []
  if (text) parts.push({ type: 'text', text })
  for (const call of pendingTools) {
    if (!call.id || !call.function.name) continue
    parts.push({
      type: 'tool',
      toolCallId: call.id,
      toolName: call.function.name,
      state: 'input-available',
      input: parseToolArguments(call.function.arguments)
    })
  }
  return parts
}

function parseToolArguments(raw: string): Record<string, unknown> {
  if (!raw.trim()) return {}
  try {
    const parsed: unknown = JSON.parse(raw)
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {}
  } catch {
    return {}
  }
}

type PreinsertResult =
  | {
      ok: true
      toolCallId: string
      templateId: string
      result: unknown
    }
  | {
      ok: false
      toolCallId: string
      templateId: string
      error: string
    }

async function preinsertSkillTemplates(
  store: EditorStore,
  session: DesignToolSession
): Promise<PreinsertResult[]> {
  if (session.templates.size === 0) return []
  const results: PreinsertResult[] = []
  let index = 0
  for (const template of session.templates.values()) {
    const toolCallId = `host_insert_skill_template_${index}`
    index += 1
    const executed = await executeDesignTool(
      store,
      INSERT_SKILL_TEMPLATE,
      { template_id: template.id },
      session
    )
    if (executed.ok) {
      results.push({
        ok: true,
        toolCallId,
        templateId: template.id,
        result: executed.result
      })
    } else {
      results.push({
        ok: false,
        toolCallId,
        templateId: template.id,
        error: executed.error
      })
    }
  }
  return results
}

async function streamOnce(options: {
  apiKey: string
  baseURL: string
  model: string
  messages: OpenAIChatMessage[]
  tools: ReturnType<typeof designToolsAsOpenAI>
  signal?: AbortSignal
  onPartial: (text: string, toolCalls: OpenAIToolCall[]) => void
}): Promise<{ text: string; reasoning: string; toolCalls: OpenAIToolCall[] }> {
  const response = await fetch(chatCompletionsURL(options.baseURL), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${options.apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: options.model,
      stream: true,
      tools: options.tools,
      tool_choice: 'auto',
      messages: options.messages
    }),
    signal: options.signal
  })
  if (!response.ok) throwChatHttpError(response.status, await response.text())
  const reader = response.body?.getReader()
  if (!reader) throw new Error('Streaming is unavailable.')

  const decoder = new TextDecoder()
  let buffer = ''
  let text = ''
  let reasoning = ''
  const toolCalls: OpenAIToolCall[] = []

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''
    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed.startsWith('data:')) continue
      const data = trimmed.slice(5).trim()
      if (data === '[DONE]') {
        options.onPartial(text, toolCalls)
        return { text, reasoning, toolCalls: completedToolCalls(toolCalls) }
      }
      try {
        const parsed = JSON.parse(data) as {
          choices?: Array<{
            delta?: {
              content?: string | null
              reasoning_content?: string | null
              reasoning?: string | null
              tool_calls?: ToolCallDelta[]
            }
            finish_reason?: string | null
          }>
        }
        const delta = parsed.choices?.[0]?.delta
        if (!delta) continue
        if (typeof delta.content === 'string' && delta.content) text += delta.content
        const reasoningPiece = delta.reasoning_content ?? delta.reasoning ?? ''
        if (reasoningPiece) reasoning += reasoningPiece
        mergeToolCallDeltas(toolCalls, delta.tool_calls)
        options.onPartial(text, toolCalls)
      } catch {
        // Ignore malformed SSE chunks.
      }
    }
  }
  return { text, reasoning, toolCalls: completedToolCalls(toolCalls) }
}

function mergeToolCallDeltas(toolCalls: OpenAIToolCall[], deltas?: ToolCallDelta[]) {
  if (!deltas) return
  for (const delta of deltas) {
    const index = delta.index ?? toolCalls.length
    const current = toolCalls[index]
    if (!current) {
      toolCalls[index] = {
        id: delta.id ?? `call_${String(index)}`,
        type: 'function',
        function: {
          name: delta.function?.name ?? '',
          arguments: delta.function?.arguments ?? ''
        }
      }
      continue
    }
    if (delta.id) current.id = delta.id
    if (delta.function?.name) current.function.name += delta.function.name
    if (delta.function?.arguments) current.function.arguments += delta.function.arguments
  }
}

function completedToolCalls(toolCalls: OpenAIToolCall[]): OpenAIToolCall[] {
  return toolCalls.filter((call) => Boolean(call.id) && Boolean(call.function.name))
}

function toOpenAIMessages(messages: ChatMessage[], systemExtra?: string): OpenAIChatMessage[] {
  const system = systemExtra?.trim()
    ? `${SYSTEM_PROMPT}\n\n${systemExtra.trim()}`
    : SYSTEM_PROMPT
  const converted: OpenAIChatMessage[] = [{ role: 'system', content: system }]
  for (const message of messages) {
    if (message.role === 'user') {
      converted.push({
        role: 'user',
        content: message.parts
          .filter((part) => part.type === 'text')
          .map((part) => part.text)
          .join('\n')
      })
      continue
    }

    const text = message.parts
      .filter((part) => part.type === 'text')
      .map((part) => part.text)
      .join('\n')
    // Host-only template inserts are not real model turns — skip them in the API transcript.
    const tools = message.parts.filter(
      (part): part is ChatToolPart =>
        part.type === 'tool' && !part.toolCallId.startsWith('host_insert_skill_template')
    )
    const reasoning =
      message.reasoning && message.reasoning.trim().length > 0
        ? message.reasoning
        : REASONING_PLACEHOLDER
    if (tools.length === 0) {
      // Requests always send `tools`, so thinking-mode providers still want reasoning echoed.
      converted.push({ role: 'assistant', content: text, reasoning_content: reasoning })
      continue
    }
    converted.push({
      role: 'assistant',
      content: text || null,
      reasoning_content: reasoning,
      tool_calls: tools.map((part) => ({
        id: part.toolCallId,
        type: 'function' as const,
        function: {
          name: part.toolName,
          arguments: JSON.stringify(part.input ?? {})
        }
      }))
    })
    for (const part of tools) {
      converted.push({
        role: 'tool',
        tool_call_id: part.toolCallId,
        content: JSON.stringify(
          part.state === 'output-error' ? { error: part.errorText } : (part.output ?? null)
        )
      })
    }
  }
  return converted
}
