import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useStore } from '@nanostores/react'
import { Check, ChevronRight, Settings, Sidebar } from 'lucide-react'

import { IS_BROWSER, IS_TAURI } from '@open-pencil/core/constants'

import { useEditorStore } from '#react/app/editor/store'
import { openSettingsDialog, settingsDialogOpen } from '#react/app/settings/dialog'
import { useAppMenu, type AppMenuGroup } from '#react/app/shell/menu/app-menu'
import { SettingsDialog } from '#react/components/settings/SettingsDialog'
import {
  hasMenuSubItems,
  isMenuAction,
  isMenuCheckbox,
  isMenuSeparator,
  menuChecked,
  menuDisabled,
  menuLabel,
  menuShortcut,
  menuSubItems,
  runMenuAction,
  updateMenuChecked
} from '#react/app/shell/menu/entry'
import { appMenuShortcutLabel } from '#react/app/shell/menu/shortcut'
import { applyEditorRulerTheme, useAppTheme } from '#react/app/shell/theme'
import { AppShortcutText } from '#react/components/ui/AppShortcutText'
import { useMenuUI } from '#react/components/ui/menu'
import { Tip } from '#react/components/ui/Tip'
import type { MenuActionNode, MenuEntry } from '#react/editor/menu-model/types'
import { useI18n } from '#react/i18n'

const MENU_VIEWPORT_PAD = 8

export function AppMenu() {
  const store = useEditorStore()
  const { dialogs, menu: t } = useI18n()
  const { topMenus } = useAppMenu()
  const { resolvedTheme } = useAppTheme()
  const settingsOpen = useStore(settingsDialogOpen)
  const [editingName, setEditingName] = useState(false)
  const nameInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    applyEditorRulerTheme(store)
  }, [resolvedTheme, store])

  useEffect(() => {
    if (!editingName) return
    const input = nameInputRef.current
    if (!input) return
    input.focus()
    input.select()
  }, [editingName])

  return (
    <div className="shrink-0 border-b border-border">
      <div className="flex items-center gap-2 px-2 py-1.5">
        <img data-test-id="app-logo" src="/favicon-32.png" className="size-4" alt="OpenPencil" />
        {editingName ? (
          <input
            ref={nameInputRef}
            data-test-id="app-document-name-input"
            className="min-w-0 flex-1 rounded border border-accent bg-input px-1 py-0.5 text-xs text-surface outline-none"
            defaultValue={store.state.documentName}
            onBlur={(event) => {
              store.state.documentName =
                event.currentTarget.value.trim() || store.state.documentName
              store.notify()
              setEditingName(false)
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter') event.currentTarget.blur()
              if (event.key === 'Escape') setEditingName(false)
            }}
          />
        ) : (
          <span
            data-test-id="app-document-name"
            className="min-w-0 flex-1 cursor-default truncate rounded px-1 py-0.5 text-xs text-surface hover:bg-hover"
            onDoubleClick={() => setEditingName(true)}
          >
            {store.state.documentName}
          </span>
        )}
        <Tip label={dialogs.settings}>
          <button
            type="button"
            data-test-id="app-settings-trigger"
            aria-label={dialogs.settings}
            className="flex size-6 shrink-0 cursor-pointer items-center justify-center rounded text-muted transition-colors hover:bg-hover hover:text-surface"
            onClick={() => openSettingsDialog()}
          >
            <Settings className="size-3.5" />
          </button>
        </Tip>
        <Tip label={`${t.toggleUI} (${appMenuShortcutLabel('toggle-ui')})`}>
          <button
            type="button"
            data-test-id="app-toggle-ui"
            aria-label={t.toggleUI}
            className="flex size-6 shrink-0 cursor-pointer items-center justify-center rounded text-muted transition-colors hover:bg-hover hover:text-surface"
            onClick={() => store.setShowUI(!store.state.showUI)}
          >
            <Sidebar className="size-3.5" />
          </button>
        </Tip>
      </div>
      {IS_TAURI ? null : <AppMenubar menus={topMenus} />}
      {settingsOpen ? <SettingsDialog /> : null}
    </div>
  )
}

