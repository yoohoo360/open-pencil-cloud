import { atom } from 'nanostores'
import { DEFAULT_SNAPPING_PREFERENCES, type SnappingPreferences } from '@open-pencil/core/editor'

import { DEFAULT_FONT_FAMILY, IS_BROWSER } from '@open-pencil/core/constants'

import {
  normalizeContextMenuOrders,
  type ContextMenuItemId,
  type ContextMenuNodeKind,
  type ContextMenuOrders
} from '#react/app/settings/context-menu'

export interface AppPreferences {
  version: 1
  recovery: {
    enabled: boolean
  }
  editing: {
    snapping: SnappingPreferences
    /** Font applied to newly created text; omitted from Tailwind/JSX when matched. */
    defaultFontFamily: string
  }
  menus: {
    contextByNodeType: ContextMenuOrders
  }
}

export const DEFAULT_APP_PREFERENCES: Readonly<AppPreferences> = {
  version: 1,
  recovery: { enabled: true },
  editing: {
    snapping: { ...DEFAULT_SNAPPING_PREFERENCES },
    defaultFontFamily: DEFAULT_FONT_FAMILY
  },
  menus: {
    contextByNodeType: {}
  }
}

const STORAGE_KEY = 'open-pencil:preferences:v1'

function booleanOrDefault(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback
}

function isStoredRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function snappingFromUnknown(value: unknown): SnappingPreferences {
  const snapping = isStoredRecord(value) ? value : undefined
  return {
    geometry: booleanOrDefault(snapping?.geometry, DEFAULT_APP_PREFERENCES.editing.snapping.geometry),
    objects: booleanOrDefault(snapping?.objects, DEFAULT_APP_PREFERENCES.editing.snapping.objects),
    pixelGrid: booleanOrDefault(
      snapping?.pixelGrid,
      DEFAULT_APP_PREFERENCES.editing.snapping.pixelGrid
    )
  }
}

function stringOrDefault(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : fallback
}

export function normalizePreferences(value: unknown): AppPreferences {
  const stored = isStoredRecord(value) ? value : undefined
  const recovery = isStoredRecord(stored?.recovery) ? stored.recovery : undefined
  const editing = isStoredRecord(stored?.editing) ? stored.editing : undefined
  return {
    version: 1,
    recovery: {
      enabled: booleanOrDefault(recovery?.enabled, DEFAULT_APP_PREFERENCES.recovery.enabled)
    },
    editing: {
      snapping: snappingFromUnknown(editing?.snapping),
      defaultFontFamily: stringOrDefault(
        editing?.defaultFontFamily,
        DEFAULT_APP_PREFERENCES.editing.defaultFontFamily
      )
    },
    menus: {
      contextByNodeType: normalizeContextMenuOrders(
        isStoredRecord(stored?.menus) ? stored.menus.contextByNodeType : undefined
      )
    }
  }
}

function readPreferences(): AppPreferences {
  if (!IS_BROWSER) return structuredClone(DEFAULT_APP_PREFERENCES)
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return structuredClone(DEFAULT_APP_PREFERENCES)
    return normalizePreferences(JSON.parse(raw) as unknown)
  } catch {
    return structuredClone(DEFAULT_APP_PREFERENCES)
  }
}

export const appPreferences = atom<AppPreferences>(readPreferences())

appPreferences.subscribe((value) => {
  if (!IS_BROWSER) return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(value))
})

export function updateRecoveryEnabled(enabled: boolean) {
  const preferences = structuredClone(appPreferences.get())
  preferences.recovery.enabled = enabled
  appPreferences.set(preferences)
}

export function updateSnappingPreferences(changes: Partial<SnappingPreferences>) {
  const current = appPreferences.get()
  appPreferences.set({
    ...current,
    editing: {
      ...current.editing,
      snapping: {
        ...current.editing.snapping,
        ...changes
      }
    }
  })
}

export function updateDefaultFontFamily(family: string) {
  const trimmed = family.trim()
  if (!trimmed) return
  const current = appPreferences.get()
  appPreferences.set({
    ...current,
    editing: {
      ...current.editing,
      defaultFontFamily: trimmed
    }
  })
}

export function updateContextMenuOrder(kind: ContextMenuNodeKind, order: readonly ContextMenuItemId[]) {
  const current = appPreferences.get()
  appPreferences.set({
    ...current,
    menus: {
      contextByNodeType: normalizeContextMenuOrders({
        ...current.menus.contextByNodeType,
        [kind]: [...order]
      })
    }
  })
}

export function resetContextMenuOrder(kind: ContextMenuNodeKind) {
  const current = appPreferences.get()
  const next = { ...current.menus.contextByNodeType }
  delete next[kind]
  appPreferences.set({
    ...current,
    menus: { contextByNodeType: next }
  })
}

export function resetAllContextMenuOrders() {
  const current = appPreferences.get()
  appPreferences.set({
    ...current,
    menus: { contextByNodeType: {} }
  })
}
