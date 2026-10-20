import { app, Menu, type BrowserWindow, type MenuItemConstructorOptions } from 'electron'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  allowsFrontendUrlOverride,
  buildChannelLabel,
  handleFrontendMenuEvent,
  PRESET_DEV,
  PRESET_LOCAL,
  PRESET_PROD
} from './frontend-url'

/** Non-prod only: open Chromium DevTools (matches Tauri `dev-tools` menu id). */
function toggleDevTools(window: BrowserWindow | null): void {
  if (!window || window.isDestroyed()) return
  if (!allowsFrontendUrlOverride()) return
  window.webContents.toggleDevTools()
}

type MenuJsonItem = {
  id?: string
  label?: string
  accelerator?: string
  checkbox?: boolean
  type?: 'separator'
  sub?: MenuJsonItem[]
}

type MenuJsonGroup = {
  label: string
  items: MenuJsonItem[]
}

type AppMenuJson = {
  about?: { label?: string; accelerator?: string }
  'check-updates'?: { label?: string; accelerator?: string }
  quit?: { label?: string; accelerator?: string }
}

/** Prefer native web copy/cut/paste when focus is in an editable or there is a text selection. */
const NATIVE_EDIT_IDS = new Set([
  'copy',
  'cut',
  'paste',
  'select-all',
  'selection.select-all',
  'selection.selectAll'
])

function packageRoot(): string {
  // Packaged: app.asar. Dev / `build:main`: desktop-electron/ (dist/main.js → ..).
  return join(dirname(fileURLToPath(import.meta.url)), '..')
}

function readJsonFile<T>(path: string): T | null {
  if (!existsSync(path)) return null
  try {
    return JSON.parse(readFileSync(path, 'utf8')) as T
  } catch {
    return null
  }
}

function loadMenuJson(): MenuJsonGroup[] {
  const candidates = [
    join(packageRoot(), 'generated/menu.json'),
    join(packageRoot(), '../desktop-react/generated/menu.json')
  ]
  for (const path of candidates) {
    const raw = readJsonFile<unknown>(path)
    if (Array.isArray(raw)) return raw as MenuJsonGroup[]
  }
  return []
}

function loadAppMenuJson(): AppMenuJson {
  const candidates = [
    join(packageRoot(), 'generated/app-menu.json'),
    join(packageRoot(), '../desktop-react/generated/app-menu.json')
  ]
  for (const path of candidates) {
    const raw = readJsonFile<AppMenuJson>(path)
    if (raw && typeof raw === 'object') return raw
  }
  return {}
}

async function shouldUseNativeEdit(window: BrowserWindow): Promise<boolean> {
  try {
    return Boolean(
      await window.webContents.executeJavaScript(`(() => {
        const el = document.activeElement
        if (!el) return Boolean(window.getSelection()?.toString())
        const tag = el.tagName
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true
        if (el.isContentEditable) return true
        return Boolean(window.getSelection()?.toString())
      })()`)
    )
  } catch {
    return false
  }
}

function runNativeEdit(window: BrowserWindow, id: string): void {
  const contents = window.webContents
  if (id === 'copy') contents.copy()
  else if (id === 'cut') contents.cut()
  else if (id === 'paste') contents.paste()
  else contents.selectAll()
}

function toTemplate(
  items: MenuJsonItem[],
  getWindow: () => BrowserWindow | null,
  send: (id: string) => void
): MenuItemConstructorOptions[] {
  return items.map((item) => {
    if (item.type === 'separator') return { type: 'separator' }

    const label = item.label ?? ''
    // Nested submenu (matches Tauri: parent id/accelerator are not clickable).
    if (item.sub?.length) {
      return {
        label,
        submenu: toTemplate(item.sub, getWindow, send)
      }
    }

    const id = item.id
    if (!id) return { label }

    // Placeholder recent-files submenu (populated when recent-files IPC exists).
    if (id === 'open-recent') {
      return {
        id,
        label,
        submenu: [{ label: '(None)', enabled: false }]
      }
    }

    return {
      id,
      label,
      accelerator: item.accelerator,
      type: item.checkbox ? 'checkbox' : 'normal',
      checked: item.checkbox ? false : undefined,
      click: () => {
        const window = getWindow()
        if (!window || window.isDestroyed()) return
        if (id === 'dev-tools') {
          toggleDevTools(window)
          return
        }
        if (id === 'quit') {
          app.quit()
          return
        }
        if (NATIVE_EDIT_IDS.has(id)) {
          void shouldUseNativeEdit(window).then((native) => {
            if (native) {
              runNativeEdit(
                window,
                id === 'selection.select-all' || id === 'selection.selectAll' || id === 'select-all'
                  ? 'select-all'
                  : id
              )
            } else send(id)
          })
          return
        }
        send(id)
      }
    }
  })
}

