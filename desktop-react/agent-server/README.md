# Agent Server (desktop-react)

LangGraph graphs used by Design / Dev chat when the page probes a local Agent Server.
Owned by `desktop-react/` (formerly `tools/dev/agent-server` / `@open-pencil/agent-server-tools`).

| Assistant | Graph |
| --- | --- |
| `design` | `src/graphs/design.ts` |
| `codegen` | `src/graphs/codegen.ts` |

## Startup

From `desktop-react/`:

```bash
bun run start:agent-server
# or both MCP + Agent Server:
bun run start:services
```

With `packages/react` `bun start`, rspack registers `POST /__openpencil-agent-server/ensure` to **probe** an already-running server (it does not spawn one).

Credentials: Settings AI panel (`apiKey` / `baseURL` / model) as run `configurable`. Env keys are optional CLI fallbacks only.

Disable: `OPENPENCIL_DISABLE_AGENT_SERVER=1`. Port: `OPENPENCIL_AGENT_SERVER_PORT` (default `2024`).

Tests: `bun run test:agent-server` from `desktop-react/`.
