import { useRef, useState } from 'react'
import { DropdownMenuContent, DropdownMenuItem, DropdownMenuPortal, Root as DropdownMenuRoot, DropdownMenuSeparator, DropdownMenuTrigger } from '@radix-ui/react-dropdown-menu'

import { useEditorCommands, useI18n, formatShortcut, useEditorEvent } from '@open-pencil/react'
import { AppShortcutText } from '@/components/ui/AppShortcutText'
import { menuItem, useMenuUI } from '@/components/ui/menu'
import { useEditorStore } from '@/app/editor/active-store'
import { appMenuShortcut, appMenuShortcutLabel } from '@/app/shell/menu/shortcut'

import IconLucideCheck from '~icons/lucide/check'

const ZOOM_PRESETS: ReadonlyArray<{ label: string; level: number; shortcut?: string }> = [
  { label: '50%', level: 0.5 },
  { label: '100%', level: 1, shortcut: appMenuShortcut('view.zoom100') },
  { label: '200%', level: 2 }
]

export default function ZoomDropdown() {
  const store = useEditorStore()
  const { getCommand } = useEditorCommands()
  const { menu: menuText, commands, panels } = useI18n()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const [zoom, setZoom] = useState(store.state.zoom)
  const inputRef = useRef<HTMLInputElement>(null)

  const menuCls = useMenuUI({ content: 'min-w-52' })
  const itemCls = menuItem({ justify: 'start', class: 'relative pl-7' })

  useEditorEvent('viewport:changed', () => setZoom(store.state.zoom))
  useEditorEvent('render:requested', () => setZoom(store.state.zoom))

  function zoomPercent() {
    return Math.round(zoom * 100)
  }

  function startEditing() {
    setEditing(true)
    setInputValue(String(zoomPercent()))
    setTimeout(() => inputRef.current?.select(), 0)
  }

  function commitInput() {
    const parsed = Number.parseInt(inputValue, 10)
    if (!Number.isNaN(parsed) && parsed > 0) {
      store.zoomToLevel(parsed / 100)
    }
    setEditing(false)
  }

  function cancelInput() {
    setEditing(false)
  }

  function toggleRulers() {
    store.state.showRulers = !store.state.showRulers
    store.requestRepaint()
  }

  function toggleRemoteCursors() {
    store.state.showRemoteCursors = !store.state.showRemoteCursors
    store.requestRepaint()
  }

  function zoomIn() {
    const center = store.viewportScreenCenter()
    store.applyZoom(-100, center.x, center.y)
  }

  function zoomOut() {
    const center = store.viewportScreenCenter()
    store.applyZoom(100, center.x, center.y)
  }

  function isActivePreset(level: number) {
    return Math.abs(zoom - level) < 0.005
  }

  return (
    <DropdownMenuRoot open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(false) }}>
      <DropdownMenuTrigger asChild>
        <button
          data-test-id="zoom-dropdown-trigger"
          type="button"
          className="ml-auto cursor-pointer rounded px-1.5 py-0.5 text-[11px] text-muted hover:bg-hover"
        >
          {zoomPercent()}%
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuPortal>
        <DropdownMenuContent
          side="bottom"
          sideOffset={4}
          align="end"
          className={menuCls.content}
          onEscapeKeyDown={cancelInput}
        >
          <div className="px-1 py-1">
            {editing ? (
              <input
                ref={inputRef}
                value={inputValue}
                data-test-id="zoom-input"
                className="w-full rounded border border-accent bg-input px-2 py-1 text-xs text-surface outline-none"
                onChange={(e) => setInputValue(e.target.value)}
                onBlur={commitInput}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commitInput()
                  if (e.key === 'Escape') { e.stopPropagation(); cancelInput() }
                }}
              />
            ) : (
              <button
                data-test-id="zoom-input-trigger"
                type="button"
                className="w-full cursor-pointer rounded border border-border bg-input px-2 py-1 text-left text-xs text-surface hover:border-muted"
                onClick={startEditing}
              >
                {zoomPercent()}%
              </button>
            )}
          </div>

          <DropdownMenuSeparator className={menuCls.separator} />

          <DropdownMenuItem className={itemCls} onSelect={zoomIn}>
            <span className="flex-1">{menuText.zoomIn}</span>
            <AppShortcutText>{appMenuShortcutLabel('zoom-in')}</AppShortcutText>
          </DropdownMenuItem>
          <DropdownMenuItem className={itemCls} onSelect={zoomOut}>
            <span className="flex-1">{menuText.zoomOut}</span>
            <AppShortcutText>{appMenuShortcutLabel('zoom-out')}</AppShortcutText>
          </DropdownMenuItem>
          <DropdownMenuItem className={itemCls} onSelect={() => getCommand('view.zoomFit').run()}>
            <span className="flex-1">{commands.zoomToFit}</span>
            <AppShortcutText>{appMenuShortcutLabel('view.zoomFit')}</AppShortcutText>
          </DropdownMenuItem>
          {ZOOM_PRESETS.map((preset) => (
            <DropdownMenuItem
              key={preset.level}
              className={itemCls}
              onSelect={() => store.zoomToLevel(preset.level)}
            >
              {isActivePreset(preset.level) && (
                <IconLucideCheck className="absolute left-2 size-3.5" />
              )}
              <span className="flex-1">{preset.label}</span>
              {preset.shortcut && (
                <AppShortcutText>{formatShortcut(preset.shortcut)}</AppShortcutText>
              )}
            </DropdownMenuItem>
          ))}

          <DropdownMenuSeparator className={menuCls.separator} />

          <DropdownMenuItem className={itemCls} onSelect={(e) => { e.preventDefault(); toggleRulers() }}>
            {store.state.showRulers && <IconLucideCheck className="absolute left-2 size-3.5" />}
            <span className="flex-1">{panels.rulers}</span>
          </DropdownMenuItem>
          <DropdownMenuItem className={itemCls} onSelect={(e) => { e.preventDefault(); toggleRemoteCursors() }}>
            {store.state.showRemoteCursors && <IconLucideCheck className="absolute left-2 size-3.5" />}
            <span className="flex-1">{panels.multiplayerCursors}</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenuPortal>
    </DropdownMenuRoot>
  )
}
