import * as Menubar from '@radix-ui/react-menubar'
import { Check, ChevronRight, Sidebar } from 'lucide-react'
import { useRef, useState } from 'react'

import { openFileDialog } from '@/composables/use-menu'
import { IS_TAURI } from '@/constants'
import { EditorBridge } from '@/react_app/shell/EditorBridge'
import { menuContent, menuItem, menuSeparator } from '@/react_app/ui/menu'
import { Tip, TipProvider } from '@/react_app/ui/Tip'
import {
  useEditor,
  useEditorCommands,
  useEditorVersion,
  useI18n,
  useInlineRename,
  type MenuEntry
} from '@open-pencil/react'

import type { Editor } from '@open-pencil/core/editor'
import type { Locale } from '@open-pencil/react'

type AppEditor = Editor & {
  state: Editor['state'] & {
    documentName: string
    showUI: boolean
    autosaveEnabled: boolean
  }
  saveFigFile: () => Promise<void>
  saveFigFileAs: () => Promise<void>
  exportSelection: (scale: number, format: string) => Promise<void>
}

const DOCUMENT_NAME_ID = 'document-name'

function AppMenuInner() {
  const store = useEditor() as AppEditor
  useEditorVersion()
  const { menuItem: commandMenuItem } = useEditorCommands()
  const { menu: t, locale, availableLocales, localeLabels, setLocale } = useI18n()
  const isMac = navigator.platform.includes('Mac')
  const mod = isMac ? '⌘' : 'Ctrl+'

  const rename = useInlineRename((_id, name) => {
    store.state.documentName = name
  })
  const [pendingFocus, setPendingFocus] = useState(false)
  const inputRef = useRef<HTMLInputElement | null>(null)

  function startRename() {
    rename.start(DOCUMENT_NAME_ID, store.state.documentName)
    setPendingFocus(true)
  }

  function setNameInputRef(el: HTMLInputElement | null) {
    inputRef.current = el
    if (el && pendingFocus) {
      setPendingFocus(false)
      rename.focusInput(el)
    }
  }

  const languageMenu: MenuEntry[] = availableLocales.map((code: Locale) => ({
    label: localeLabels[code],
    checked: locale === code,
    onCheckedChange: (checked: boolean) => {
      if (checked) setLocale(code)
    }
  }))

  const topMenus = [
    {
      label: t.file,
      items: [
        {
          label: t.new,
          shortcut: `${mod}N`,
          action: () => {
            void import('@/stores/tabs').then((m) => m.createTab())
          }
        },
        { label: t.open, shortcut: `${mod}O`, action: () => void openFileDialog() },
        { separator: true as const },
        { label: t.save, shortcut: `${mod}S`, action: () => void store.saveFigFile() },
        {
          label: t.saveAs,
          shortcut: `${mod}⇧S`,
          action: () => void store.saveFigFileAs()
        },
        { separator: true as const },
        {
          label: t.exportSelection,
          shortcut: `${mod}⇧E`,
          sub: [
            { label: 'PNG', action: () => void store.exportSelection(1, 'png') },
            { label: 'SVG', action: () => void store.exportSelection(1, 'svg') },
            { label: '.fig', action: () => void store.exportSelection(1, 'fig') }
          ]
        },
        { separator: true as const },
        {
          label: t.autosave,
          checked: store.state.autosaveEnabled,
          onCheckedChange: (value: boolean) => {
            store.state.autosaveEnabled = value
          }
        }
      ] as MenuEntry[]
    },
    {
      label: t.edit,
      items: [
        commandMenuItem('edit.undo'),
        commandMenuItem('edit.redo'),
        { separator: true },
        commandMenuItem('selection.duplicate'),
        commandMenuItem('selection.delete'),
        { separator: true },
        commandMenuItem('selection.selectAll')
      ] as MenuEntry[]
    },
    {
      label: t.view,
      items: [
        commandMenuItem('view.zoom100'),
        commandMenuItem('view.zoomFit'),
        commandMenuItem('view.zoomSelection'),
        { separator: true },
        {
          label: t.language,
          sub: languageMenu
        }
      ] as MenuEntry[]
    },
    {
      label: t.object,
      items: [
        commandMenuItem('selection.group'),
        commandMenuItem('selection.ungroup'),
        { separator: true },
        commandMenuItem('selection.createComponent'),
        commandMenuItem('selection.detachInstance'),
        commandMenuItem('selection.goToMainComponent')
      ] as MenuEntry[]
    }
  ]

  const itemCls = menuItem()
  const sepCls = menuSeparator()
  const mainContent = menuContent({ class: 'min-w-52' })
  const subContent = menuContent({ class: 'min-w-44' })

  function renderItems(items: MenuEntry[]) {
    return items.map((item, i) => {
      if (item.separator) {
        return <Menubar.Separator key={i} className={sepCls} />
      }
      if (item.sub) {
        return (
          <Menubar.Sub key={i}>
            <Menubar.SubTrigger className={itemCls}>
              <span className="flex-1">{item.label}</span>
              <ChevronRight className="size-3 text-muted" />
            </Menubar.SubTrigger>
            <Menubar.Portal>
              <Menubar.SubContent sideOffset={4} className={subContent}>
                {renderItems(item.sub)}
              </Menubar.SubContent>
            </Menubar.Portal>
          </Menubar.Sub>
        )
      }
      if (item.onCheckedChange) {
        return (
          <Menubar.CheckboxItem
            key={i}
            className={itemCls}
            checked={!!item.checked}
            onCheckedChange={(v) => item.onCheckedChange?.(v === true)}
          >
            <span className="flex-1">{item.label}</span>
            <Menubar.ItemIndicator className="text-surface">
              <Check className="size-3.5" />
            </Menubar.ItemIndicator>
          </Menubar.CheckboxItem>
        )
      }
      return (
        <Menubar.Item
          key={i}
          className={itemCls}
          disabled={item.disabled}
          onSelect={() => item.action?.()}
        >
          <span className="flex-1">{item.label}</span>
          {item.shortcut ? <span className="text-[11px] text-muted">{item.shortcut}</span> : null}
        </Menubar.Item>
      )
    })
  }

  return (
    <TipProvider>
      <div className="shrink-0 border-b border-border">
        <div className="flex items-center gap-2 px-2 py-1.5">
          <img data-test-id="app-logo" src="/favicon-32.png" className="size-4" alt="OpenPencil" />
          {rename.editingId === DOCUMENT_NAME_ID ? (
            <input
              ref={setNameInputRef}
              data-test-id="app-document-name-input"
              className="min-w-0 flex-1 rounded border border-accent bg-input px-1 py-0.5 text-xs text-surface outline-none"
              defaultValue={store.state.documentName}
              onBlur={(e) => rename.commit(DOCUMENT_NAME_ID, e.currentTarget)}
              onKeyDown={(e) => {
                if (e.code === 'Enter') e.currentTarget.blur()
                rename.onKeydown(e.nativeEvent)
              }}
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
          <Tip label={`${t.toggleUI} (${mod}\\)`}>
            <button
              type="button"
              data-test-id="app-toggle-ui"
              className="flex size-6 shrink-0 cursor-pointer items-center justify-center rounded text-muted transition-colors hover:bg-hover hover:text-surface"
              onClick={() => {
                store.state.showUI = !store.state.showUI
              }}
            >
              <Sidebar className="size-3.5" />
            </button>
          </Tip>
        </div>
        {!IS_TAURI ? (
          <div className="flex items-center px-1 pb-1">
            <Menubar.Root className="scrollbar-none flex items-center gap-0.5 overflow-x-auto">
              {topMenus.map((menu) => (
                <Menubar.Menu key={menu.label}>
                  <Menubar.Trigger
                    data-test-id={`menubar-${menu.label.toLowerCase()}`}
                    className="flex cursor-pointer items-center rounded px-2 py-1 text-xs text-muted transition-colors select-none hover:bg-hover hover:text-surface data-[state=open]:bg-hover data-[state=open]:text-surface"
                  >
                    {menu.label}
                  </Menubar.Trigger>
                  <Menubar.Portal>
                    <Menubar.Content sideOffset={4} align="start" className={mainContent}>
                      {renderItems(menu.items)}
                    </Menubar.Content>
                  </Menubar.Portal>
                </Menubar.Menu>
              ))}
            </Menubar.Root>
          </div>
        ) : null}
      </div>
    </TipProvider>
  )
}

export function AppMenu({ editor }: { editor: Editor }) {
  return (
    <EditorBridge editor={editor}>
      <AppMenuInner />
    </EditorBridge>
  )
}
