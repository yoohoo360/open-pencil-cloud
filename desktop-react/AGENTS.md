# Desktop React (Tauri v2)

React-facing desktop shell, copied from `desktop/` so the Vue Tauri app stays untouched.
Paths here are relative to `desktop-react/`. Do not put desktop-react scripts in the repo root `package.json`.

## Commands (from `desktop-react/`)

```bash
bun run generate:menu      # React native menu → generated/
bun run start:frontend     # packages/react rspack (does not start MCP / Agent Server)
bun run start:mcp          # MCP HTTP on :7600 (separate terminal)
bun run start:agent-server # LangGraph Agent Server (separate terminal)
bun run dev                # tauri dev (runs generate:menu + start:frontend via beforeDevCommand)
bun run build              # tauri build
```

## Notes

- Main window loads React over HTTP (`src/frontend.rs`). Defaults match `packages/react/src/config` `FRONTEND_BASE_URL` (`OPENPENCIL_FRONTEND_URL` / `OPENPENCIL_APP_ENV`). Non-prod builds expose a native **Frontend** menu; prod stays on the baked URL. `capabilities/default.json` `remote.urls` must list every origin that needs Tauri IPC.
- Native menu JSON comes from `bun run generate:menu` (`packages/react/scripts/generate-desktop-menu.ts` + React menu schema). Do not edit `generated/` by hand. The Vue app still uses `bun run generate:tauri-menu` from the repo root.
- MCP is **not** bundled as a Tauri sidecar here. Start it with `bun run start:mcp` (or a globally installed `openpencil-mcp-http`) when agents/automation need it.
- Icons: copy or run brand generation into `icons/` as needed; this tree already ships icons.
- ACP / harness / fs scope / updater rules match `desktop/AGENTS.md`; change `desktop-react/capabilities/**` for this shell.
- macOS `signingIdentity` is `"-"` (ad-hoc) so local `bun run build` works without the release Developer ID in the keychain. For a signed release, pass your identity, e.g. `bunx tauri build --config '{"bundle":{"macOS":{"signingIdentity":"Developer ID Application: …"}}}'`.
