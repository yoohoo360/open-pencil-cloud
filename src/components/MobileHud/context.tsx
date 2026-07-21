import { useMemo, useCallback, createContext, useContext, type ReactNode, type ComponentType } from 'react'
import { useNavigate } from 'react-router'
import IconFilePlus from '~icons/lucide/file-plus'
import IconFolderOpen from '~icons/lucide/folder-open'
import IconImageDown from '~icons/lucide/image-down'
import IconSave from '~icons/lucide/save'
import IconZoomIn from '~icons/lucide/zoom-in'

import { useEditorCommands, useI18n } from '@open-pencil/react'
import { useClipboard } from '#react/shared/dom/hooks'

import { DEFAULT_COLLAB_STATE, useCollabInjected } from '@/app/collab/use'
import { useEditorStore } from '@/app/editor/active-store'
import { toolIcons } from '@/app/editor/icons'
import { openFileDialog } from '@/app/shell/menu/use'
import { toast } from '@/app/shell/ui'
import type { ToolbarActionItem } from '@/components/Toolbar/types'
import { getShareUrl } from '@/constants'
import { useVueRefValue } from '@/shared/useVueRefValue'

type MenuAction = ToolbarActionItem

function useMobileHudState() {
  const navigate = useNavigate()
  const collab = useCollabInjected()
  const store = useEditorStore()
  const { copy } = useClipboard()
  const { dialogs } = useI18n()
  const { getCommand } = useEditorCommands()

  const collabState = useVueRefValue(collab?.state ?? { value: DEFAULT_COLLAB_STATE })
  const collabPeers = useVueRefValue(collab?.remotePeers ?? { value: [] })
  const followingPeer = useVueRefValue(collab?.followingPeer ?? { value: null })
  const activeTool = useVueRefValue({ get value() { return store.state.activeTool } })
  const actionToast = useVueRefValue({ get value() { return store.state.actionToast } })

  const onlineCount = collabPeers.length + 1
  const activeToolIcon = toolIcons[activeTool] as ComponentType

  const menuItems: MenuAction[] = useMemo(
    () => [
      {
        icon: IconFilePlus,
        label: 'New',
        action: () => void import('@/app/tabs').then((m) => m.createTab())
      },
      { icon: IconFolderOpen, label: 'Open…', action: () => void openFileDialog() },
      { icon: IconSave, label: 'Save', action: () => void store.saveFigFile() },
      { icon: IconImageDown, label: 'Export…', action: () => void store.exportSelection(1, 'png') },
      { icon: IconZoomIn, label: 'Zoom to fit', action: () => getCommand('view.zoomFit').run() }
    ],
    [getCommand, store]
  )

  const undo = useCallback(() => {
    getCommand('edit.undo').run()
  }, [getCommand])

  const redo = useCallback(() => {
    getCommand('edit.redo').run()
  }, [getCommand])

  const share = useCallback(() => {
    if (!collab) return
    const roomId = collab.shareCurrentDoc()
    void navigate(`/share/${roomId}`)
    void copy(getShareUrl(roomId))
    toast.info('Link copied to clipboard')
  }, [collab, copy, navigate])

  const disconnect = useCallback(() => {
    if (!collab) return
    collab.disconnect()
    void navigate('/')
  }, [collab, navigate])

  const toggleFollowPeer = useCallback(
    (clientId: number) => {
      collab?.followPeer(followingPeer === clientId ? null : clientId)
    },
    [collab, followingPeer]
  )

  return useMemo(
    () => ({
      store,
      dialogs,
      collabState,
      collabPeers,
      followingPeer,
      onlineCount,
      activeToolIcon,
      actionToast,
      menuItems,
      undo,
      redo,
      share,
      disconnect,
      toggleFollowPeer
    }),
    [
      actionToast,
      activeToolIcon,
      collabPeers,
      collabState,
      dialogs,
      disconnect,
      followingPeer,
      menuItems,
      onlineCount,
      redo,
      share,
      store,
      toggleFollowPeer,
      undo
    ]
  )
}

export type MobileHudContext = ReturnType<typeof useMobileHudState>

const MobileHudContext = createContext<MobileHudContext | null>(null)
MobileHudContext.displayName = 'MobileHud'

export function MobileHudProvider({ children }: { children: ReactNode }) {
  const value = useMobileHudState()
  return <MobileHudContext.Provider value={value}>{children}</MobileHudContext.Provider>
}

export function useMobileHudContext(): MobileHudContext {
  const ctx = useContext(MobileHudContext)
  if (!ctx) throw new Error('Mobile HUD controls must be used within MobileHud')
  return ctx
}
