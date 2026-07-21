import IconLucideCheck from '~icons/lucide/check'
import IconLucideChevronRight from '~icons/lucide/chevron-right'
import IconLucideSidebar from '~icons/lucide/sidebar'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { memo, useEffect, useRef } from 'react'

import type { MenuEntry } from '@open-pencil/react'
import { useI18n } from '@open-pencil/react'
import { useAppMenu } from '@/app/shell/menu/app-menu'
import { useDocumentNameRename } from '@/app/shell/menu/document-name'
import {
  hasMenuSubItems,
  isMenuCheckbox,
  isMenuSeparator,
  menuChecked,
  menuDisabled,
  menuLabel,
  menuShortcut,
  menuSubItems,
  runMenuAction,
  updateMenuChecked
} from '@/app/shell/menu/entry'
import { appMenuShortcutLabel } from '@/app/shell/menu/shortcut'
import { useEditorStore } from '@/app/editor/active-store'
import AppShortcutText from '@/components/ui/AppShortcutText'
import Tip from '@/components/ui/Tip'
import { useMenuUI } from '@/components/ui/menu'
import { IS_TAURI } from '@/constants'

const MenuItems = memo(function MenuItems({
  items,
  menuCls,
  subMenuCls
}: {
  items: MenuEntry[]
  menuCls: ReturnType<typeof useMenuUI>
  subMenuCls: ReturnType<typeof useMenuUI>
}) {
  return (
    <>
      {items.map((item, index) => {
        if (isMenuSeparator(item)) {
          return <DropdownMenu.Separator key={`sep-${index}`} className={menuCls.separator} />
        }

        if (hasMenuSubItems(item)) {
          return (
            <DropdownMenu.Sub key={menuLabel(item)}>
              <DropdownMenu.SubTrigger className={menuCls.item}>
                <span className="flex-1">{menuLabel(item)}</span>
                <IconLucideChevronRight className="size-3 text-muted" />
              </DropdownMenu.SubTrigger>
              <DropdownMenu.Portal>
                <DropdownMenu.SubContent sideOffset={4} className={subMenuCls.content}>
                  <MenuItems items={menuSubItems(item)} menuCls={menuCls} subMenuCls={subMenuCls} />
                </DropdownMenu.SubContent>
              </DropdownMenu.Portal>
            </DropdownMenu.Sub>
          )
        }

        if (isMenuCheckbox(item)) {
          return (
            <DropdownMenu.CheckboxItem
              key={menuLabel(item)}
              checked={menuChecked(item)}
              className={menuCls.item}
              onCheckedChange={(checked) => updateMenuChecked(item, checked === true)}
            >
              <span className="flex-1">{menuLabel(item)}</span>
              <DropdownMenu.ItemIndicator className="text-surface">
                <IconLucideCheck className="size-3.5" />
              </DropdownMenu.ItemIndicator>
            </DropdownMenu.CheckboxItem>
          )
        }

        const shortcut = menuShortcut(item)
        return (
          <DropdownMenu.Item
            key={menuLabel(item)}
            className={menuCls.item}
            disabled={menuDisabled(item)}
            onSelect={() => runMenuAction(item)}
          >
            <span className="flex-1">{menuLabel(item)}</span>
            {shortcut ? <AppShortcutText>{shortcut}</AppShortcutText> : null}
          </DropdownMenu.Item>
        )
      })}
    </>
  )
})

MenuItems.displayName = 'MenuItems'

export const AppMenu = memo(function AppMenu() {
  const store = useEditorStore()
  const { rename, editingName, startRename, commitRename } = useDocumentNameRename(store)
  const nameInputRef = useRef<HTMLInputElement>(null)
  const { menu: t } = useI18n()
  const { topMenus } = useAppMenu()
  const menuCls = useMenuUI()
  const mainMenuCls = useMenuUI({ content: 'min-w-52' })
  const subMenuCls = useMenuUI({ content: 'min-w-44' })

  useEffect(() => {
    const input = nameInputRef.current
    if (input) void rename.focusInput(input)
  }, [editingName, rename])

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
            onBlur={commitRename}
            onKeyDown={rename.onKeydown}
          />
        ) : (
          <span
            data-test-id="app-document-name"
            className="min-w-0 flex-1 cursor-default truncate rounded px-1 py-0.5 text-xs text-surface hover:bg-hover"
            onDoubleClick={startRename}
          >
            {store.state.documentName}
          </span>
        )}
        <Tip label={`${t.toggleUI} (${appMenuShortcutLabel('toggle-ui')})`}>
          <button
            type="button"
            data-test-id="app-toggle-ui"
            aria-label={t.toggleUI}
            className="flex size-6 shrink-0 cursor-pointer items-center justify-center rounded text-muted transition-colors hover:bg-hover hover:text-surface"
            onClick={() => {
              store.state.showUI = !store.state.showUI
            }}
          >
            <IconLucideSidebar className="size-3.5" />
          </button>
        </Tip>
      </div>
      {!IS_TAURI ? (
        <div className="flex items-center px-1 pb-1">
          <div className="scrollbar-none flex items-center gap-0.5 overflow-x-auto">
            {topMenus.map((menuGroup) => (
              <DropdownMenu.Root key={menuGroup.label}>
                <DropdownMenu.Trigger
                  data-test-id={`menubar-${menuGroup.label.toLowerCase()}`}
                  className="flex cursor-pointer items-center rounded px-2 py-1 text-[11px] text-surface/80 transition-colors select-none hover:bg-hover hover:text-surface data-[state=open]:bg-hover data-[state=open]:text-surface"
                >
                  {menuGroup.label}
                </DropdownMenu.Trigger>
                <DropdownMenu.Portal>
                  <DropdownMenu.Content sideOffset={4} align="start" className={mainMenuCls.content}>
                    <MenuItems items={menuGroup.items} menuCls={menuCls} subMenuCls={subMenuCls} />
                  </DropdownMenu.Content>
                </DropdownMenu.Portal>
              </DropdownMenu.Root>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
})

AppMenu.displayName = 'AppMenu'
export default AppMenu
