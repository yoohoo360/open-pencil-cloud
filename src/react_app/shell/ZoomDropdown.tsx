import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { Check } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { EditorBridge } from '@/react_app/shell/EditorBridge'
import { menuContent, menuItem, menuSeparator } from '@/react_app/ui/menu'
import { useEditor, useEditorCommands, useEditorVersion, useI18n } from '@open-pencil/react'

import type { Vector } from '@open-pencil/core'
import type { Editor } from '@open-pencil/core/editor'

const ZOOM_PRESETS: ReadonlyArray<{ label: string; level: number; shortcut?: string }> = [
  { label: '50%', level: 0.5 },
  { label: '100%', level: 1, shortcut: '⌘0' },
  { label: '200%', level: 2 }
]

type AppChromeState = {
  showRulers: boolean
  showRemoteCursors: boolean
}

export function ZoomDropdownInner() {
  const editor = useEditor()
  useEditorVersion()
  const { getCommand } = useEditorCommands()
  const { menu: menuText, commands, panels } = useI18n()

  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const inputRef = useRef<HTMLInputElement | null>(null)

  const chrome = editor.state as typeof editor.state & AppChromeState
  const zoomPercent = Math.round(editor.state.zoom * 100)

  const contentCls = menuContent({ class: 'min-w-52' })
  const itemCls = menuItem({ justify: 'start', class: 'relative pl-7' })

  useEffect(() => {
    if (!open) setEditing(false)
  }, [open])

  useEffect(() => {
    if (editing) inputRef.current?.select()
  }, [editing])

  function startEditing() {
    setEditing(true)
    setInputValue(String(zoomPercent))
  }

  function commitInput() {
    const parsed = Number.parseInt(inputValue, 10)
    if (!Number.isNaN(parsed) && parsed > 0) {
      editor.zoomToLevel(parsed / 100)
    }
    setEditing(false)
  }

  function cancelInput() {
    setEditing(false)
  }

  function toggleRulers() {
    chrome.showRulers = !chrome.showRulers
    editor.requestRepaint()
  }

  function toggleRemoteCursors() {
    chrome.showRemoteCursors = !chrome.showRemoteCursors
    editor.requestRepaint()
  }

  function zoomIn() {
    const center = viewportScreenCenter(editor)
    editor.applyZoom(-100, center.x, center.y)
  }

  function zoomOut() {
    const center = viewportScreenCenter(editor)
    editor.applyZoom(100, center.x, center.y)
  }

  function isActivePreset(level: number) {
    return Math.abs(editor.state.zoom - level) < 0.005
  }

  return (
    <DropdownMenu.Root open={open} onOpenChange={setOpen}>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          data-test-id="zoom-dropdown-trigger"
          className="ml-auto cursor-pointer rounded px-1.5 py-0.5 text-[11px] text-muted hover:bg-hover"
        >
          {zoomPercent}%
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          side="bottom"
          sideOffset={4}
          align="end"
          className={contentCls}
          onEscapeKeyDown={cancelInput}
        >
          <div className="px-1 py-1">
            {editing ? (
              <input
                ref={inputRef}
                data-test-id="zoom-input"
                className="w-full rounded border border-accent bg-input px-2 py-1 text-xs text-surface outline-none"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onBlur={commitInput}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commitInput()
                  if (e.key === 'Escape') {
                    e.stopPropagation()
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
                {zoomPercent}%
              </button>
            )}
          </div>

          <DropdownMenu.Separator className={menuSeparator()} />

          <DropdownMenu.Item className={itemCls} onSelect={zoomIn}>
            <span className="flex-1">{menuText.zoomIn}</span>
            <span className="text-[11px] text-muted">⌘+</span>
          </DropdownMenu.Item>
          <DropdownMenu.Item className={itemCls} onSelect={zoomOut}>
            <span className="flex-1">{menuText.zoomOut}</span>
            <span className="text-[11px] text-muted">⌘−</span>
          </DropdownMenu.Item>
          <DropdownMenu.Item className={itemCls} onSelect={() => getCommand('view.zoomFit').run()}>
            <span className="flex-1">{commands.zoomToFit}</span>
            <span className="text-[11px] text-muted">⇧1</span>
          </DropdownMenu.Item>
          {ZOOM_PRESETS.map((preset) => (
            <DropdownMenu.Item
              key={preset.level}
              className={itemCls}
              onSelect={() => editor.zoomToLevel(preset.level)}
            >
              {isActivePreset(preset.level) ? <Check className="absolute left-2 size-3.5" /> : null}
              <span className="flex-1">{preset.label}</span>
              {preset.shortcut ? (
                <span className="text-[11px] text-muted">{preset.shortcut}</span>
              ) : null}
            </DropdownMenu.Item>
          ))}

          <DropdownMenu.Separator className={menuSeparator()} />

          <DropdownMenu.Item
            className={itemCls}
            onSelect={(e) => {
              e.preventDefault()
              toggleRulers()
            }}
          >
            {chrome.showRulers ? <Check className="absolute left-2 size-3.5" /> : null}
            <span className="flex-1">{panels.rulers}</span>
          </DropdownMenu.Item>
          <DropdownMenu.Item
            className={itemCls}
            onSelect={(e) => {
              e.preventDefault()
              toggleRemoteCursors()
            }}
          >
            {chrome.showRemoteCursors ? <Check className="absolute left-2 size-3.5" /> : null}
            <span className="flex-1">{panels.multiplayerCursors}</span>
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}

function viewportScreenCenter(editor: Editor): Vector {
  const withHelper = editor as Editor & {
    viewportScreenCenter?: () => Vector
  }
  if (typeof withHelper.viewportScreenCenter === 'function') {
    return withHelper.viewportScreenCenter()
  }
  const canvas = document.querySelector<HTMLCanvasElement>('[data-test-id="canvas-element"]')
  if (canvas) {
    const rect = canvas.getBoundingClientRect()
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
  }
  return { x: window.innerWidth / 2, y: window.innerHeight / 2 }
}

/** Zoom menu island — wrap with EditorBridge when mounted from Vue. */
export function ZoomDropdown({ editor }: { editor: Editor }) {
  return (
    <EditorBridge editor={editor}>
      <ZoomDropdownInner />
    </EditorBridge>
  )
}
