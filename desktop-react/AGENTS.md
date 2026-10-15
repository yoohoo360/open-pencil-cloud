# Desktop React (Tauri v2)

React-facing desktop shell, copied from `desktop/` so the Vue Tauri app stays untouched.
Paths here are relative to `desktop-react/`. Do not put desktop-react scripts in the repo root `package.json`.

## Commands (from `desktop-react/`)

```bash
bun run generate:menu      # React native menu → generated/
bun run start:frontend     # packages/react rspack (also starts the local MCP child in DEV)
bun run start:mcp          # MCP HTTP on :7600 (runs packages/mcp)
bun run start:agent-server # LangGraph Agent Server
bun run start:services     # MCP + Agent Server together
bun run dev                # tauri dev (runs generate:menu + start:frontend via beforeDevCommand)
bun run build              # tauri build
```

Local companion processes for this shell are owned here: `scripts/` (`start-mcp.ts`, `start-agent-server.ts`, `start-services.ts`, `ensure-mcp-binary.ts`) and `agent-server/` (LangGraph graphs + spawn). MCP **core** stays in `packages/mcp`. `packages/react` imports spawn via `@open-pencil/desktop-react/agent-server/spawn` and forwards `start:mcp` / `start:agent-server` / `start:services` here.

## Notes

- Main window loads React over HTTP (`src/frontend.rs`). Defaults match `packages/react/src/config` `FRONTEND_BASE_URL` (`OPENPENCIL_FRONTEND_URL` / `OPENPENCIL_APP_ENV`). Non-prod builds expose a native **Frontend** menu; prod stays on the baked URL. `capabilities/default.json` `remote.urls` must list every origin that needs Tauri IPC. App commands invoked from those origins (for example `mcp_lookup`) need an allow in `permissions/` and a matching entry in that capability; remote IPC does not inherit the local allow-all default.
- Native menu JSON comes from `bun run generate:menu` (`packages/react/scripts/generate-desktop-menu.ts` + React menu schema). Do not edit `generated/` by hand. The Vue app still uses `bun run generate:tauri-menu` from the repo root.
- Packaged builds embed MCP via `bundle.externalBin` (`binaries/openpencil-mcp-http-<triple>`). `bun run ensure:mcp-binary` (also in `beforeBuildCommand`) compiles it with Bun when missing. The native shell starts that sidecar in `setup` (`ensure_mcp_on_startup`) so MCP comes up even when the window loads a remote frontend that never calls `mcp_start`. Frontend health checks must use `mcp_health` (not `fetch('http://127.0.0.1:7600/…')`) because an `https://` webview blocks mixed content to localhost HTTP. Startup lines append to `~/Library/Logs/OpenPencil/mcp-http.log`. Manual: `bun run start:mcp` or `bun run start:services`.
- Icons: copy or run brand generation into `icons/` as needed; this tree already ships icons.
- ACP / harness / fs scope / updater rules match `desktop/AGENTS.md`; change `desktop-react/capabilities/**` for this shell.
- Skill workspace needs `fs:allow-read-dir` / `exists` plus literal leading-dot paths for agent skill roots (`.claude/skills/**`, …). Regenerate those allows with `bun tools/patch-desktop-react-skill-fs.mjs` when `SKILL_AGENT_ENVIRONMENTS` changes.
- macOS `signingIdentity` is `"-"` (ad-hoc) so local `bun run build` works without the release Developer ID in the keychain. For a signed release, pass your identity, e.g. `bunx tauri build --config '{"bundle":{"macOS":{"signingIdentity":"Developer ID Application: …"}}}'`.
