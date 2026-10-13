# Agent Server (dev)

LangGraph graphs used by Design / Dev chat when the page probes a local Agent Server.

| Assistant | Graph |
| --- | --- |
| `design` | `src/graphs/design.ts` |
| `codegen` | `src/graphs/codegen.ts` |

## Startup (rspack only)

Not started with Vite. With `packages/react` `bun start`, rspack registers:

`POST /__openpencil-agent-server/ensure`

The page calls that path on the **first chat runtime probe** (opening Chat / Make chat). Until then LangGraph is not spawned. Chat falls back to browser fetch BYOK if ensure or `GET /ok` fails.

Credentials: Settings AI panel (`apiKey` / `baseURL` / model) as run `configurable`. Env keys are optional CLI fallbacks only.

Skills: the page chat skill picker selection is sent as `skillsCatalog` + `skillPackages` in the same `configurable`; graphs append them to the system prompt.

Chat UX: the page still probes Agent Server for the runtime badge, but Design / Make turns run in the **client harness** (live streaming, `<tasks>` waves, per-tier models, canvas tools). LangGraph graphs remain available for Studio / experiments.

Disable: `OPENPENCIL_DISABLE_AGENT_SERVER=1`. Port: `OPENPENCIL_AGENT_SERVER_PORT` (default `2024`).
