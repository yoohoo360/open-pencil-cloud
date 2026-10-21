import {
  app,
  Menu,
  type BrowserWindow,
  type MenuItemConstructorOptions
} from 'electron'
import { readFileSync } from 'node:fs'
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

type SchemaEntry = {
  type?: 'separator'
  id?: string
  label?: string
  accelerator?: string
  checkbox?: boolean
  sub?: SchemaEntry[]
}

type SchemaGroup = {
  label: string
  items: SchemaEntry[]
}

type AppMenuLabels = {
  about?: { label?: string }
  quit?: { label?: string; accelerator?: string }
  'check-updates'?: { label?: string; accelerator?: string }
}

const ROLE_BY_ID: Record<string, NonNullable<MenuItemConstructorOptions['role']>> = {
  copy: 'copy',
  cut: 'cut',
  paste: 'paste',
  'select-all': 'selectAll',
  undo: 'undo',
  redo: 'redo'
}

function packageRoot(): string {
  if (app.isPackaged) return app.getAppPath()
  return join(dirname(fileURLToPath(import.meta.url)), '..')
}

function readJsonFile<T>(relativePath: string, fallback: T): T {
  try {
    const text = readFileSync(join(packageRoot(), relativePath), 'utf8')
    return JSON.parse(text) as T
  } catch (error) {
    console.error(`[desktop-electron] failed to read ${relativePath}`, error)
    return fallback
  }
}

function emitMenuEvent(getWindow: () => BrowserWindow | null, id: string): void {
  const window = getWindow()
  if (!window || window.isDestroyed()) return
  window.webContents.send('menu-event', id)
}

/** Non-prod only: open Chromium DevTools. */
function toggleDevTools(window: BrowserWindow | null): void {
  if (!window || window.isDestroyed()) return
  if (!allowsFrontendUrlOverride()) return
  window.webContents.toggleDevTools()
}

function entryToTemplate(
  entry: SchemaEntry,
  getWindow: () => BrowserWindow | null
): MenuItemConstructorOptions | null {
  if (entry.type === 'separator') return { type: 'separator' }
  const id = entry.id?.trim()
  const label = entry.label?.trim()
  if (!id || !label) return null

  if (entry.sub && entry.sub.length > 0) {
    const submenu = entry.sub
      .map((child) => entryToTemplate(child, getWindow))
      .filter((item): item is MenuItemConstructorOptions => item !== null)
    return { id, label, submenu }
  }

  const role = ROLE_BY_ID[id]
  if (role) {
    return {
      id,
      label,
      role,
      accelerator: entry.accelerator
    }
  }

  if (entry.checkbox) {
    return {
      id,
      label,
      type: 'checkbox',
      checked: false,
      accelerator: entry.accelerator,
      click: () => {
        emitMenuEvent(getWindow, id)
      }
    }
  }

  return {
    id,
    label,
    accelerator: entry.accelerator,
    click: () => {
      emitMenuEvent(getWindow, id)
    }
  }
}

function frontendChannelMenu(
  getWindow: () => BrowserWindow | null
): MenuItemConstructorOptions {
  const channel = buildChannelLabel()
  return {
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
      },
      { type: 'separator' },
      {
        id: 'dev-tools',
        label: 'Developer Tools',
        accelerator: 'CmdOrCtrl+Alt+I',
        click: () => toggleDevTools(getWindow())
      }
    ]
  }
}

/**
 * Electron native application menu from `generated/menu.json` (same schema as Tauri).
 * Clicks emit `menu-event` to the renderer; React `useNativeMenuEvents` handles them.
 */
export function installNativeMenu(getWindow: () => BrowserWindow | null): void {
  const groups = readJsonFile<SchemaGroup[]>('generated/menu.json', [])
  const appLabels = readJsonFile<AppMenuLabels>('generated/app-menu.json', {})
  const template: MenuItemConstructorOptions[] = []

  if (process.platform === 'darwin') {
    template.push({
      label: app.name || 'OpenPencil',
      submenu: [
        {
          label: appLabels.about?.label || 'About OpenPencil',
          role: 'about'
        },
        { type: 'separator' },
        {
          id: 'check-updates',
          label: appLabels['check-updates']?.label || 'Check for Updates…',
          accelerator: appLabels['check-updates']?.accelerator,
          click: () => emitMenuEvent(getWindow, 'check-updates')
        },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        {
          label: appLabels.quit?.label || 'Quit OpenPencil',
          accelerator: appLabels.quit?.accelerator || 'CmdOrCtrl+Q',
          click: () => {
            emitMenuEvent(getWindow, 'quit')
            app.quit()
          }
        }
      ]
    })
  }

  for (const group of groups) {
    const submenu = group.items
      .map((entry) => entryToTemplate(entry, getWindow))
      .filter((item): item is MenuItemConstructorOptions => item !== null)
    if (submenu.length === 0) continue
    template.push({ label: group.label, submenu })
  }

  if (allowsFrontendUrlOverride()) {
    template.push(frontendChannelMenu(getWindow))
  }

  if (process.platform !== 'darwin') {
    // Schema File menu has no Quit; append it for Windows/Linux.
    const fileMenu = template.find((item) => item.label === 'File')
    const quitItem: MenuItemConstructorOptions = {
      label: appLabels.quit?.label || 'Quit',
      accelerator: appLabels.quit?.accelerator || 'CmdOrCtrl+Q',
      role: 'quit'
    }
    if (fileMenu && Array.isArray(fileMenu.submenu)) {
      fileMenu.submenu.push({ type: 'separator' }, quitItem)
    } else {
      template.push({ label: 'OpenPencil', submenu: [quitItem] })
    }
  }

  if (template.length === 0) {
    Menu.setApplicationMenu(null)
    return
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
