import { atom } from 'nanostores'
import { DEFAULT_SNAPPING_PREFERENCES, type SnappingPreferences } from '@open-pencil/core/editor'

import { IS_BROWSER } from '@open-pencil/core/constants'

export interface AppPreferences {
  version: 1
  recovery: {
    enabled: boolean
  }
  editing: {
    snapping: SnappingPreferences
  }
}

export const DEFAULT_APP_PREFERENCES: Readonly<AppPreferences> = {
  version: 1,
  recovery: { enabled: true },
  editing: {
    snapping: { ...DEFAULT_SNAPPING_PREFERENCES }
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
      snapping: snappingFromUnknown(editing?.snapping)
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