function AppMenubar({ menus }: { menus: AppMenuGroup[] }) {
  const menuCls = useMenuUI()
  const mainMenuCls = useMenuUI({ content: 'min-w-52' })
  const subMenuCls = useMenuUI({ content: 'min-w-44' })
  const [openMenu, setOpenMenu] = useState<string | null>(null)

  useEffect(() => {
    if (!openMenu || !IS_BROWSER) return
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpenMenu(null)
    }
    function onPointerDown(event: PointerEvent) {
      const target = event.target
      if (target instanceof Element && target.closest('[data-slot=app-menubar]')) return
      setOpenMenu(null)
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('pointerdown', onPointerDown, true)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('pointerdown', onPointerDown, true)
    }
  }, [openMenu])

  return (
    <div className="flex items-center px-1 pb-1">
      <div
        data-slot="app-menubar"
        className="scrollbar-none flex items-center gap-0.5 overflow-x-auto"
        role="menubar"
      >
        {menus.map((menu) => (
          <MenubarMenu
            key={menu.testId}
            label={menu.label}
            testId={menu.testId}
            items={menu.items}
            open={openMenu === menu.testId}
            anyOpen={openMenu !== null}
            onOpen={() => setOpenMenu(menu.testId)}
            onClose={() => setOpenMenu(null)}
            menuCls={menuCls}
            contentClass={mainMenuCls.content}
            subContentClass={subMenuCls.content}
          />
        ))}
      </div>
    </div>
  )
}

function MenubarMenu({
  label,
  testId,
  items,
  open,
  anyOpen,
  onOpen,
  onClose,
  menuCls,
  contentClass,
  subContentClass
}: {
  label: string
  testId: string
  items: MenuEntry[]
  open: boolean
  anyOpen: boolean
  onOpen: () => void
  onClose: () => void
  menuCls: ReturnType<typeof useMenuUI>
  contentClass: string
  subContentClass: string
}) {
  const triggerRef = useRef<HTMLButtonElement>(null)
  const [pos, setPos] = useState({ left: 0, top: 0 })

  useLayoutEffect(() => {
    if (!open || !IS_BROWSER) return
    const trigger = triggerRef.current
    if (!trigger) return
    const rect = trigger.getBoundingClientRect()
    setPos({ left: rect.left, top: rect.bottom + 4 })
  }, [open])

  const content =
    open && IS_BROWSER
      ? createPortal(
          <div
            data-slot="app-menubar"
            className={`scrollbar-micro fixed z-50 overflow-y-auto overflow-x-hidden ${contentClass}`}
            style={{
              left: pos.left,
              top: pos.top,
              maxHeight: Math.max(120, window.innerHeight - pos.top - MENU_VIEWPORT_PAD)
            }}
            role="menu"
          >
            {items.map((item, index) => (
              <AppMenuEntryView
                key={index}
                item={item}
                menuCls={menuCls}
                subContentClass={subContentClass}
                onRun={onClose}
              />
            ))}
          </div>,
          document.body
        )
      : null

  return (
    <div>
      <button
        ref={triggerRef}
        type="button"
        data-test-id={testId}
        data-state={open ? 'open' : undefined}
        className="flex cursor-pointer items-center rounded px-2 py-1 text-[11px] text-surface/80 transition-colors select-none hover:bg-hover hover:text-surface data-[state=open]:bg-hover data-[state=open]:text-surface"
        onClick={() => {
          if (open) onClose()
          else onOpen()
        }}
        onPointerEnter={() => {
          if (anyOpen) onOpen()
        }}
      >
        {label}
      </button>
      {content}
    </div>
  )
}

