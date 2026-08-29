import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import {
  ChevronRight,
  ListCollapse,
  Spline,
  TypeOutline,
  type LucideIcon
} from 'lucide-react'

import { IS_BROWSER } from '@open-pencil/core/constants'
import type { EditorCommandId } from '#react/editor/commands/types'

import { createCanvasMenuActions } from '#react/app/editor/canvas/menu/actions'
import { buildCanvasContextMenuEntries } from '#react/app/editor/canvas/menu/context'
import { canvasMenuItemClass, canvasMenuShortcutClass } from '#react/app/editor/canvas/menu/model'
import { useEditorStore } from '#react/app/editor/store'
import { AppShortcutText } from '#react/components/ui/AppShortcutText'
import { menu, useMenuUI } from '#react/components/ui/menu'
import { editorCommandMetadata } from '#react/editor/commands'
import { useMenuModel } from '#react/editor/menu-model/use'
import type { MenuActionNode, MenuEntry } from '#react/editor/menu-model/types'
import { useSelectionState } from '#react/editor/selection-state/use'
import { useI18n } from '#react/i18n'

const MENU_VIEWPORT_PAD = 8
const MENU_MAX_HEIGHT_RATIO = 0.7
const CONTEXT_COMMAND_ICONS = {
  'selection.flatten': ListCollapse,
  'selection.outlineText': TypeOutline,
  'selection.outlineStroke': Spline
} satisfies Partial<Record<EditorCommandId, LucideIcon>>

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
  const { canvasMenu } = useMenuModel()
  const { menu: t } = useI18n()
  const actions = createCanvasMenuActions(store, selectedIds)
  const selectedGuide = store.state.guides.selected
  const entries = selectedGuide
    ? []
    : buildCanvasContextMenuEntries(canvasMenu, hasSelection, editor, actions, t)
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
  const menuRef = useRef<HTMLDivElement>(null)
  const [placement, setPlacement] = useState({
    left: x,
    top: y,
    maxHeight: IS_BROWSER ? window.innerHeight * MENU_MAX_HEIGHT_RATIO : 480
  })

  useLayoutEffect(() => {
    if (!IS_BROWSER) return
    const el = menuRef.current
    if (!el) return
    const width = el.offsetWidth
    const height = el.scrollHeight
    const maxHeight = Math.max(120, Math.round(window.innerHeight * MENU_MAX_HEIGHT_RATIO))
    const left = Math.max(
      MENU_VIEWPORT_PAD,
      Math.min(x, window.innerWidth - width - MENU_VIEWPORT_PAD)
    )
    const usedHeight = Math.min(height, maxHeight)
    let top = y
    if (y + usedHeight > window.innerHeight - MENU_VIEWPORT_PAD) {
      top = Math.max(MENU_VIEWPORT_PAD, window.innerHeight - usedHeight - MENU_VIEWPORT_PAD)
    }
    setPlacement((prev) =>
      prev.left === left && prev.top === top && prev.maxHeight === maxHeight
        ? prev
        : { left, top, maxHeight }
    )
  }, [x, y, entries.length, selectedGuide])

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
      ref={menuRef}
      data-slot="canvas-context-menu"
      className={`scrollbar-micro fixed z-50 overflow-y-auto overflow-x-hidden ${menuCls.content}`}
      style={{ left: placement.left, top: placement.top, maxHeight: placement.maxHeight }}
      role="menu"
      onContextMenu={(event) => event.preventDefault()}
    >
      {selectedGuide ? (
        <MenuRow className={cls.item} label={t.removeGuide} property="guide" onClick={removeSelectedGuide} />
      ) : (
        entries.map((item, index) => (
          <CanvasMenuEntry key={`menu-${index}`} item={item} cls={cls} onRun={run} />
        ))
      )}
    </div>
  )

  if (!IS_BROWSER) return menuNode
  return createPortal(menuNode, document.body)
}

function contextCommandIcon(id: EditorCommandId | undefined): LucideIcon | undefined {
  if (!id) return undefined
  return CONTEXT_COMMAND_ICONS[id as keyof typeof CONTEXT_COMMAND_ICONS]
}

