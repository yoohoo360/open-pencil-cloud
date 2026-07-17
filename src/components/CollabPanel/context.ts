import { createContext, useContext } from 'react'

import type { CollabState, RemotePeer } from '@/app/collab/use'

export type CollabPanelContext = {
  copied: boolean
  joinInput: string
  setJoinInput: (value: string) => void
  nameDraft: string
  setNameDraft: (value: string) => void
  popoverOpen: boolean
  setPopoverOpen: (value: boolean) => void
  state: CollabState
  peers: RemotePeer[]
  followingPeer: number | null
  shareUrl: string
  isJoining: boolean
  copyLink: () => void
  share: () => void
  join: () => void
  disconnect: () => void
  toggleFollowPeer: (clientId: number) => void
}

const CollabPanelReactContext = createContext<CollabPanelContext | null>(null)

export const CollabPanelProvider = CollabPanelReactContext.Provider

export function useCollabPanelContext(): CollabPanelContext {
  const ctx = useContext(CollabPanelReactContext)
  if (!ctx) throw new Error('Collab panel controls must be used within CollabPanel')
  return ctx
}