function AppMenuEntryView({
  item,
  menuCls,
  subContentClass,
  onRun
}: {
  item: MenuEntry
  menuCls: ReturnType<typeof useMenuUI>
  subContentClass: string
  onRun: () => void
}) {
  if (isMenuSeparator(item)) return <div className={menuCls.separator} />
  if (!item.separator && hasMenuSubItems(item)) {
    return (
      <AppMenuSubmenu
        item={item}
        menuCls={menuCls}
        subContentClass={subContentClass}
        onRun={onRun}
      />
    )
  }
  return <AppMenuItem item={item} className={menuCls.item} onRun={onRun} />
}

function AppMenuItem({
  item,
  className,
  onRun
}: {
  item: MenuEntry
  className: string
  onRun: () => void
}) {
  if (!isMenuAction(item)) return null
  const disabled = menuDisabled(item)
  const checkbox = isMenuCheckbox(item)
  const checked = Boolean(menuChecked(item))
  const shortcut = menuShortcut(item)

  return (
    <button
      type="button"
      role={checkbox ? 'menuitemcheckbox' : 'menuitem'}
      aria-checked={checkbox ? checked : undefined}
      className={className}
      disabled={disabled}
      data-disabled={disabled ? '' : undefined}
      onClick={() => {
        if (disabled) return
        if (checkbox) updateMenuChecked(item, !checked)
        else runMenuAction(item)
        onRun()
      }}
    >
      <span className="min-w-0 flex-1 truncate">{menuLabel(item)}</span>
      {checkbox && checked ? <Check className="size-3.5 shrink-0 text-surface" /> : null}
      {!checkbox && shortcut ? (
        <AppShortcutText ui={{ base: 'ml-auto shrink-0' }}>{shortcut}</AppShortcutText>
      ) : null}
    </button>
  )
}

function AppMenuSubmenu({
  item,
  menuCls,
  subContentClass,
  onRun
}: {
  item: MenuActionNode
  menuCls: ReturnType<typeof useMenuUI>
  subContentClass: string
  onRun: () => void
}) {
  const triggerRef = useRef<HTMLButtonElement>(null)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState({ left: 0, top: 0 })
  const disabled = menuDisabled(item)

  function cancelClose() {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current)
      closeTimer.current = null
    }
  }

  function openSubmenu() {
    if (disabled) return
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
    const maxLeft = window.innerWidth - 180 - MENU_VIEWPORT_PAD
    setPos({
      left: left > maxLeft ? Math.max(MENU_VIEWPORT_PAD, rect.left - 180 - 4) : left,
      top: Math.min(rect.top, window.innerHeight - MENU_VIEWPORT_PAD - 40)
    })
  }, [open])

  const submenu =
    open && IS_BROWSER
      ? createPortal(
          <div
            data-slot="app-menubar"
            className={`scrollbar-micro fixed z-[60] overflow-y-auto ${subContentClass}`}
            style={{
              left: pos.left,
              top: pos.top,
              maxHeight: Math.max(120, window.innerHeight - pos.top - MENU_VIEWPORT_PAD)
            }}
            onMouseEnter={openSubmenu}
            onMouseLeave={scheduleClose}
          >
            {menuSubItems(item).map((sub, index) => (
              <AppMenuEntryView
                key={index}
                item={sub}
                menuCls={menuCls}
                subContentClass={subContentClass}
                onRun={onRun}
              />
            ))}
          </div>,
          document.body
        )
      : null

  return (
    <div className="relative w-full" onMouseEnter={openSubmenu} onMouseLeave={scheduleClose}>
      <button
        ref={triggerRef}
        type="button"
        className={menuCls.item}
        disabled={disabled}
        data-disabled={disabled ? '' : undefined}
        onClick={() => {
          if (disabled) return
          cancelClose()
          setOpen((value) => !value)
        }}
      >
        <span className="min-w-0 flex-1 truncate">{menuLabel(item)}</span>
        <ChevronRight className="size-3 shrink-0 text-muted" />
      </button>
      {submenu}
    </div>
  )
}
