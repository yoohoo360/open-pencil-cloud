import { useMemo, useSyncExternalStore } from 'react'
import { useStore } from '@nanostores/react'
import { LoaderCircle } from 'lucide-react'

import { colorToCSS } from '@open-pencil/core/color'
import type { Color } from '@open-pencil/scene-graph'

import { documentBusyTasks } from '#react/app/document/busy/store'
import { useEditorStore } from '#react/app/editor/store'
import { contrastingInk } from '#react/controls/builtin-text/mode'
import { useI18n } from '#react/i18n'

function pageColorKey(color: Color): string {
  return `${color.r},${color.g},${color.b},${color.a}`
}

function usePageBusyColors(): { background: string; ink: string } {
  const editor = useEditorStore()
  const key = useSyncExternalStore(
    (onChange) => {
      const stops = [
        editor.onEditorEvent('render:requested', onChange),
        editor.onEditorEvent('page:changed', onChange)
      ]
      return () => {
        for (const stop of stops) stop()
      }
    },
    () => pageColorKey(editor.state.pageColor),
    () => pageColorKey(editor.state.pageColor)
  )
  return useMemo(() => {
    const background = colorToCSS(editor.state.pageColor)
    return { background, ink: contrastingInk(background) }
  }, [editor, key])
}

/**
 * Floating circular save status over the canvas (bottom-left).
 * Semi-transparent, tinted from the page background; never blocks input.
 */
export function DocumentBusyBar() {
  const tasks = useStore(documentBusyTasks)
  const { dialogs } = useI18n()
  const colors = usePageBusyColors()
  if (tasks.length === 0) return null

  const label = tasks.map((task) => task.label).join(' · ') || dialogs.savingDocument

  return (
    <div
      data-test-id="document-busy-bar"
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={label}
      className="pointer-events-none absolute bottom-3 left-3 z-20 flex max-w-[min(12rem,calc(100%-1.5rem))] items-center gap-1.5 rounded-full border px-2 py-1 shadow-sm backdrop-blur-sm"
      style={{
        backgroundColor: `color-mix(in srgb, ${colors.background} 28%, transparent)`,
        borderColor: `color-mix(in srgb, ${colors.ink} 12%, transparent)`,
        color: colors.ink
      }}
    >
      <LoaderCircle className="size-3 shrink-0 animate-spin opacity-75 motion-reduce:animate-none" />
      <p className="min-w-0 truncate text-[9px] opacity-75">{label}</p>
    </div>
  )
}
