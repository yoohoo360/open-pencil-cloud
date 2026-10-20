import { Menu, type BrowserWindow, type MenuItemConstructorOptions } from 'electron'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { allowsFrontendUrlOverride, handleFrontendMenuEvent } from './frontend-url'

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

/** Prefer native web copy/cut/paste when focus is in an editable or there is a text selection. */
const NATIVE_EDIT_IDS = new Set(['copy', 'cut', 'paste', 'select-all', 'selection.select-all'])

function packageRoot(): string {
  return join(dirname(fileURLToPath(import.meta.url)), '..')
}

function loadMenuJson(): MenuJsonGroup[] {
  const candidates = [
    join(packageRoot(), 'generated/menu.json'),
    join(packageRoot(), '../desktop-react/generated/menu.json')
  ]
  for (const path of candidates) {
    if (!existsSync(path)) continue
    const raw = JSON.parse(readFileSync(path, 'utf8')) as unknown
    if (Array.isArray(raw)) return raw as MenuJsonGroup[]
  }
  return []
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
    const children = item.sub?.length ? toTemplate(item.sub, getWindow, send) : undefined
    const id = item.id
    return {
      id,
      label: item.label,
      accelerator: item.accelerator,
      type: item.checkbox ? 'checkbox' : children ? 'submenu' : 'normal',
      submenu: children,
      click:
        id && !children
          ? () => {
              const window = getWindow()
              if (!window) return
              if (NATIVE_EDIT_IDS.has(id)) {
                void shouldUseNativeEdit(window).then((native) => {
                  if (native) runNativeEdit(window, id === 'selection.select-all' ? 'select-all' : id)
                  else send(id)
                })
                return
              }
              send(id)
            }
          : undefined
    }
  })
}

/** Install native menu; clicks emit `menu-event` with the action id (Tauri-compatible). */
export function installNativeMenu(getWindow: () => BrowserWindow | null): void {
  const groups = loadMenuJson()
  const send = (id: string) => {
    const window = getWindow()
    window?.webContents.send('menu-event', id)
  }

  const template: MenuItemConstructorOptions[] = []
  if (process.platform === 'darwin') {
    template.push({
      label: 'OpenPencil',
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' }
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
    template.push({
      label: 'Frontend',
      submenu: [
        {
          id: 'frontend-url-default',
          label: 'Use Config Default',
          click: () => {
            void handleFrontendMenuEvent(getWindow(), 'frontend-url-default')
          }
        },
        {
          id: 'frontend-url-local',
          label: 'Local (http://localhost:8000)',
          click: () => {
            void handleFrontendMenuEvent(getWindow(), 'frontend-url-local')
          }
        },
        {
          id: 'frontend-url-dev',
          label: 'Dev (https://pencil.dev.yoohoo.cn)',
          click: () => {
            void handleFrontendMenuEvent(getWindow(), 'frontend-url-dev')
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
        { role: 'quit' }
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
