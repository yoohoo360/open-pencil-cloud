import { createContext, useContext } from 'react'

import type { ComponentType } from 'react'

import { DEFAULT_COLLAB_STATE, type CollabState, type RemotePeer } from '@/app/collab/use'
import type { CollabReturn } from '@/app/collab/context'
import type { EditorStore } from '@/app/editor/active-store'
import type { ToolbarActionItem } from '@/components/Toolbar/types'

export type MobileHudContext = {
  store: EditorStore
  collabState: CollabState
  collabPeers: RemotePeer[]
  followingPeer: number | null
  onlineCount: number
  activeToolIcon: ComponentType
  actionToast: string | null
  menuItems: ToolbarActionItem[]
  undo: () => void
  redo: () => void
  share: () => void
  disconnect: () => void
  toggleFollowPeer: (clientId: number) => void
}

const MobileHudReactContext = createContext<MobileHudContext | null>(null)

export const MobileHudProvider = MobileHudReactContext.Provider

export function useMobileHudContext(): MobileHudContext {
  const ctx = useContext(MobileHudReactContext)
  if (!ctx) throw new Error('Mobile HUD controls must be used within MobileHud')
  return ctx
}

export { DEFAULT_COLLAB_STATE }
export type { CollabReturn }
