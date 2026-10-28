# Desktop Electron (MVP)

React-facing Electron shell. Lives beside Tauri [`desktop-react/`](../desktop-react/); do not remove or replace that package. Paths here are relative to `desktop-electron/`.

## Commands (from `desktop-electron/`)

```bash
bun run build:main         # bundle main/preload + write dist/app-env.json
bun run ensure:mcp-binary # compile the packaged MCP sidecar for this host
bun run dev / dev:local    # channel=local → http://localhost:8000 (+ start rspack)
bun run dev:dev            # channel=dev → https://pencil.dev.yoohoo.cn (no local rspack)
bun run build / build:prod # installer, channel=prod → https://pencil.yoohoo.cn
bun run build:dev          # installer, channel=dev
bun run build:local        # installer, channel=local
bun run build:dir[:dev|:local]  # unpacked app only
bun run start:mcp          # MCP HTTP on :7600 (runs packages/mcp)
bun run start:services     # same as start:mcp
```

Do not put these scripts in the repo root `package.json`.

### Frontend channels (same as `packages/react/src/config`)

| Channel | Default URL | Environment menu | Typical command |
| ------- | ----------- | ---------------- | --------------- |
| `local` | `http://localhost:8000` | yes | `bun run dev` |
| `dev` | `https://pencil.dev.yoohoo.cn` | yes | `bun run build:dev` / `dev:dev` |
| `prod` | `https://pencil.yoohoo.cn` | no | `bun run build` |

Baked into `dist/app-env.json` at `build:main` time (`OPENPENCIL_APP_ENV`). Runtime may still set `OPENPENCIL_APP_ENV` / `OPENPENCIL_FRONTEND_URL`. Non-prod shells add **Environment (channel)** under **Help** to jump Local / Dev / Prod (clears HTML/JS cache). `userData` is `OpenPencil-electron-{channel}` so overrides do not mix.

Packaging compiles the MCP HTTP server into `binaries/openpencil-mcp-http-<triple>` and stages it as an Electron extra resource. The minimal app is staged under `os.tmpdir()/open-pencil-electron-stage` so monorepo `node_modules` is not packed; artifacts go in `release/`.

## Notes

- Main window loads the React app over HTTP (`src/frontend-url.ts`). Defaults match `packages/react` / Tauri `frontend.rs`: `OPENPENCIL_FRONTEND_URL`, else `OPENPENCIL_APP_ENV` → prod/dev hosts, else `http://localhost:8000`. Non-prod builds add **Help → Environment** (local / dev / prod / custom); switching persists `frontend-url.txt` under `userData`, clears HTML/JS HTTP + code caches and Service Workers (not Cache Storage, localStorage, or IDB), then navigates without cache.
- Preload stubs `window.__TAURI_INTERNALS__` (`openPencilElectron` + `invoke` → IPC) so core `IS_TAURI` / `build_fig_file` paths stay unchanged, and exposes `window.openPencilDesktop`. Bridge prefers `openPencilDesktop`.
- Native OS menu is **Help** only. **Reload** clears HTML/JS HTTP + code caches and Service Workers before reloading without clearing Cache Storage, and non-prod channels also show **Environment**. The React design page owns `AppMenubar` and the back-to-list control.
- MVP IPC: `mcp_*`, `build_fig_file` (via `@open-pencil/fig` `compressFigDataSync`; export must call `openPencilDesktop.invoke` with raw `Uint8Array`s — `@tauri-apps/api` still `Array.from`s bytes and freezes the renderer when the shell loads a remote https:// frontend), `list_system_fonts` / `load_system_font` (SFNT/TTC name tables; macOS includes FontServices Reserved for PingFang SC), `fs_*`, `dialog_openDirectory`. No credentials, deep link, or updater yet.
- MCP companion scripts live here (`scripts/start-mcp.ts`, `scripts/start-services.ts`); core stays in `packages/mcp`. Packaged apps resolve the compiled sidecar from `process.resourcesPath/binaries`; development resolves the workspace source first. Agent Server still starts via `desktop-react/` (`start:agent-server`).
