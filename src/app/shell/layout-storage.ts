import { IS_BROWSER } from '@open-pencil/core/constants'

const EDITOR_LAYOUT_KEY = 'open-pencil:editor-layout'

export type EditorLayout = {
  layers: number
  canvas: number
  properties: number
}

const DEFAULT_EDITOR_LAYOUT: EditorLayout = {
  layers: 18,
  canvas: 64,
  properties: 18
}

function isEditorLayout(value: unknown): value is EditorLayout {
  if (typeof value !== 'object' || value === null) return false
  const record = value as Record<string, unknown>
  return (
    typeof record.layers === 'number' &&
    typeof record.canvas === 'number' &&
    typeof record.properties === 'number'
  )
}

export function loadEditorLayout(): EditorLayout {
  if (!IS_BROWSER) return DEFAULT_EDITOR_LAYOUT
  try {
    const raw = window.localStorage.getItem(EDITOR_LAYOUT_KEY)
    if (!raw) return DEFAULT_EDITOR_LAYOUT
    const parsed: unknown = JSON.parse(raw)
    if (isEditorLayout(parsed)) return parsed
    // Legacy Vue Splitter format: [layers, canvas, properties]
    if (
      Array.isArray(parsed) &&
      parsed.length === 3 &&
      parsed.every((v) => typeof v === 'number')
    ) {
      return {
        layers: parsed[0],
        canvas: parsed[1],
        properties: parsed[2]
      }
    }
    return DEFAULT_EDITOR_LAYOUT
  } catch {
    return DEFAULT_EDITOR_LAYOUT
  }
}

export function saveEditorLayout(layout: EditorLayout): void {
  if (!IS_BROWSER) return
  window.localStorage.setItem(EDITOR_LAYOUT_KEY, JSON.stringify(layout))
}
