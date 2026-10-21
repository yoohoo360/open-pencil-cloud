import { Menu, type BrowserWindow, type MenuItemConstructorOptions } from 'electron'

import {
  allowsFrontendUrlOverride,
  buildChannelLabel,
  handleFrontendMenuEvent,
  PRESET_DEV,
  PRESET_LOCAL,
  PRESET_PROD
} from './frontend-url'

/** Non-prod only: open Chromium DevTools. */
function toggleDevTools(window: BrowserWindow | null): void {
  if (!window || window.isDestroyed()) return
  if (!allowsFrontendUrlOverride()) return
  window.webContents.toggleDevTools()
}

/**
 * Electron native menu: **Frontend** channel switch only (non-prod).
 * Editor File/Edit/View menus live in the React page (`AppMenubar`), not here.
 */
export function installNativeMenu(getWindow: () => BrowserWindow | null): void {
  const template: MenuItemConstructorOptions[] = []

  // macOS needs an app menu for Quit; keep it minimal (no editor items).
  if (process.platform === 'darwin') {
    template.push({
      label: 'OpenPencil',
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' }
      ]
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
        },
        { type: 'separator' },
        {
          id: 'dev-tools',
          label: 'Developer Tools',
          accelerator: 'CmdOrCtrl+Alt+I',
          click: () => toggleDevTools(getWindow())
        }
      ]
    })
  } else if (process.platform !== 'darwin') {
    // Prod Windows/Linux: keep Quit reachable without a File menu.
    template.push({
      label: 'OpenPencil',
      submenu: [{ role: 'quit' }]
    })
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
