import * as ContextMenu from '@radix-ui/react-context-menu'

import { menuContent, menuItem, menuSeparator } from '@/react_app/ui/menu'
import { toast } from '@/utils/toast'
import {
  useEditor,
  useEditorCommands,
  useMenuModel,
  useSelectionState,
  type MenuEntry
} from '@open-pencil/react'

import type { Editor } from '@open-pencil/core/editor'

type AppEditor = Editor & {
  renderExportImage: (ids: string[], scale: number, format: 'PNG') => Promise<Uint8Array | null>
  copySelectionAsText: (ids: string[]) => string | null
  copySelectionAsSVG: (ids: string[]) => string | null
  copySelectionAsJSX: (ids: string[]) => string | null
}

export function CanvasMenu() {
  const store = useEditor() as AppEditor
  const { editor, selectedIds, hasSelection } = useSelectionState()
  const { getCommand } = useEditorCommands()
  const { canvasMenu } = useMenuModel()

  const contentCls = menuContent({
    class: 'min-w-56 shadow-[0_8px_30px_rgb(0_0_0/0.4)] animate-in fade-in zoom-in-95'
  })
  const itemCls = menuItem()
  const componentCls = menuItem({ class: 'text-component data-[highlighted]:bg-component/10' })
  const sepCls = menuSeparator({ class: 'my-1' })

  function ids() {
    return [...selectedIds]
  }

  function execCommand(cmd: string) {
    window.document.execCommand(cmd)
  }

  async function clipboardWrite(text: string | null, label: string) {
    if (!text) return
    await navigator.clipboard.writeText(text)
    toast.show(`Copied as ${label}`)
  }

  async function copyAsPNG() {
    const data = await store.renderExportImage([...selectedIds], 2, 'PNG')
    if (!data) return
    const blob = new Blob([new Uint8Array(data)], { type: 'image/png' })
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
    toast.show('Copied as PNG')
  }

  function renderEntry(item: MenuEntry, key: string) {
    if (item.separator) {
      return <ContextMenu.Separator key={key} className={sepCls} />
    }
    if (item.sub) {
      return (
        <ContextMenu.Sub key={key}>
          <ContextMenu.SubTrigger className={itemCls}>
            <span>{item.label}</span>
            <span className="text-sm text-muted">›</span>
          </ContextMenu.SubTrigger>
          <ContextMenu.Portal>
            <ContextMenu.SubContent className={contentCls}>
              {item.sub.map((sub, j) =>
                sub.separator ? (
                  <ContextMenu.Separator key={j} className={sepCls} />
                ) : (
                  <ContextMenu.Item
                    key={j}
                    className={itemCls}
                    disabled={sub.disabled}
                    onSelect={() => sub.action?.()}
                  >
                    <span className="flex-1">{sub.label}</span>
                    {sub.shortcut ? (
                      <span className="text-[11px] text-muted">{sub.shortcut}</span>
                    ) : null}
                  </ContextMenu.Item>
                )
              )}
            </ContextMenu.SubContent>
          </ContextMenu.Portal>
        </ContextMenu.Sub>
      )
    }

    const isComponent = item.label.includes('component') || item.label.includes('instance')
    return (
      <ContextMenu.Item
        key={key}
        className={isComponent ? componentCls : itemCls}
        disabled={item.disabled}
        onSelect={() => item.action?.()}
      >
        <span className="flex-1">{item.label}</span>
        {item.shortcut ? (
          <span className={`text-[11px] ${isComponent ? 'text-component/60' : 'text-muted'}`}>
            {item.shortcut}
          </span>
        ) : null}
      </ContextMenu.Item>
    )
  }

  return (
    <ContextMenu.Content className={contentCls}>
      <ContextMenu.Item
        className={itemCls}
        disabled={!hasSelection}
        onSelect={() => execCommand('copy')}
      >
        <span>Copy</span>
        <span className="text-[11px] text-muted">⌘C</span>
      </ContextMenu.Item>
      <ContextMenu.Item
        className={itemCls}
        disabled={!hasSelection}
        onSelect={() => execCommand('cut')}
      >
        <span>Cut</span>
        <span className="text-[11px] text-muted">⌘X</span>
      </ContextMenu.Item>
      <ContextMenu.Item className={itemCls} onSelect={() => execCommand('paste')}>
        <span>Paste here</span>
        <span className="text-[11px] text-muted">⌘V</span>
      </ContextMenu.Item>
      <ContextMenu.Item
        className={itemCls}
        disabled={!hasSelection}
        onSelect={() => getCommand('selection.duplicate').run()}
      >
        <span>Duplicate</span>
        <span className="text-[11px] text-muted">⌘D</span>
      </ContextMenu.Item>
      <ContextMenu.Item
        className={itemCls}
        disabled={!hasSelection}
        onSelect={() => getCommand('selection.delete').run()}
      >
        <span>Delete</span>
        <span className="text-[11px] text-muted">⌫</span>
      </ContextMenu.Item>

      {canvasMenu.map((item, i) => renderEntry(item, `menu-${i}`))}

      {hasSelection ? (
        <>
          <ContextMenu.Separator className={sepCls} />
          <ContextMenu.Sub>
            <ContextMenu.SubTrigger className={itemCls}>
              <span>Copy/Paste as</span>
              <span className="text-sm text-muted">›</span>
            </ContextMenu.SubTrigger>
            <ContextMenu.Portal>
              <ContextMenu.SubContent className={contentCls}>
                <ContextMenu.Item
                  className={itemCls}
                  onSelect={() => void clipboardWrite(editor.copySelectionAsText(ids()), 'text')}
                >
                  Copy as text
                </ContextMenu.Item>
                <ContextMenu.Item
                  className={itemCls}
                  onSelect={() => void clipboardWrite(editor.copySelectionAsSVG(ids()), 'SVG')}
                >
                  Copy as SVG
                </ContextMenu.Item>
                <ContextMenu.Item className={itemCls} onSelect={() => void copyAsPNG()}>
                  <span>Copy as PNG</span>
                  <span className="text-[11px] text-muted">⇧⌘C</span>
                </ContextMenu.Item>
                <ContextMenu.Item
                  className={itemCls}
                  onSelect={() => void clipboardWrite(editor.copySelectionAsJSX(ids()), 'JSX')}
                >
                  Copy as JSX
                </ContextMenu.Item>
              </ContextMenu.SubContent>
            </ContextMenu.Portal>
          </ContextMenu.Sub>
        </>
      ) : null}
    </ContextMenu.Content>
  )
}
