import { ChatOpenAI } from '@langchain/openai'

type ModelConfig = {
  apiKey?: string
  baseURL?: string
  model?: string
}

/**
 * Prefer page/settings credentials from run `configurable`
 * (apiKey, baseURL, model). Fall back to process env for local CLI only.
 */
export function chatModelFromConfig(config?: { configurable?: Record<string, unknown> }) {
  const configurable = (config?.configurable ?? {}) as ModelConfig
  const apiKey =
    (typeof configurable.apiKey === 'string' && configurable.apiKey.trim()) ||
    process.env.OPENAI_API_KEY?.trim() ||
    process.env.OPEN_PENCIL_API_KEY?.trim() ||
    ''
  const baseURL =
    (typeof configurable.baseURL === 'string' && configurable.baseURL.trim()) ||
    process.env.OPENAI_BASE_URL?.trim() ||
    process.env.OPEN_PENCIL_BASE_URL?.trim() ||
    undefined
  const model =
    (typeof configurable.model === 'string' && configurable.model.trim()) ||
    process.env.OPENAI_MODEL?.trim() ||
    process.env.OPEN_PENCIL_MODEL?.trim() ||
    'gpt-4o-mini'

  if (!apiKey) {
    throw new Error(
      'Missing API key. Configure AI in Settings (apiKey / baseURL / model) or set OPENAI_API_KEY.'
    )
  }

  return new ChatOpenAI({
    apiKey,
    model,
    configuration: baseURL ? { baseURL } : undefined,
    temperature: 0.2,
    streaming: true
  })
}
