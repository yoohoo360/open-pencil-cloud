/**
 * desktop-react menu generator (separate from `tools/generate/tauri-menu`, which
 * stays on the Vue schema). Writes `desktop-react/generated/menu.json`.
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { compact } from 'es-toolkit/array'

import { APP_MENU_APP_ITEMS, APP_MENU_SCHEMA } from '#react/app/shell/menu/schema'
import type {
  AppMenuActionItem,
  AppMenuEntry,
  AppMenuGroupSchema
} from '#react/app/shell/menu/schema'
import { editorCommandMetadata } from '#react/editor/commands/registry'

function shortcutTokenToAccelerator(shortcut: string | undefined): string | undefined {
  if (!shortcut) return undefined
  const normalized = shortcut === '⌫' ? 'Backspace' : shortcut.replaceAll('↩', 'Enter')
  return normalized
    .replaceAll('MOD', 'CmdOrCtrl')
    .replaceAll('SHIFT', 'Shift')
    .replaceAll('ALT', 'Alt')
}

function isNativeVisible(entry: { target?: string }): boolean {
  return entry.target !== 'browser'
}

function entryAccelerator(entry: AppMenuActionItem): string | undefined {
  const shortcut =
    entry.shortcut ?? (entry.command ? editorCommandMetadata(entry.command).shortcut : undefined)
  return entry.accelerator ?? shortcutTokenToAccelerator(shortcut)
}

function cleanEntry(entry: AppMenuEntry): unknown | null {
  if (!isNativeVisible(entry)) return null
  if (entry.type === 'separator') return { type: 'separator' }
  return {
    id: entry.id,
    label: entry.label,
    accelerator: entryAccelerator(entry),
    checkbox: entry.checkbox,
    sub: entry.sub ? compact(entry.sub.map(cleanEntry)) : undefined
  }
}

function cleanGroup(group: AppMenuGroupSchema): unknown | null {
  if (!isNativeVisible(group)) return null
  return {
    label: group.label,
    items: compact(group.items.map(cleanEntry))
  }
}

function renderMenu(): string {
  return `${JSON.stringify(compact(APP_MENU_SCHEMA.map(cleanGroup)), null, 2)}\n`
}

function renderAppMenu(): string {
  const items = Object.fromEntries(
    APP_MENU_APP_ITEMS.map((entry) => [
      entry.id,
      { label: entry.label, accelerator: entryAccelerator(entry) }
    ])
  )
  return `${JSON.stringify(items, null, 2)}\n`
}

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
const artifacts: Record<string, () => string> = {
  [resolve(root, 'desktop-react/generated/menu.json')]: renderMenu,
  [resolve(root, 'desktop-react/generated/app-menu.json')]: renderAppMenu
}

for (const [path, render] of Object.entries(artifacts)) {
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, render())
}
