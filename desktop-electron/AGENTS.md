# Desktop Electron (MVP)

React-facing Electron shell. Lives beside Tauri [`desktop-react/`](../desktop-react/); do not remove or replace that package. Paths here are relative to `desktop-electron/`.

## Commands (from `desktop-electron/`)

```bash
bun run generate:menu   # shared React menu → generated/ (+ desktop-react/generated/)
bun run build:main      # bundle src/main.ts + preload → dist/
bun run build           # menu + main + electron-builder installer → release/
bun run build:dir       # unpacked app dir only (faster smoke package)
bun run start:frontend  # packages/react rspack on :8000
bun run dev             # menu + build + frontend + Electron
bun run start           # Electron only (expects frontend URL already up)
bun run start:mcp       # forwards to desktop-react
bun run start:agent-server
bun run start:services
```

Do not put these scripts in the repo root `package.json`.

Packaging uses `electron-builder.yml` (mac dmg/zip, Windows nsis, Linux AppImage/deb). Icons come from `../desktop-react/icons`. Artifacts land in `release/`. Local/ad-hoc builds set `CSC_IDENTITY_AUTO_DISCOVERY=false` (no code signing). Packaged apps default to the prod frontend URL and omit the Frontend menu.

## Notes

- Main window loads the React app over HTTP (`src/frontend-url.ts`). Defaults match `packages/react` / Tauri `frontend.rs`: `OPENPENCIL_FRONTEND_URL`, else `OPENPENCIL_APP_ENV` → prod/dev hosts, else `http://localhost:8000`. Non-prod builds add a native **Frontend** menu (local / dev / custom); switching persists `frontend-url.txt` under `userData`, clears HTML/JS HTTP + code + Cache Storage / Service Worker caches (not localStorage/IDB), then reloads ignoring cache.
- Preload stubs `window.__TAURI_INTERNALS__` so core `IS_TAURI` is unchanged, and exposes `window.openPencilDesktop` for IPC. Bridge picks Electron vs real Tauri via `openPencilDesktop` first.
- MVP IPC: `mcp_*`, `list_system_fonts` / `load_system_font`, `fs_*`, `dialog_openDirectory`, native `menu-event`. No credentials, deep link, updater, or `build_fig_file` yet.
- Companion Node processes stay owned by `desktop-react/` (`scripts/`, `agent-server/`); this package only forwards start scripts.
