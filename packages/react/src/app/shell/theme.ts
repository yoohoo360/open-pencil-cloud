import { atom } from 'nanostores'
import { useStore } from '@nanostores/react'

import { parseColor } from '@open-pencil/core/color'
import { IS_BROWSER } from '@open-pencil/core/constants'
import type { RulerTheme } from '@open-pencil/core/canvas'

import type { EditorStore } from '#react/app/editor/store'

export type AppTheme = 'dark' | 'light' | 'auto'

const THEME_STORAGE_KEY = 'open-pencil:theme'
const DEFAULT_THEME: AppTheme = 'dark'

function readStoredTheme(): AppTheme {
  if (!IS_BROWSER) return DEFAULT_THEME
  const stored = localStorage.getItem(THEME_STORAGE_KEY)
  if (stored === 'light' || stored === 'dark' || stored === 'auto') return stored
  return DEFAULT_THEME
}

export const appTheme = atom<AppTheme>(readStoredTheme())

function prefersDark() {
  if (!IS_BROWSER) return true
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

export function resolvedAppTheme(setting: AppTheme): 'dark' | 'light' {
  if (setting === 'auto') return prefersDark() ? 'dark' : 'light'
  return setting
}

function readRulerTheme(): RulerTheme | null {
  if (!IS_BROWSER) return null
  const style = getComputedStyle(document.documentElement)
  return {
    background: parseColor(style.getPropertyValue('--color-ruler-bg')),
    tick: parseColor(style.getPropertyValue('--color-ruler-tick')),
    text: parseColor(style.getPropertyValue('--color-ruler-text')),
    label: parseColor(style.getPropertyValue('--color-ruler-label'))
  }
}

function applyDocumentTheme(setting: AppTheme) {
  if (!IS_BROWSER) return
  const value = resolvedAppTheme(setting)
  document.documentElement.dataset.theme = value
  document.documentElement.dataset.themeSetting = setting
  document.documentElement.style.colorScheme = value
}

export function applyEditorRulerTheme(store: EditorStore) {
  store.state.rulerTheme = readRulerTheme() ?? undefined
  store.requestRepaint()
}

export function setAppTheme(value: AppTheme) {
  appTheme.set(value)
}

appTheme.subscribe((setting) => {
  if (IS_BROWSER) localStorage.setItem(THEME_STORAGE_KEY, setting)
  applyDocumentTheme(setting)
})

if (IS_BROWSER) {
  applyDocumentTheme(appTheme.get())
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (appTheme.get() === 'auto') applyDocumentTheme('auto')
  })
}

export function useAppTheme() {
  const theme = useStore(appTheme)
  return {
    theme,
    resolvedTheme: resolvedAppTheme(theme),
    setTheme: setAppTheme
  }
}
