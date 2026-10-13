/**
 * @deprecated Design / codegen chat no longer streams through LangGraph `useStream`
 * for the main turn. Probe still marks `runtimeMode: 'agent-server'`, but plan →
 * tasks → per-tier models → canvas/codegen tools run in {@link useAIChat} /
 * {@link useCodegenChat} so the UI updates live.
 *
 * Kept as a stub so older imports fail clearly at typecheck if reintroduced.
 */

export type AgentServerAssistantId = 'design' | 'codegen'

export function useAgentServerChat(_options: {
  assistantId: AgentServerAssistantId
}): never {
  throw new Error(
    'useAgentServerChat is retired. Use useAIChat / useCodegenChat (client harness) instead.'
  )
}
