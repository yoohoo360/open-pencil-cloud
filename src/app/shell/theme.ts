import { useLocalStorage, usePreferredDark } from '#react/shared/dom/hooks'
import { useCallback, useEffect, useMemo } from 'react'

import type { RulerTheme } from '@open-pencil/core/canvas'
import { parseColor } from '@open-pencil/core/color'
import { IS_BROWSER } from '@open-pencil/core/constants'

import { getActiveEditorStoreOrNull, useActiveEditorStore } from '@/app/editor/active-store'

export type AppTheme = 'dark' | 'light' | 'auto'

const THEME_STORAGE_KEY = 'open-pencil:theme'
const DEFAULT_THEME: AppTheme = 'dark'

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

export function useAppTheme() {
  const [theme, setThemeValue] = useLocalStorage<AppTheme>(THEME_STORAGE_KEY, DEFAULT_THEME)
  const prefersDark = usePreferredDark()
  const resolvedTheme = useMemo<'dark' | 'light'>(
    () => (theme === 'auto' ? (prefersDark ? 'dark' : 'light') : theme),
    [prefersDark, theme]
  )
  const activeStore = useActiveEditorStore()

  useEffect(() => {
    applyTheme(resolvedTheme, theme)
  }, [resolvedTheme, theme])

  useEffect(() => {
    updateCanvasTheme()
  }, [activeStore, resolvedTheme])

  const setTheme = useCallback((value: AppTheme) => setThemeValue(value), [setThemeValue])

  const isLight = resolvedTheme === 'light'
  const toggleTheme = useCallback(
    () => setThemeValue(isLight ? 'dark' : 'light'),
    [isLight, setThemeValue]
  )

  return { theme, resolvedTheme, isLight, setTheme, toggleTheme }
}
