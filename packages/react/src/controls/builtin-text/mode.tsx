import { useEditor } from '#react/editor/context'
import {
  createContext,
  useContext,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode
} from 'react'

import { colorToCSS, parseColor } from '@open-pencil/core/color'

export type BuiltinEditorMode = 'preview' | 'markdown'

const BuiltinEditorModeContext = createContext<{
  mode: BuiltinEditorMode
  setMode: (mode: BuiltinEditorMode) => void
  pageBackground: string
  pageInk: string
} | null>(null)

export function contrastingInk(background: string): string {
  const color = parseColor(background)
  const luma = color.r * 0.2126 + color.g * 0.7152 + color.b * 0.0722
  return luma > 0.55 ? '#1f1f1f' : '#f5f5f5'
}

function usePageBackground() {
  const editor = useEditor()
  return useSyncExternalStore(
    (onChange) => editor.onEditorEvent('render:requested', onChange),
    () => colorToCSS(editor.state.pageColor),
    () => colorToCSS(editor.state.pageColor)
  )
}

export function BuiltinEditorModeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<BuiltinEditorMode>('preview')
  const pageBackground = usePageBackground()
  const pageInk = contrastingInk(pageBackground)
  const value = useMemo(
    () => ({ mode, setMode, pageBackground, pageInk }),
    [mode, pageBackground, pageInk]
  )
  return (
    <BuiltinEditorModeContext.Provider value={value}>{children}</BuiltinEditorModeContext.Provider>
  )
}

export function useBuiltinEditorMode() {
  const value = useContext(BuiltinEditorModeContext)
  if (!value) {
    throw new Error('Builtin editor mode is not provided')
  }
  return value
}
