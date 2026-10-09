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

/** Shared plan-first phases (Edit execute / Dev generate). */
export type ChatPlanPhase =
  | 'route'
  | 'loading-skills'
  | 'execute'
  | 'generate'
  | 'done'

export type DesignChatPhase = Exclude<ChatPlanPhase, 'generate'>
export type DesignPlanArtifacts = {
  thinking: string
  plan: string
  steps: string
}

export type ChatMessage = {
  id: string
  role: 'user' | 'assistant'
  parts: ChatMessagePart[]
  /** Parsed route-phase plan; kept while tools / codegen run. */
  planArtifacts?: DesignPlanArtifacts
  phase?: ChatPlanPhase
  selectedSkillKeys?: string[]
  reasoning?: string
}

export function isTextPart(part: ChatMessagePart): part is ChatTextPart {
  return part.type === 'text'
}

export function isToolPart(part: ChatMessagePart): part is ChatToolPart {
  return part.type === 'tool'
}
