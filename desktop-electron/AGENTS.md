# Desktop Electron (MVP)

React-facing Electron shell. Lives beside Tauri [`desktop-react/`](../desktop-react/); do not remove or replace that package. Paths here are relative to `desktop-electron/`.

## Commands (from `desktop-electron/`)

```bash
bun run generate:menu      # shared React menu → generated/
bun run build:main         # bundle main/preload + write dist/app-env.json
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

| Channel | Default URL | Frontend menu | Typical command |
| ------- | ----------- | ------------- | --------------- |
| `local` | `http://localhost:8000` | yes | `bun run dev` |
| `dev` | `https://pencil.dev.yoohoo.cn` | yes | `bun run build:dev` / `dev:dev` |
| `prod` | `https://pencil.yoohoo.cn` | no | `bun run build` |

Baked into `dist/app-env.json` at `build:main` time (`OPENPENCIL_APP_ENV`). Runtime may still set `OPENPENCIL_APP_ENV` / `OPENPENCIL_FRONTEND_URL`. Non-prod shells keep a **Frontend (channel)** menu to jump Local / Dev / Prod (clears HTML/JS cache). `userData` is `OpenPencil-electron-{channel}` so overrides do not mix.

Packaging stages a minimal app under `os.tmpdir()/open-pencil-electron-stage` so monorepo `node_modules` is not packed. Artifacts in `release/` (asar ~100KB).

## Notes

- Main window loads the React app over HTTP (`src/frontend-url.ts`). Defaults match `packages/react` / Tauri `frontend.rs`: `OPENPENCIL_FRONTEND_URL`, else `OPENPENCIL_APP_ENV` → prod/dev hosts, else `http://localhost:8000`. Non-prod builds add a native **Frontend** menu (local / dev / custom); switching persists `frontend-url.txt` under `userData`, clears HTML/JS HTTP + code + Cache Storage / Service Worker caches (not localStorage/IDB), then reloads ignoring cache. Non-prod also handles **Developer Tools** (`CmdOrCtrl+Alt+I`) via `webContents.toggleDevTools()`; prod ignores that menu id.
- Preload stubs `window.__TAURI_INTERNALS__` (`openPencilElectron` + `invoke` → IPC) so core `IS_TAURI` / `build_fig_file` paths stay unchanged, and exposes `window.openPencilDesktop`. Bridge prefers `openPencilDesktop`.
- Native OS menu is **Frontend** only (non-prod channel switch + DevTools). No File/Edit/View schema menu — the React design page owns `AppMenubar` and the back-to-list control. macOS keeps a minimal app About/Quit menu.
- MVP IPC: `mcp_*`, `build_fig_file` (via `@open-pencil/fig` `compressFigDataSync`; export must call `openPencilDesktop.invoke` with raw `Uint8Array`s — `@tauri-apps/api` still `Array.from`s bytes and freezes the renderer when the shell loads a remote https:// frontend), `list_system_fonts` / `load_system_font` (SFNT/TTC name tables; macOS includes FontServices Reserved for PingFang SC), `fs_*`, `dialog_openDirectory`. No credentials, deep link, or updater yet.
- MCP companion scripts live here (`scripts/start-mcp.ts`, `scripts/start-services.ts`); core stays in `packages/mcp`. Agent Server still starts via `desktop-react/` (`start:agent-server`).
