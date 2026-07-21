import IconLucideCheck from '~icons/lucide/check'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { formatShortcut, useEditorCommands, useI18n } from '@open-pencil/react'

import { useEditorStore } from '@/app/editor/active-store'
import { appMenuShortcut, appMenuShortcutLabel } from '@/app/shell/menu/shortcut'
import AppShortcutText from '@/components/ui/AppShortcutText'
import { menuItem, useMenuUI } from '@/components/ui/menu'

const ZOOM_PRESETS: ReadonlyArray<{ label: string; level: number; shortcut?: string }> = [
  { label: '50%', level: 0.5 },
  { label: '100%', level: 1, shortcut: appMenuShortcut('view.zoom100') },
  { label: '200%', level: 2 }
]

export const ZoomDropdown = memo(function ZoomDropdown() {
  const store = useEditorStore()
  const { getCommand } = useEditorCommands()
  const { menu: menuText, commands, panels } = useI18n()

  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [inputValue, setInputValue] = useState('')

  const menuCls = useMenuUI({ content: 'min-w-52' })
  const itemCls = menuItem({ justify: 'start', class: 'relative pl-7' })

  const zoomPercent = useCallback(() => Math.round(store.state.zoom * 100), [store.state.zoom])

  const startEditing = useCallback(() => {
    setEditing(true)
    setInputValue(String(zoomPercent()))
  }, [zoomPercent])

  useEffect(() => {
    if (editing) inputRef.current?.select()
  }, [editing])

  const commitInput = useCallback(() => {
    const parsed = Number.parseInt(inputValue, 10)
    if (!Number.isNaN(parsed) && parsed > 0) {
      store.zoomToLevel(parsed / 100)
    }
    setEditing(false)
  }, [inputValue, store])

  const cancelInput = useCallback(() => {
    setEditing(false)
  }, [])

  useEffect(() => {
    if (!open) setEditing(false)
  }, [open])

  const toggleRulers = useCallback(() => {
    store.state.showRulers = !store.state.showRulers
    store.requestRepaint()
  }, [store])

  const toggleRemoteCursors = useCallback(() => {
    store.state.showRemoteCursors = !store.state.showRemoteCursors
    store.requestRepaint()
  }, [store])

  const zoomIn = useCallback(() => {
    const center = store.viewportScreenCenter()
    store.applyZoom(-100, center.x, center.y)
  }, [store])

  const zoomOut = useCallback(() => {
    const center = store.viewportScreenCenter()
    store.applyZoom(100, center.x, center.y)
  }, [store])

  const isActivePreset = useCallback(
    (level: number) => Math.abs(store.state.zoom - level) < 0.005,
    [store.state.zoom]
  )

  const percent = useMemo(() => zoomPercent(), [zoomPercent])

  return (
    <DropdownMenu.Root open={open} onOpenChange={setOpen}>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          data-test-id="zoom-dropdown-trigger"
          className="ml-auto cursor-pointer rounded px-1.5 py-0.5 text-[11px] text-muted hover:bg-hover"
        >
          {percent}%
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
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
                onBlur={commitInput}
                onChange={(event) => setInputValue(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') commitInput()
                  if (event.key === 'Escape') {
                    event.stopPropagation()
                    cancelInput()
                  }
                }}
              />
            ) : (
              <button
                type="button"
                data-test-id="zoom-input-trigger"
                className="w-full cursor-pointer rounded border border-border bg-input px-2 py-1 text-left text-xs text-surface hover:border-muted"
                onClick={startEditing}
              >
                {percent}%
              </button>
            )}
          </div>

          <DropdownMenu.Separator className={menuCls.separator} />

          <DropdownMenu.Item className={itemCls} onSelect={zoomIn}>
            <span className="flex-1">{menuText.zoomIn}</span>
            <AppShortcutText>{appMenuShortcutLabel('zoom-in')}</AppShortcutText>
          </DropdownMenu.Item>
          <DropdownMenu.Item className={itemCls} onSelect={zoomOut}>
            <span className="flex-1">{menuText.zoomOut}</span>
            <AppShortcutText>{appMenuShortcutLabel('zoom-out')}</AppShortcutText>
          </DropdownMenu.Item>
          <DropdownMenu.Item className={itemCls} onSelect={() => getCommand('view.zoomFit').run()}>
            <span className="flex-1">{commands.zoomToFit}</span>
            <AppShortcutText>{appMenuShortcutLabel('view.zoomFit')}</AppShortcutText>
          </DropdownMenu.Item>
          {ZOOM_PRESETS.map((preset) => (
            <DropdownMenu.Item
              key={preset.level}
              className={itemCls}
              onSelect={() => store.zoomToLevel(preset.level)}
            >
              {isActivePreset(preset.level) ? (
                <IconLucideCheck className="absolute left-2 size-3.5" />
              ) : null}
              <span className="flex-1">{preset.label}</span>
              {preset.shortcut ? (
                <AppShortcutText>{formatShortcut(preset.shortcut)}</AppShortcutText>
              ) : null}
            </DropdownMenu.Item>
          ))}

          <DropdownMenu.Separator className={menuCls.separator} />

          <DropdownMenu.Item className={itemCls} onSelect={(event) => event.preventDefault()} onClick={toggleRulers}>
            {store.state.showRulers ? <IconLucideCheck className="absolute left-2 size-3.5" /> : null}
            <span className="flex-1">{panels.rulers}</span>
          </DropdownMenu.Item>
          <DropdownMenu.Item
            className={itemCls}
            onSelect={(event) => event.preventDefault()}
            onClick={toggleRemoteCursors}
          >
            {store.state.showRemoteCursors ? (
              <IconLucideCheck className="absolute left-2 size-3.5" />
            ) : null}
            <span className="flex-1">{panels.multiplayerCursors}</span>
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
})

ZoomDropdown.displayName = 'ZoomDropdown'
export default ZoomDropdown
