import { Menu, type BrowserWindow, type MenuItemConstructorOptions } from 'electron'

import {
  allowsFrontendUrlOverride,
  buildChannelLabel,
  handleFrontendMenuEvent,
  PRESET_DEV,
  PRESET_LOCAL,
  PRESET_PROD,
  reloadFrontendIgnoringCache
} from './frontend-url'

function environmentMenu(getWindow: () => BrowserWindow | null): MenuItemConstructorOptions {
  const channel = buildChannelLabel()
  return {
    label: `Environment (${channel})`,
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
  }
}

/** Install the minimal Electron application menu. */
export function installNativeMenu(getWindow: () => BrowserWindow | null): void {
  const helpItems: MenuItemConstructorOptions[] = [
    {
      id: 'reload',
      label: 'Reload',
      accelerator: 'CmdOrCtrl+R',
      click: () => {
        void reloadFrontendIgnoringCache(getWindow())
      }
    }
  ]

  if (allowsFrontendUrlOverride()) {
    helpItems.push({ type: 'separator' }, environmentMenu(getWindow))
  }

  Menu.setApplicationMenu(
    Menu.buildFromTemplate([{ label: 'Help', role: 'help', submenu: helpItems }])
  )
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
