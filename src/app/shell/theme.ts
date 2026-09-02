import { atom, computed } from 'nanostores'

import type { RulerTheme } from '@open-pencil/core/canvas'
import { parseColor } from '@open-pencil/core/color'
import { IS_BROWSER } from '@open-pencil/core/constants'

import { getActiveEditorStoreOrNull } from '@/app/editor/active-store'

export type AppTheme = 'dark' | 'light' | 'auto'

const THEME_STORAGE_KEY = 'open-pencil:theme'
const DEFAULT_THEME: AppTheme = 'dark'

function readStoredTheme(): AppTheme {
  if (!IS_BROWSER) return DEFAULT_THEME
  return (localStorage.getItem(THEME_STORAGE_KEY) as AppTheme) ?? DEFAULT_THEME
}

function getSystemDark(): boolean {
  if (!IS_BROWSER) return true
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

export const $theme = atom<AppTheme>(readStoredTheme())
export const $prefersDark = atom<boolean>(getSystemDark())

if (IS_BROWSER) {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    $prefersDark.set(e.matches)
  })
}

export const $resolvedTheme = computed([$theme, $prefersDark], (theme, prefersDark) => {
  if (theme === 'auto') return prefersDark ? 'dark' : 'light'
  return theme
})

function readRulerTheme(): RulerTheme | null {
  if (!IS_BROWSER || !('document' in globalThis)) return null
  const style = getComputedStyle(document.documentElement)
  return {
    background: parseColor(style.getPropertyValue('--color-ruler-bg')),
    tick: parseColor(style.getPropertyValue('--color-ruler-tick')),
    text: parseColor(style.getPropertyValue('--color-ruler-text')),
    label: parseColor(style.getPropertyValue('--color-ruler-label'))
  }
}

function updateCanvasTheme(): void {
  if (!IS_BROWSER) return
  const store = getActiveEditorStoreOrNull()
  if (!store) return
  store.state.rulerTheme = readRulerTheme() ?? undefined
  store.requestRepaint()
}

function applyTheme(value: 'dark' | 'light', setting: AppTheme): void {
  if (!IS_BROWSER || !('document' in globalThis)) return
  document.documentElement.dataset.theme = value
  document.documentElement.dataset.themeSetting = setting
  document.documentElement.style.colorScheme = value
  updateCanvasTheme()
}

$resolvedTheme.subscribe((value) => {
  localStorage.setItem(THEME_STORAGE_KEY, $theme.get())
  applyTheme(value, $theme.get())
})

function setTheme(value: AppTheme): void {
  $theme.set(value)
  if (IS_BROWSER) localStorage.setItem(THEME_STORAGE_KEY, value)
}

function toggleTheme(): void {
  setTheme($resolvedTheme.get() === 'light' ? 'dark' : 'light')
}

/** React hook: subscribes to theme changes and keeps DOM in sync. Returns stable helpers. */
export function useAppTheme() {
  return { $theme, $resolvedTheme, setTheme, toggleTheme }
}

// Apply immediately on load
applyTheme($resolvedTheme.get(), $theme.get())
