/**
 * Formerly asked rspack to probe a separate LangGraph process on :2024.
 * Companion health is now the MCP HTTP server (same Node service on :7600),
 * started by the rspack automation plugin / desktop shell — nothing to ensure here.
 */
export const AGENT_SERVER_ENSURE_PATH = '/__openpencil-agent-server/ensure'

export async function ensureDevAgentServer(
  _apiUrl: string,
  _options?: { signal?: AbortSignal }
): Promise<boolean> {
  return false
}
