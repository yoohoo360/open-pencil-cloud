import { useState, useCallback } from 'react'
import { useStore } from '@nanostores/react'
import { atom } from 'nanostores'

import { getShareUrl } from '@/constants'
import { useCollabInjected } from '@/app/collab/context'
import { DEFAULT_COLLAB_STATE } from '@/app/collab/use'
import type { RemotePeer } from '@/app/collab/use'

import { CollabAvatarStack } from './CollabAvatarStack'
import { CollabSharePopover } from './CollabSharePopover'
import { CollabPanelProvider } from './context'

// Stable fallback atoms for when collab is not active
const $fallbackState = atom(DEFAULT_COLLAB_STATE)
const $fallbackPeers = atom<RemotePeer[]>([])
const $fallbackFollowing = atom<number | null>(null)

export default function CollabPanel() {
  const collab = useCollabInjected()

  const state = useStore(collab?.$state ?? $fallbackState)
  const peers = useStore(collab?.$remotePeers ?? $fallbackPeers)
  const followingPeer = useStore(collab?.$followingPeer ?? $fallbackFollowing)

  const [copied, setCopied] = useState(false)
  const [nameDraft, setNameDraft] = useState('')
  const [joinInput, setJoinInput] = useState('')
  const [popoverOpen, setPopoverOpen] = useState(false)

  const shareUrl = state?.roomId ? getShareUrl(state.roomId) : ''
  const isJoining = !state?.connected && !!joinInput.trim()

  const copyLink = useCallback(() => {
    if (!shareUrl) return
    void navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
      return undefined
    })
  }, [shareUrl])

  const share = useCallback(() => {
    if (!collab) return
    const roomId = collab.shareCurrentDoc()
    collab.setLocalName(nameDraft)
    setPopoverOpen(true)
    return roomId
  }, [collab, nameDraft])

  const join = useCallback(() => {
    if (!collab) return
    const url = joinInput.trim()
    const roomId = url.includes('/') ? url.split('/').pop() ?? url : url
    collab.setLocalName(nameDraft)
    collab.connect(roomId)
    setJoinInput('')
    setPopoverOpen(false)
  }, [collab, joinInput, nameDraft])

  const disconnect = useCallback(() => {
    if (!collab) return
    collab.disconnect()
    setPopoverOpen(false)
  }, [collab])

  const toggleFollowPeer = useCallback((clientId: number) => {
    if (!collab) return
    collab.followPeer(clientId)
  }, [collab])

  if (!collab || !state) return <div className="flex items-center" />

  return (
    <CollabPanelProvider
      value={{
        copied,
        nameDraft,
        setNameDraft,
        joinInput,
        setJoinInput,
        popoverOpen,
        setPopoverOpen,
        state,
        peers: peers ?? [],
        followingPeer: followingPeer ?? null,
        shareUrl,
        isJoining,
        copyLink,
        share,
        joinRoom: join,
        disconnect,
        toggleFollowPeer
      }}
    >
      <div className="flex w-full items-center justify-end gap-2">
        <CollabAvatarStack />
        <div className="flex-1" />
        <CollabSharePopover />
      </div>
    </CollabPanelProvider>
  )
}
