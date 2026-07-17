import { useState, useCallback } from 'react'
import { useStore } from '@nanostores/react'
import { atom } from 'nanostores'

import { useEditorEvent, useI18n, useEditorCommands } from '@open-pencil/react'
import { useEditorStore } from '@/app/editor/active-store'
import { toolIcons } from '@/app/editor/icons'
import { useCollabInjected } from '@/app/collab/context'
import { DEFAULT_COLLAB_STATE } from '@/app/collab/use'
import type { RemotePeer } from '@/app/collab/use'
import { createToolbarActions } from '@/components/Toolbar/actions'

import { MobileHudProvider } from './context'
import { MobileActionToast } from './MobileActionToast'
import { MobileActiveToolBadge } from './MobileActiveToolBadge'
import { MobileFileMenu } from './MobileFileMenu'
import { MobilePresencePopover } from './MobilePresencePopover'
import { MobileShareButton } from './MobileShareButton'
import { MobileUndoRedo } from './MobileUndoRedo'

// Stable fallback atoms for no-collab state
const $fallbackState = atom(DEFAULT_COLLAB_STATE)
const $fallbackPeers = atom<RemotePeer[]>([])
const $fallbackFollowing = atom<number | null>(null)

export default function MobileHud() {
  const store = useEditorStore()
  const collab = useCollabInjected()
  const { menu } = useI18n()
  const { getCommand } = useEditorCommands()

  const collabState = useStore(collab?.$state ?? $fallbackState)
  const collabPeers = useStore(collab?.$remotePeers ?? $fallbackPeers)
  const followingPeer = useStore(collab?.$followingPeer ?? $fallbackFollowing)

  const [activeTool, setActiveTool] = useState(() => store.state.activeTool)
  const [actionToast, setActionToast] = useState<string | null>(() => store.state.actionToast ?? null)

  useEditorEvent('tool:changed', () => setActiveTool(store.state.activeTool))
  useEditorEvent('render:requested', () => setActionToast(store.state.actionToast ?? null))

  const { editActions, arrangeActions } = createToolbarActions({ store, getCommand, menu })

  const undo = useCallback(() => store.undo(), [store])
  const redo = useCallback(() => store.redo(), [store])

  const share = useCallback(() => {
    if (!collab) return
    collab.shareCurrentDoc()
  }, [collab])

  const disconnect = useCallback(() => {
    collab?.disconnect()
  }, [collab])

  const toggleFollowPeer = useCallback((clientId: number) => {
    collab?.followPeer(clientId)
  }, [collab])

  const activeToolIcon = toolIcons[activeTool] ?? toolIcons.SELECT
  const onlineCount = collabPeers.length + 1

  return (
    <MobileHudProvider
      value={{
        store,
        collabState,
        collabPeers,
        followingPeer,
        onlineCount,
        activeToolIcon,
        actionToast,
        menuItems: [...editActions, ...arrangeActions],
        undo,
        redo,
        share,
        disconnect,
        toggleFollowPeer
      }}
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start px-3 pt-3"
        onTouchStart={(e) => e.stopPropagation()}
      >
        <div className="pointer-events-auto flex flex-col items-start gap-1.5">
          <MobileUndoRedo />
          <MobileActiveToolBadge />
        </div>

        <div className="pointer-events-auto relative mx-auto flex flex-col items-center gap-1.5">
          <MobilePresencePopover />
          <MobileActionToast />
        </div>

        <div className="pointer-events-auto flex items-center gap-1.5">
          <MobileShareButton />
          <MobileFileMenu />
        </div>
      </div>
    </MobileHudProvider>
  )
}
