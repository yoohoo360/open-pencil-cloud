import { useEffect, useRef } from 'react'
import * as Menubar from '@radix-ui/react-menubar'
import { ChevronRight, Check, Sidebar } from 'lucide-react'

import { vTestId, useI18n } from '@open-pencil/react'
import type { MenuEntry } from '@open-pencil/react'
import { AppShortcutText } from '@/components/ui/AppShortcutText'
import { useMenuUI } from '@/components/ui/menu'
import { IS_TAURI } from '@/constants'
import { useAppMenu } from '@/app/shell/menu/app-menu'
import { useDocumentNameRename } from '@/app/shell/menu/document-name'
import { appMenuShortcutLabel } from '@/app/shell/menu/shortcut'
import { hasMenuSubItems, isMenuCheckbox, isMenuSeparator, menuChecked, menuDisabled, menuLabel, menuShortcut, menuSubItems, runMenuAction, updateMenuChecked } from '@/app/shell/menu/entry'
import { useEditorStore } from '@/app/editor/active-store'
import { Tip } from '@/components/ui/Tip'

function MenuItems({ items, cls }: { items: MenuEntry[]; cls: ReturnType<typeof useMenuUI> }) {
  return (
    <>
      {items.map((item, i) => {
        if (isMenuSeparator(item)) {
          return <Menubar.Separator key={i} className={cls.separator} />
        }
        if (hasMenuSubItems(item)) {
          return (
            <Menubar.Sub key={i}>
              <Menubar.SubTrigger className={cls.item}>
                <span className="flex-1">{menuLabel(item)}</span>
                <ChevronRight className="size-3 text-muted" />
              </Menubar.SubTrigger>
              <Menubar.Portal>
                <Menubar.SubContent sideOffset={4} className={useMenuUI({ content: 'min-w-44' }).content}>
                  <MenuItems items={menuSubItems(item)} cls={cls} />
                </Menubar.SubContent>
              </Menubar.Portal>
            </Menubar.Sub>
          )
        }
        if (isMenuCheckbox(item)) {
          return (
            <Menubar.CheckboxItem
              key={i}
              className={cls.item}
              checked={menuChecked(item)}
              onCheckedChange={(checked) => updateMenuChecked(item, checked)}
            >
              <span className="flex-1">{menuLabel(item)}</span>
              <Menubar.ItemIndicator className="text-surface">
                <Check className="size-3.5" />
              </Menubar.ItemIndicator>
            </Menubar.CheckboxItem>
          )
        }
        return (
          <Menubar.Item
            key={i}
            className={cls.item}
            disabled={menuDisabled(item)}
            onSelect={() => runMenuAction(item)}
          >
            <span className="flex-1">{menuLabel(item)}</span>
            {menuShortcut(item) && <AppShortcutText>{menuShortcut(item)}</AppShortcutText>}
          </Menubar.Item>
        )
      })}
    </>
  )
}

export function AppMenu() {
  const store = useEditorStore()
  const { rename, editingName, startRename, commitRename } = useDocumentNameRename(store)
  const nameInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editingName && nameInputRef.current) {
      void rename.focusInput(nameInputRef.current)
    }
  }, [editingName, rename])

  const { menu: t } = useI18n()
  const { topMenus } = useAppMenu()
  const menuCls = useMenuUI()
  const mainMenuCls = useMenuUI({ content: 'min-w-52' })

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
            data-test-id="app-toggle-ui"
            className="flex size-6 shrink-0 cursor-pointer items-center justify-center rounded text-muted transition-colors hover:bg-hover hover:text-surface"
            onClick={() => { store.state.showUI = !store.state.showUI }}
          >
            <Sidebar className="size-3.5" />
          </button>
        </Tip>
      </div>
      {!IS_TAURI && (
        <div className="flex items-center px-1 pb-1">
          <Menubar.Root className="scrollbar-none flex items-center gap-0.5 overflow-x-auto">
            {topMenus.map((menu) => (
              <Menubar.Menu key={menu.label}>
                <Menubar.Trigger
                  {...vTestId(`menubar-${menu.label.toLowerCase()}`)}
                  className="flex cursor-pointer items-center rounded px-2 py-1 text-xs text-muted transition-colors select-none hover:bg-hover hover:text-surface data-[state=open]:bg-hover data-[state=open]:text-surface"
                >
                  {menu.label}
                </Menubar.Trigger>
                <Menubar.Portal>
                  <Menubar.Content sideOffset={4} align="start" className={mainMenuCls.content}>
                    <MenuItems items={menu.items} cls={menuCls} />
                  </Menubar.Content>
                </Menubar.Portal>
              </Menubar.Menu>
            ))}
          </Menubar.Root>
        </div>
      )}
    </div>
  )
}