/** Install native menu; clicks emit `menu-event` with the action id (Tauri-compatible). */
export function installNativeMenu(getWindow: () => BrowserWindow | null): void {
  const groups = loadMenuJson()
  const appMenu = loadAppMenuJson()
  const send = (id: string) => {
    const window = getWindow()
    if (!window || window.isDestroyed()) return
    window.webContents.send('menu-event', id)
  }

  const template: MenuItemConstructorOptions[] = []
  if (process.platform === 'darwin') {
    template.push({
      label: 'OpenPencil',
      submenu: [
        {
          label: appMenu.about?.label ?? 'About OpenPencil',
          role: 'about'
        },
        {
          id: 'check-updates',
          label: appMenu['check-updates']?.label ?? 'Check for Updates…',
          click: () => send('check-updates')
        },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        {
          id: 'quit',
          label: appMenu.quit?.label ?? 'Quit OpenPencil',
          accelerator: appMenu.quit?.accelerator ?? 'CmdOrCtrl+Q',
          click: () => app.quit()
        }
      ]
    })
  }

  for (const group of groups) {
    template.push({
      label: group.label,
      submenu: toTemplate(group.items, getWindow, send)
    })
  }

  if (allowsFrontendUrlOverride()) {
    const channel = buildChannelLabel()
    template.push({
      label: `Frontend (${channel})`,
      submenu: [
        {
          id: 'frontend-url-default',
          label: `Use build default (${channel})`,
          click: () => {
            void handleFrontendMenuEvent(getWindow(), 'frontend-url-default')
          }
        },
        { type: 'separator' },
        {
          id: 'frontend-url-local',
          label: `Local — ${PRESET_LOCAL}`,
          click: () => {
            void handleFrontendMenuEvent(getWindow(), 'frontend-url-local')
          }
        },
        {
          id: 'frontend-url-dev',
          label: `Dev — ${PRESET_DEV}`,
          click: () => {
            void handleFrontendMenuEvent(getWindow(), 'frontend-url-dev')
          }
        },
        {
          id: 'frontend-url-prod',
          label: `Prod — ${PRESET_PROD}`,
          click: () => {
            void handleFrontendMenuEvent(getWindow(), 'frontend-url-prod')
          }
        },
        { type: 'separator' },
        {
          id: 'frontend-url-custom',
          label: 'Custom URL…',
          click: () => {
            void handleFrontendMenuEvent(getWindow(), 'frontend-url-custom')
          }
        }
      ]
    })
  }

  if (process.platform !== 'darwin') {
    const file = template.find((entry) => entry.label === 'File')
    if (file && Array.isArray(file.submenu)) {
      file.submenu = [
        ...(file.submenu as MenuItemConstructorOptions[]),
        { type: 'separator' },
        {
          id: 'quit',
          label: appMenu.quit?.label ?? 'Quit',
          accelerator: appMenu.quit?.accelerator ?? 'CmdOrCtrl+Q',
          click: () => app.quit()
        }
      ]
    }
  }

  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}

/** Right-click Copy/Cut/Paste when the target is editable or has a text selection. */
export function attachEditableContextMenu(window: BrowserWindow): void {
  window.webContents.on('context-menu', (_event, params) => {
    if (!params.isEditable && !params.selectionText) return
    const template: MenuItemConstructorOptions[] = []
    if (params.isEditable) {
      template.push(
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut', enabled: params.editFlags.canCut },
        { role: 'copy', enabled: params.editFlags.canCopy },
        { role: 'paste', enabled: params.editFlags.canPaste },
        { role: 'selectAll', enabled: params.editFlags.canSelectAll }
      )
    } else if (params.selectionText) {
      template.push({ role: 'copy' })
    }
    if (template.length === 0) return
    Menu.buildFromTemplate(template).popup({ window })
  })
}
