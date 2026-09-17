import { createContext, useContext, type ReactNode } from 'react'
import { FileUp, ImageDown, Save, ZoomIn } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

import { useEditorCommands } from '#react/editor/commands'
import { useI18n } from '#react/i18n'
import { DEFAULT_COLLAB_STATE } from '#react/app/collab/types'
import { useEditorStore } from '#react/app/editor/store'
import { toolIcons } from '#react/app/editor/icons'
import { importFigDialog, saveFigFile, exportSelection } from '#react/app/shell/menu/files'
import type { ToolbarActionItem } from '#react/components/Toolbar/types'

function useMobileHudState() {
  const navigate = useNavigate()
  const store = useEditorStore()
  const { dialogs } = useI18n()
  const { getCommand } = useEditorCommands()
  const collabState = DEFAULT_COLLAB_STATE
  const collabPeers = collabState.peers
  const followingPeer: number | null = null
  const onlineCount = collabPeers.length + 1
  const activeToolIcon = toolIcons[store.state.activeTool]
  const actionToast = store.state.actionToast

  const menuItems: ToolbarActionItem[] = [
    { icon: FileUp, label: 'Import…', action: () => void importFigDialog(store) },
    { icon: Save, label: 'Save', action: () => void saveFigFile(store) },
    {
      icon: ImageDown,
      label: 'Export…',
      action: () => {
        if (store.state.selectedIds.size > 0) void exportSelection(store, 'png')
      }
    },
    { icon: ZoomIn, label: 'Zoom to fit', action: () => getCommand('view.zoomFit').run() }
  ]

  return {
    store,
    dialogs,
    collabState,
    collabPeers,
    followingPeer,
    onlineCount,
    activeToolIcon,
    actionToast,
    menuItems,
    undo: () => getCommand('edit.undo').run(),
    redo: () => getCommand('edit.redo').run(),
    share: () => {
      void navigate('/')
    },
    disconnect: () => {
      void navigate('/')
    },
    toggleFollowPeer: (_clientId: number) => {}
  }
}

export type MobileHudContext = ReturnType<typeof useMobileHudState>

const MobileHudContextValue = createContext<MobileHudContext | null>(null)

export function MobileHudProvider({ children }: { children?: ReactNode }) {
  const ctx = useMobileHudState()
  return <MobileHudContextValue.Provider value={ctx}>{children}</MobileHudContextValue.Provider>
}

export function useMobileHudContext(): MobileHudContext {
  const ctx = useContext(MobileHudContextValue)
  if (!ctx) throw new Error('Mobile HUD controls must be used within MobileHud')
  return ctx
}