function MenuRow({
  testId,
  className,
  disabled,
  label,
  shortcut,
  property,
  icon,
  onClick
}: {
  testId?: string
  className: string
  disabled?: boolean
  label: string
  shortcut?: string
  property?: string
  icon?: ReactNode
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
      <span className="flex min-w-0 flex-1 items-center gap-2">
        {icon}
        <span className="truncate">{label}</span>
      </span>
      {shortcut ? (
        <AppShortcutText ui={{ base: 'ml-auto shrink-0' }}>{shortcut}</AppShortcutText>
      ) : null}
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
  if (item.separator) return <div className={cls.sep} />
  if (item.sub) return <CanvasMenuSubmenu item={item} cls={cls} onRun={onRun} />
  const Icon = contextCommandIcon(item.id)
  const shortcutClass = canvasMenuShortcutClass(item.label)
  return (
    <button
      type="button"
      data-test-id={item.testId ?? (item.id ? editorCommandMetadata(item.id).contextTestId : undefined)}
      className={canvasMenuItemClass(item.label, cls)}
      disabled={item.disabled}
      data-disabled={item.disabled ? '' : undefined}
      onClick={() => onRun(item.action)}
    >
      <span className="flex min-w-0 flex-1 items-center gap-2">
        {Icon ? <Icon className="size-3.5 shrink-0 text-muted" /> : null}
        <span className="truncate">{item.label}</span>
      </span>
      {item.shortcut ? (
        <span className={`ml-auto shrink-0 text-[11px] ${shortcutClass}`}>{item.shortcut}</span>
      ) : null}
    </button>
  )
}

function CanvasMenuSubmenu({
  item,
  cls,
  onRun
}: {
  item: MenuActionNode
  cls: { item: string; component: string; sep: string }
  onRun: (action?: () => void) => void
}) {
  const triggerRef = useRef<HTMLButtonElement>(null)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState({ left: 0, top: 0 })

  function cancelClose() {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current)
      closeTimer.current = null
    }
  }

  function openSubmenu() {
    cancelClose()
    setOpen(true)
  }

  function scheduleClose() {
    cancelClose()
    closeTimer.current = setTimeout(() => setOpen(false), 160)
  }

  useEffect(() => () => cancelClose(), [])

  useLayoutEffect(() => {
    if (!open || !IS_BROWSER) return
    const trigger = triggerRef.current
    if (!trigger) return
    const rect = trigger.getBoundingClientRect()
    const left = rect.right + 4
    const top = rect.top
    const maxLeft = window.innerWidth - 180 - MENU_VIEWPORT_PAD
    setPos({
      left: left > maxLeft ? Math.max(MENU_VIEWPORT_PAD, rect.left - 180 - 4) : left,
      top: Math.min(top, window.innerHeight - MENU_VIEWPORT_PAD - 40)
    })
  }, [open])

  const submenu = open ? (
    <div
      data-slot="canvas-context-menu"
      className="scrollbar-micro fixed z-[60] min-w-44 overflow-y-auto rounded-xl bg-panel p-1 shadow-[0_8px_30px_rgb(0_0_0/0.4)]"
      style={{
        left: pos.left,
        top: pos.top,
        maxHeight: IS_BROWSER ? Math.round(window.innerHeight * MENU_MAX_HEIGHT_RATIO) : 320
      }}
      onMouseEnter={openSubmenu}
      onMouseLeave={scheduleClose}
    >
      {(item.sub ?? []).map((sub, index) =>
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
            <span className="min-w-0 truncate">{sub.label}</span>
            {sub.shortcut ? (
              <AppShortcutText ui={{ base: 'ml-auto shrink-0' }}>{sub.shortcut}</AppShortcutText>
            ) : null}
          </button>
        )
      )}
    </div>
  ) : null

  return (
    <div className="relative w-full" onMouseEnter={openSubmenu} onMouseLeave={scheduleClose}>
      <button
        ref={triggerRef}
        type="button"
        data-test-id={item.testId}
        className={cls.item}
        onClick={() => {
          cancelClose()
          setOpen((value) => !value)
        }}
      >
        <span className="min-w-0 truncate">{item.label}</span>
        <ChevronRight className="ml-auto size-3.5 shrink-0 text-muted" />
      </button>
      {IS_BROWSER && submenu ? createPortal(submenu, document.body) : submenu}
    </div>
  )
}
