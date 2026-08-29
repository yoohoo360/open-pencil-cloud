import SYSTEM_PROMPT from '#react/app/ai/chat/system-prompt.md?raw'
import type { EditorStore } from '#react/app/editor/store'
import type { ChatMessage, ChatMessagePart, ChatToolPart } from '#react/app/ai/chat/types'
import { throwChatHttpError } from '#react/app/ai/chat/provider-error'
import type { ChatProviderSettings } from '#react/app/ai/chat/settings'
import {
  designToolsAsOpenAI,
  executeDesignTool,
  MAX_AGENT_STEPS
} from '#react/app/ai/chat/tools'
import { chatCompletionsURL } from '#react/app/ai/chat/url'

type OpenAIToolCall = {
  id: string
  type: 'function'
  function: { name: string; arguments: string }
}

type OpenAIChatMessage =
  | { role: 'system'; content: string }
  | { role: 'user'; content: string }
  | { role: 'assistant'; content: string | null; tool_calls?: OpenAIToolCall[] }
  | { role: 'tool'; tool_call_id: string; content: string }

type ToolCallDelta = {
  index?: number
  id?: string
  type?: string
  function?: { name?: string; arguments?: string }
}

const TOOLS = designToolsAsOpenAI()

export async function streamChatCompletion(options: {
  store: EditorStore
  settings: ChatProviderSettings
  messages: ChatMessage[]
  signal?: AbortSignal
  onAssistantParts: (parts: ChatMessagePart[]) => void
}): Promise<void> {
  const openaiMessages = toOpenAIMessages(options.messages)
  const completed: ChatMessagePart[] = []

  for (let step = 0; step < MAX_AGENT_STEPS; step++) {
    const streamed = await streamOnce({
      settings: options.settings,
      messages: openaiMessages,
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

    for (const [index, call] of streamed.toolCalls.entries()) {
      const args = parseToolArguments(call.function.arguments)
      const executed = await executeDesignTool(options.store, call.function.name, args)
      const part = toolParts[index]
      if (executed.ok) {
        part.state = 'output-available'
        part.output = executed.result
        openaiMessages.push({
          role: 'tool',
          tool_call_id: call.id,
          content: JSON.stringify(executed.result ?? null)
        })
      } else {
        part.state = 'output-error'
        part.errorText = executed.error
        openaiMessages.push({
          role: 'tool',
          tool_call_id: call.id,
          content: JSON.stringify({ error: executed.error })
        })
      }
      options.onAssistantParts([...completed])
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

async function streamOnce(options: {
  settings: ChatProviderSettings
  messages: OpenAIChatMessage[]
  signal?: AbortSignal
  onPartial: (text: string, toolCalls: OpenAIToolCall[]) => void
}): Promise<{ text: string; toolCalls: OpenAIToolCall[] }> {
  const response = await fetch(chatCompletionsURL(options.settings.baseURL), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${options.settings.apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: options.settings.model,
      stream: true,
      tools: TOOLS,
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
        return { text, toolCalls: completedToolCalls(toolCalls) }
      }
      try {
        const parsed = JSON.parse(data) as {
          choices?: Array<{
            delta?: {
              content?: string | null
              tool_calls?: ToolCallDelta[]
            }
            finish_reason?: string | null
          }>
        }
        const delta = parsed.choices?.[0]?.delta
        if (!delta) continue
        if (typeof delta.content === 'string' && delta.content) text += delta.content
        mergeToolCallDeltas(toolCalls, delta.tool_calls)
        options.onPartial(text, toolCalls)
      } catch {
        // Ignore malformed SSE chunks.
      }
    }
  }
  return { text, toolCalls: completedToolCalls(toolCalls) }
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

function toOpenAIMessages(messages: ChatMessage[]): OpenAIChatMessage[] {
  const converted: OpenAIChatMessage[] = [{ role: 'system', content: SYSTEM_PROMPT }]
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
    const tools = message.parts.filter((part): part is ChatToolPart => part.type === 'tool')
    if (tools.length === 0) {
      converted.push({ role: 'assistant', content: text })
      continue
    }
    converted.push({
      role: 'assistant',
      content: text || null,
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
