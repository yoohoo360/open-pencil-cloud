import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from 'react'
import { useNavigate, useParams } from 'react-router'

import { useI18n } from '@open-pencil/react'
import { useClipboard } from '#react/shared/dom/hooks'

import { DEFAULT_COLLAB_STATE, useCollabInjected } from '@/app/collab/use'
import { toast } from '@/app/shell/ui'
import { getShareUrl } from '@/constants'
import { useVueRefValue } from '@/shared/useVueRefValue'

function useCollabPanelState() {
  const params = useParams()
  const navigate = useNavigate()
  const collab = useCollabInjected()
  const { copy } = useClipboard()
  const { dialogs } = useI18n()

  const [copied, setCopied] = useState(false)
  const [joinInput, setJoinInput] = useState('')
  const collabState = useVueRefValue(collab?.state ?? { value: DEFAULT_COLLAB_STATE })
  const peers = useVueRefValue(collab?.remotePeers ?? { value: [] })
  const followingPeer = useVueRefValue(collab?.followingPeer ?? { value: null })

  const [nameDraft, setNameDraft] = useState(collabState.localName ?? '')
  const pendingRoomId = typeof params.roomId === 'string' ? params.roomId : null
  const [popoverOpen, setPopoverOpen] = useState(!!pendingRoomId)

  const shareUrl = collabState.roomId ? getShareUrl(collabState.roomId) : ''
  const isJoining = !!pendingRoomId && !collabState.connected

  useEffect(() => {
    if (!collabState.connected) setPopoverOpen(!!pendingRoomId)
  }, [collabState.connected, pendingRoomId])

  const copyLink = useCallback(() => {
    if (!shareUrl) return
    void copy(shareUrl).then(() => {
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    })
    toast.info('Link copied to clipboard')
  }, [copy, shareUrl])

  const share = useCallback(() => {
    if (!collab || !nameDraft.trim()) return
    collab.setLocalName(nameDraft.trim())
    const roomId = collab.shareCurrentDoc()
    void navigate(`/share/${roomId}`)
    void copy(getShareUrl(roomId)).then(() => {
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    })
    toast.info('Link copied to clipboard')
    setPopoverOpen(false)
  }, [collab, copy, nameDraft, navigate])

  const join = useCallback(() => {
    if (!collab) return
    const roomId = pendingRoomId || joinInput.trim().replace(/.*\/share\//, '')
    if (!roomId || !nameDraft.trim()) return
    collab.setLocalName(nameDraft.trim())
    collab.connect(roomId)
    void navigate(`/share/${roomId}`)
    setPopoverOpen(false)
  }, [collab, joinInput, nameDraft, navigate, pendingRoomId])

  const disconnect = useCallback(() => {
    if (!collab) return
    collab.disconnect()
    setPopoverOpen(false)
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
      dialogs,
      copied,
      joinInput,
      setJoinInput,
      nameDraft,
      setNameDraft,
      popoverOpen,
      setPopoverOpen,
      state: collabState,
      peers,
      followingPeer,
      shareUrl,
      isJoining,
      copyLink,
      share,
      join,
      disconnect,
      toggleFollowPeer
    }),
    [
      collabState,
      copied,
      copyLink,
      dialogs,
      disconnect,
      followingPeer,
      isJoining,
      join,
      joinInput,
      nameDraft,
      peers,
      popoverOpen,
      share,
      shareUrl,
      toggleFollowPeer
    ]
  )
}

export type CollabPanelContext = ReturnType<typeof useCollabPanelState>

const CollabPanelContext = createContext<CollabPanelContext | null>(null)
CollabPanelContext.displayName = 'CollabPanel'

export function CollabPanelProvider({ children }: { children: ReactNode }) {
  const value = useCollabPanelState()
  return <CollabPanelContext.Provider value={value}>{children}</CollabPanelContext.Provider>
}

export function useCollabPanelContext(): CollabPanelContext {
  const ctx = useContext(CollabPanelContext)
  if (!ctx) throw new Error('Collab panel controls must be used within CollabPanel')
  return ctx
}
