import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import * as Popover from '@radix-ui/react-popover'
import {
  FilePlus,
  FolderOpen,
  ImageDown,
  Menu,
  Redo2,
  Save,
  Share2,
  Undo2,
  ZoomIn
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { DEFAULT_COLLAB_STATE, type CollabReturn } from '@/composables/use-collab'
import { openFileDialog } from '@/composables/use-menu'
import { EditorBridge } from '@/react_app/shell/EditorBridge'
import { toolIcons } from '@/react_app/toolbar/toolIcons'
import { menu, menuContent } from '@/react_app/ui/menu'
import { Tip, TipProvider } from '@/react_app/ui/Tip'
import { initials } from '@/utils/text'
import { toast } from '@/utils/toast'
import { colorToCSS } from '@open-pencil/core'
import { useEditor, useEditorCommands, useEditorVersion, useI18n } from '@open-pencil/react'

import type { Editor } from '@open-pencil/core/editor'

type AppEditor = Editor & {
  state: Editor['state'] & {
    actionToast: string | null
  }
  saveFigFile: () => Promise<void>
  exportSelection: (scale: number, format: string) => Promise<void>
}

function MobileHudInner({ collab }: { collab: CollabReturn | null }) {
  const store = useEditor() as AppEditor
  useEditorVersion()
  const navigate = useNavigate()
  const { dialogs } = useI18n()
  const { getCommand } = useEditorCommands()
  const [, bump] = useState(0)

  useEffect(() => {
    if (!collab) return
    const id = window.setInterval(() => bump((n) => n + 1), 500)
    return () => clearInterval(id)
  }, [collab])

  const collabState = collab?.state.value ?? DEFAULT_COLLAB_STATE
  const collabPeers = collab?.remotePeers.value ?? []
  const followingPeer = collab?.followingPeer.value ?? null
  const ActiveIcon = toolIcons[store.state.activeTool]
  const onlineCount = collabPeers.length + 1

  function onShare() {
    if (!collab) return
    const roomId = collab.shareCurrentDoc()
    void navigate(`/share/${roomId}`)
    void navigator.clipboard.writeText(`${window.location.origin}/share/${roomId}`)
    toast.show('Link copied to clipboard')
  }

  function onDisconnect() {
    if (!collab) return
    collab.disconnect()
    void navigate('/')
  }

  const menuItems = [
    {
      icon: FilePlus,
      label: 'New',
      action: () => void import('@/stores/tabs').then((m) => m.createTab())
    },
    { icon: FolderOpen, label: 'Open…', action: () => openFileDialog() },
    { icon: Save, label: 'Save', action: () => void store.saveFigFile() },
    {
      icon: ImageDown,
      label: 'Export…',
      action: () => void store.exportSelection(1, 'png')
    },
    { icon: ZoomIn, label: 'Zoom to fit', action: () => getCommand('view.zoomFit').run() }
  ]

  const dropdownContent = menuContent({ class: 'w-48 rounded-xl p-1.5 shadow-xl' })
  const dropdownItem = menu({ justify: 'start' }).item({
    class: 'w-full gap-2.5 rounded-lg border-none bg-transparent px-2.5 py-2'
  })

  return (
    <TipProvider>
      <div
        className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start px-3 pt-3"
        onTouchStart={(e) => e.stopPropagation()}
      >
        <div className="pointer-events-auto flex flex-col items-start gap-1.5">
          <div className="flex gap-1.5">
            <Tip label="Undo">
              <button
                type="button"
                className="flex size-8 cursor-pointer items-center justify-center rounded-full border border-white/10 bg-panel/70 shadow-md backdrop-blur-xl select-none active:bg-hover"
                onClick={() => getCommand('edit.undo').run()}
              >
                <Undo2 className="size-3.5 text-surface" />
              </button>
            </Tip>
            <Tip label="Redo">
              <button
                type="button"
                className="flex size-8 cursor-pointer items-center justify-center rounded-full border border-white/10 bg-panel/70 shadow-md backdrop-blur-xl select-none active:bg-hover"
                onClick={() => getCommand('edit.redo').run()}
              >
                <Redo2 className="size-3.5 text-surface" />
              </button>
            </Tip>
          </div>
          <div className="flex size-8 items-center justify-center rounded-full border border-accent/20 bg-panel/70 shadow-md backdrop-blur-xl transition-colors duration-200">
            <ActiveIcon key={store.state.activeTool} className="size-3.5 text-accent" />
          </div>
        </div>

        <div className="pointer-events-auto relative mx-auto flex flex-col items-center gap-1.5">
          {collabState.connected ? (
            <Popover.Root>
              <Popover.Trigger asChild>
                <button
                  type="button"
                  className="flex h-8 cursor-pointer items-center gap-1.5 rounded-full border border-white/10 bg-panel/70 px-3 shadow-md backdrop-blur-xl select-none active:bg-hover"
                >
                  <span className="size-2 rounded-full bg-green-500" />
                  <span className="text-xs text-surface">Online: {onlineCount}</span>
                </button>
              </Popover.Trigger>
              <Popover.Portal>
                <Popover.Content
                  sideOffset={8}
                  side="bottom"
                  align="center"
                  className="z-50 w-56 rounded-xl border border-border bg-panel p-3 shadow-xl"
                >
                  <div className="mb-2 text-[11px] tracking-wider text-muted uppercase">
                    In this room
                  </div>
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <div
                        className="flex size-7 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold text-white"
                        style={{ background: colorToCSS(collabState.localColor) }}
                      >
                        {initials(collabState.localName || 'You')}
                      </div>
                      <span className="min-w-0 flex-1 truncate text-xs text-surface">
                        {collabState.localName || 'You'}
                      </span>
                      <span className="text-[10px] text-muted">you</span>
                    </div>
                    {collabPeers.map((peer) => (
                      <div
                        key={peer.clientId}
                        className="flex cursor-pointer items-center gap-2 rounded-md px-0.5 py-0.5 select-none active:bg-hover"
                        onClick={() =>
                          collab?.followPeer(followingPeer === peer.clientId ? null : peer.clientId)
                        }
                      >
                        <div
                          className={`flex size-7 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold text-white ${
                            followingPeer === peer.clientId ? 'ring-2 ring-white/40' : ''
                          }`}
                          style={{ background: colorToCSS(peer.color) }}
                        >
                          {initials(peer.name)}
                        </div>
                        <span className="min-w-0 flex-1 truncate text-xs text-surface">
                          {peer.name}
                        </span>
                        {followingPeer === peer.clientId ? (
                          <span className="text-[10px] text-accent">following</span>
                        ) : null}
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    className="mt-3 flex h-7 w-full cursor-pointer items-center justify-center rounded border border-border bg-transparent text-xs text-muted select-none active:bg-hover"
                    onClick={onDisconnect}
                  >
                    Disconnect
                  </button>
                </Popover.Content>
              </Popover.Portal>
            </Popover.Root>
          ) : null}

          {store.state.actionToast ? (
            <div
              key={store.state.actionToast}
              className="flex h-8 items-center rounded-full border border-accent/20 bg-panel/70 px-3 shadow-md backdrop-blur-xl"
            >
              <span className="text-xs whitespace-nowrap text-accent">
                {store.state.actionToast}
              </span>
            </div>
          ) : null}
        </div>

        <div className="pointer-events-auto flex items-center gap-1.5">
          <button
            type="button"
            className="flex h-8 cursor-pointer items-center gap-1.5 rounded-full border border-white/10 bg-panel/70 px-3 shadow-md backdrop-blur-xl select-none active:bg-hover"
            onClick={onShare}
          >
            <Share2 className="size-3.5 text-surface" />
            <span className="text-xs text-surface">{dialogs.share}</span>
          </button>

          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button
                type="button"
                className="flex size-8 cursor-pointer items-center justify-center rounded-full border border-white/10 bg-panel/70 shadow-md backdrop-blur-xl select-none active:bg-hover"
              >
                <Menu className="size-3.5 text-surface" />
              </button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content
                sideOffset={8}
                side="bottom"
                align="end"
                className={dropdownContent}
              >
                {menuItems.map((item) => (
                  <DropdownMenu.Item
                    key={item.label}
                    className={dropdownItem}
                    onSelect={item.action}
                  >
                    <item.icon className="size-4 text-muted" />
                    <span>{item.label}</span>
                  </DropdownMenu.Item>
                ))}
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        </div>
      </div>
    </TipProvider>
  )
}

export function MobileHud({ editor, collab }: { editor: Editor; collab: CollabReturn | null }) {
  return (
    <EditorBridge editor={editor}>
      <MobileHudInner collab={collab} />
    </EditorBridge>
  )
}
