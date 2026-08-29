import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { ChevronRight } from 'lucide-react'

import { IS_BROWSER } from '@open-pencil/core/constants'

import { createCanvasMenuActions } from '#react/app/editor/canvas/menu/actions'
import { buildCanvasContextMenuEntries } from '#react/app/editor/canvas/menu/context'
import { canvasMenuItemClass, canvasMenuShortcutClass } from '#react/app/editor/canvas/menu/model'
import { useEditorStore } from '#react/app/editor/store'
import { appMenuShortcutLabel } from '#react/app/shell/menu/shortcut'
import { AppShortcutText } from '#react/components/ui/AppShortcutText'
import { menu, useMenuUI } from '#react/components/ui/menu'
import { editorCommandMetadata, formatShortcut, useEditorCommands } from '#react/editor/commands'
import { useMenuModel } from '#react/editor/menu-model/use'
import type { MenuEntry } from '#react/editor/menu-model/types'
import { useSelectionState } from '#react/editor/selection-state/use'
import { useI18n } from '#react/i18n'

export function CanvasMenu({
  x,
  y,
  onClose
}: {
  x: number
  y: number
  onClose: () => void
}) {
  const store = useEditorStore()
  const { editor, selectedIds, hasSelection } = useSelectionState()
  const { getCommand } = useEditorCommands()
  const { canvasMenu } = useMenuModel()
  const { menu: t } = useI18n()
  const actions = createCanvasMenuActions(store, selectedIds)
  const selectedGuide = store.state.guides.selected
  const entries = buildCanvasContextMenuEntries(canvasMenu, hasSelection, editor, actions, t)
  const menuCls = useMenuUI({
    content: 'min-w-56 shadow-[0_8px_30px_rgb(0_0_0/0.4)] animate-in fade-in zoom-in-95',
    separator: 'my-1'
  })
  const componentMenu = menu({ tone: 'component' })
  const cls = {
    item: menuCls.item,
    component: componentMenu.item(),
    sep: menuCls.separator
  }
  const duplicate = getCommand('selection.duplicate')
  const remove = getCommand('selection.delete')
  const left = IS_BROWSER ? Math.min(x, window.innerWidth - 240) : x
  const top = IS_BROWSER ? Math.min(y, window.innerHeight - 320) : y

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    function onPointerDown(event: PointerEvent) {
      const target = event.target
      if (target instanceof Element && target.closest('[data-slot=canvas-context-menu]')) return
      onClose()
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('pointerdown', onPointerDown, true)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('pointerdown', onPointerDown, true)
    }
  }, [onClose])

  function removeSelectedGuide() {
    if (!selectedGuide) return
    store.removeGuide(selectedGuide.ownerId, selectedGuide.guideId)
    store.setSelectedGuide(null)
    onClose()
  }

  function run(action?: () => void) {
    action?.()
    onClose()
  }

  const menuNode = (
    <div
      data-slot="canvas-context-menu"
      className={`fixed z-50 ${menuCls.content}`}
      style={{ left, top }}
      role="menu"
      onContextMenu={(event) => event.preventDefault()}
    >
      {selectedGuide ? (
        <MenuRow
          className={cls.item}
          label={t.removeGuide}
          property="guide"
          onClick={removeSelectedGuide}
        />
      ) : (
        <>
          <MenuRow
            testId="context-copy"
            className={cls.item}
            disabled={!hasSelection}
            label={t.copy}
            shortcut={appMenuShortcutLabel('copy')}
            onClick={() => run(() => actions.execCommand('copy'))}
          />
          <MenuRow
            testId="context-cut"
            className={cls.item}
            disabled={!hasSelection}
            label={t.cut}
            shortcut={appMenuShortcutLabel('cut')}
            onClick={() => run(() => actions.execCommand('cut'))}
          />
          <MenuRow
            testId="context-paste"
            className={cls.item}
            label={t.pasteHere}
            shortcut={appMenuShortcutLabel('paste')}
            onClick={() => run(() => actions.execCommand('paste'))}
          />
          <MenuRow
            testId="context-paste-to-replace"
            className={cls.item}
            disabled={!hasSelection}
            label={t.pasteToReplace}
            onClick={() => run(actions.pasteToReplace)}
          />
          <MenuRow
            testId="context-duplicate"
            className={cls.item}
            disabled={!hasSelection}
            label={duplicate.label}
            shortcut={formatShortcut(editorCommandMetadata('selection.duplicate').shortcut)}
            onClick={() => run(() => duplicate.run())}
          />
          <MenuRow
            testId="context-delete"
            className={cls.item}
            disabled={!hasSelection}
            label={remove.label}
            shortcut={editorCommandMetadata('selection.delete').shortcut}
            onClick={() => run(() => remove.run())}
          />
          {entries.map((item, index) => (
            <CanvasMenuEntry key={`menu-${index}`} item={item} cls={cls} onRun={run} />
          ))}
        </>
      )}
    </div>
  )

  if (!IS_BROWSER) return menuNode
  return createPortal(menuNode, document.body)
}

function MenuRow({
  testId,
  className,
  disabled,
  label,
  shortcut,
  property,
  onClick
}: {
  testId?: string
  className: string
  disabled?: boolean
  label: string
  shortcut?: string
  property?: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      data-test-id={testId}
      data-property={property}
      className={className}
      disabled={disabled}
      data-disabled={disabled ? '' : undefined}
      onClick={onClick}
    >
      <span>{label}</span>
      {shortcut ? <AppShortcutText>{shortcut}</AppShortcutText> : null}
    </button>
  )
}

function CanvasMenuEntry({
  item,
  cls,
  onRun
}: {
  item: MenuEntry
  cls: { item: string; component: string; sep: string }
  onRun: (action?: () => void) => void
}) {
  const [open, setOpen] = useState(false)
  if (item.separator) return <div className={cls.sep} />
  if (item.sub) {
    return (
      <div className="relative" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
        <button type="button" data-test-id={item.testId} className={cls.item}>
          <span>{item.label}</span>
          <ChevronRight className="size-3.5 text-muted" />
        </button>
        {open ? (
          <div className="absolute top-0 left-full z-10 min-w-44 rounded-xl bg-panel p-1 shadow-[0_8px_30px_rgb(0_0_0/0.4)]">
            {item.sub.map((sub, index) =>
              sub.separator ? (
                <div key={index} className={cls.sep} />
              ) : (
                <button
                  key={index}
                  type="button"
                  data-test-id={sub.testId}
                  className={cls.item}
                  disabled={sub.disabled}
                  data-disabled={sub.disabled ? '' : undefined}
                  onClick={() => onRun(sub.action)}
                >
                  <span className="truncate">{sub.label}</span>
                  {sub.shortcut ? <AppShortcutText>{sub.shortcut}</AppShortcutText> : null}
                </button>
              )
            )}
          </div>
        ) : null}
      </div>
    )
  }
  return (
    <button
      type="button"
      data-test-id={item.testId ?? (item.id ? editorCommandMetadata(item.id).contextTestId : undefined)}
      className={canvasMenuItemClass(item.label, cls)}
      disabled={item.disabled}
      data-disabled={item.disabled ? '' : undefined}
      onClick={() => onRun(item.action)}
    >
      <span className="truncate">{item.label}</span>
      {item.shortcut ? (
        <span className={`text-[11px] ${canvasMenuShortcutClass(item.label)}`}>{item.shortcut}</span>
      ) : null}
    </button>
  )
}
