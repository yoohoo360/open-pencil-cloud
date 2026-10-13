/**
 * Start the LangGraph Agent Server for local React chat probes.
 * Run via `bun run start:agent-server` — not started by `packages/react` `bun start`.
 */
import {
  agentServerBaseUrl,
  agentServerDisabled,
  startAgentServer,
  waitForAgentServer
} from '@open-pencil/agent-server-tools/spawn'

if (agentServerDisabled()) {
  console.error('Agent Server disabled (OPENPENCIL_DISABLE_AGENT_SERVER)')
  process.exit(1)
}

const handle = startAgentServer({
  onWarn: (line) => console.warn(`[agent-server] ${line}`)
})
if (!handle) {
  console.error('Failed to start Agent Server (is @langchain/langgraph-cli installed?)')
  process.exit(1)
}

const ready = await waitForAgentServer(handle.port)
const url = agentServerBaseUrl(handle.port)
if (!ready) {
  console.error(`[agent-server] timed out waiting for GET /ok at ${url}`)
  handle.stop()
  process.exit(1)
}

console.info(`[agent-server] ${url}`)
console.info('[agent-server] running — Ctrl+C to stop')

await new Promise<void>((resolve) => {
  const stop = () => {
    handle.stop()
    resolve()
  }
  process.once('SIGINT', stop)
  process.once('SIGTERM', stop)
})
