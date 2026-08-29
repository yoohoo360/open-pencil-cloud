import { useState } from 'react'
import { Check } from 'lucide-react'

import { formatShortcut } from '#react/editor/commands'
import { useEditorCommands } from '#react/editor/commands/use'
import { useI18n } from '#react/i18n'
import { useEditorStore } from '#react/app/editor/store'
import { AppShortcutText } from '#react/components/ui/AppShortcutText'
import { menuItem, useMenuUI } from '#react/components/ui/menu'
import { appMenuShortcut, appMenuShortcutLabel } from '#react/app/shell/menu/shortcut'

const ZOOM_PRESETS: ReadonlyArray<{ label: string; level: number; shortcut?: string }> = [
  { label: '50%', level: 0.5 },
  { label: '100%', level: 1, shortcut: appMenuShortcut('view.zoom100') },
  { label: '200%', level: 2 }
]

export function ZoomDropdown() {
  const store = useEditorStore()
  const { getCommand } = useEditorCommands()
  const { menu: menuText, commands } = useI18n()
  const [open, setOpen] = useState(false)
  const menuCls = useMenuUI({ content: 'min-w-52' })
  const itemCls = menuItem({ justify: 'start', class: 'relative pl-7' })
  const zoomPercent = Math.round(store.state.zoom * 100)

  function isActivePreset(level: number) {
    return Math.abs(store.state.zoom - level) < 0.005
  }

  return (
    <div className="relative ml-auto">
      <button
        type="button"
        data-test-id="zoom-dropdown"
        className="flex cursor-pointer items-center rounded px-2 py-1 text-[11px] text-muted hover:text-surface"
        onClick={() => setOpen((value) => !value)}
      >
        {zoomPercent}%
      </button>
      {open ? (
        <div className={`absolute right-0 z-20 mt-1 ${menuCls.content}`}>
          <button
            type="button"
            className={itemCls}
            onClick={() => {
              getCommand('view.zoomFit').run()
              setOpen(false)
            }}
          >
            <span>{commands.zoomToFit}</span>
            <AppShortcutText>{appMenuShortcutLabel('view.zoomFit')}</AppShortcutText>
          </button>
          <button
            type="button"
            className={itemCls}
            onClick={() => {
              getCommand('view.zoomSelection').run()
              setOpen(false)
            }}
          >
            <span>{commands.zoomToSelection}</span>
          </button>
          <div className={menuCls.separator} />
          {ZOOM_PRESETS.map((preset) => (
            <button
              key={preset.label}
              type="button"
              className={itemCls}
              onClick={() => {
                store.zoomToLevel(preset.level)
                setOpen(false)
              }}
            >
              <span className="absolute left-2 flex size-3.5 items-center justify-center">
                {isActivePreset(preset.level) ? <Check className="size-3" /> : null}
              </span>
              <span>{preset.label}</span>
              {preset.shortcut ? (
                <AppShortcutText>{formatShortcut(preset.shortcut)}</AppShortcutText>
              ) : null}
            </button>
          ))}
          <div className={menuCls.separator} />
          <button
            type="button"
            className={itemCls}
            onClick={() => {
              store.state.showRulers = !store.state.showRulers
              store.requestRepaint()
              store.notify()
              setOpen(false)
            }}
          >
            <span>{menuText.rulers}</span>
          </button>
        </div>
      ) : null}
    </div>
  )
}
