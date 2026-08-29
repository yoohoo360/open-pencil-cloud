import { createContext, useContext, useState, type ReactNode } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { useI18n } from '#react/i18n'
import { DEFAULT_COLLAB_STATE, type CollabState, type RemotePeer } from '#react/app/collab/types'
import { getShareURL } from '#react/constants'

export function useCollabPanelState() {
  const params = useParams()
  const navigate = useNavigate()
  const { dialogs } = useI18n()
  const [joinInput, setJoinInput] = useState('')
  const [nameDraft, setNameDraft] = useState(DEFAULT_COLLAB_STATE.localName)
  const [popoverOpen, setPopoverOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [state] = useState<CollabState>(DEFAULT_COLLAB_STATE)
  const peers: RemotePeer[] = state.peers
  const followingPeer: number | null = null
  const pendingRoomId = typeof params.roomId === 'string' ? params.roomId : null
  const shareURL = state.roomId ? getShareURL(state.roomId) : ''
  const isJoining = !!pendingRoomId && !state.connected

  function copyLink() {
    if (!shareURL) return
    void navigator.clipboard.writeText(shareURL)
    setCopied(true)
  }

  return {
    dialogs,
    copied,
    joinInput,
    setJoinInput,
    nameDraft,
    setNameDraft,
    popoverOpen,
    setPopoverOpen,
    state,
    peers,
    followingPeer,
    shareURL,
    isJoining,
    copyLink,
    share() {
      setPopoverOpen(false)
    },
    join() {
      const roomId = pendingRoomId || joinInput.trim().replace(/.*\/share\//, '')
      if (!roomId) return
      void navigate(`/share/${roomId}`)
      setPopoverOpen(false)
    },
    disconnect() {
      setPopoverOpen(false)
      void navigate('/')
    },
    toggleFollowPeer(_clientId: number) {}
  }
}

export type CollabPanelContext = ReturnType<typeof useCollabPanelState>

const CollabPanelContextValue = createContext<CollabPanelContext | null>(null)

export function CollabPanelProvider({ children }: { children?: ReactNode }) {
  const ctx = useCollabPanelState()
  return <CollabPanelContextValue.Provider value={ctx}>{children}</CollabPanelContextValue.Provider>
}

export function useCollabPanelContext(): CollabPanelContext {
  const ctx = useContext(CollabPanelContextValue)
  if (!ctx) throw new Error('Collab panel controls must be used within CollabPanel')
  return ctx
}
