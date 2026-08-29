export type ChatStatus = 'ready' | 'submitted' | 'streaming' | 'error'

export type ChatFailureReason =
  | 'insufficient-credit'
  | 'output-limit'
  | 'vision-unsupported'
  | 'request-failed'

export type ChatFailure = {
  reason: ChatFailureReason
}

export type ChatTextPart = {
  type: 'text'
  text: string
}

export type ChatToolPart = {
  type: 'tool'
  toolCallId: string
  toolName: string
  state: 'input-available' | 'output-available' | 'output-error'
  input?: unknown
  output?: unknown
  errorText?: string
}

export type ChatMessagePart = ChatTextPart | ChatToolPart

export type ChatMessage = {
  id: string
  role: 'user' | 'assistant'
  parts: ChatMessagePart[]
}

export function isTextPart(part: ChatMessagePart): part is ChatTextPart {
  return part.type === 'text'
}

export function isToolPart(part: ChatMessagePart): part is ChatToolPart {
  return part.type === 'tool'
}
