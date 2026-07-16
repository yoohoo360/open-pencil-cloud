import * as Popover from '@radix-ui/react-popover'
import { Check, Copy, Share2, Users } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { colorToCSS } from '@open-pencil/core'
import { useI18n } from '@open-pencil/react'

import { usePopoverUI } from '@/react_app/ui/popover'
import { Tip, TipProvider } from '@/react_app/ui/Tip'
import { toast } from '@/utils/toast'
import { initials } from '@/utils/text'

import type { CollabReturn, CollabState, RemotePeer } from '@/composables/use-collab'
import { DEFAULT_COLLAB_STATE } from '@/composables/use-collab'

export function CollabPanel({ collab }: { collab: CollabReturn | null }) {
  const navigate = useNavigate()
  const params = useParams()
  const cls = usePopoverUI({ content: 'z-50 w-72 p-3' })
  const { dialogs } = useI18n()

  const pendingRoomId = (params.roomId as string) || null
  const [popoverOpen, setPopoverOpen] = useState(!!pendingRoomId)
  const [joinInput, setJoinInput] = useState('')
  const [nameDraft, setNameDraft] = useState(collab?.state.value.localName ?? '')
  const [copied, setCopied] = useState(false)

  // Force re-read of Vue reactive collab state
  const [, bump] = useState(0)
  useEffect(() => {
    if (!collab) return
    const id = window.setInterval(() => bump((n) => n + 1), 500)
    return () => clearInterval(id)
  }, [collab])

  const state: CollabState = collab?.state.value ?? DEFAULT_COLLAB_STATE
  const peers: RemotePeer[] = collab?.remotePeers.value ?? []
  const followingPeer = collab?.followingPeer.value ?? null

  const shareUrl = state.roomId ? `${window.location.origin}/share/${state.roomId}` : ''
  const isJoining = !!pendingRoomId && !state.connected

  async function copyLink() {
    if (!shareUrl) return
    await navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    toast.show('Link copied to clipboard')
    setTimeout(() => setCopied(false), 2000)
  }

  function onShare() {
    if (!collab || !nameDraft.trim()) return
    collab.setLocalName(nameDraft.trim())
    const roomId = collab.shareCurrentDoc()
    void navigate(`/share/${roomId}`)
    void navigator.clipboard.writeText(`${window.location.origin}/share/${roomId}`)
    toast.show('Link copied to clipboard')
    setPopoverOpen(false)
  }

  function onJoin() {
    if (!collab) return
    const roomId = pendingRoomId || joinInput.trim().replace(/.*\/share\//, '')
    if (!roomId || !nameDraft.trim()) return
    collab.setLocalName(nameDraft.trim())
    collab.connect(roomId)
    void navigate(`/share/${roomId}`)
    setPopoverOpen(false)
  }

  function onDisconnect() {
    if (!collab) return
    collab.disconnect()
    void navigate('/')
  }

  return (
    <TipProvider>
      <div className="flex w-full items-center justify-end gap-2">
        <div className="flex -space-x-1.5">
          <Tip label={`${state.localName || 'You'} (you)`}>
            <div
              data-test-id="collab-local-avatar"
              className="flex size-6 items-center justify-center rounded-full border-2 border-panel text-[10px] font-semibold text-white"
              style={{ background: colorToCSS(state.localColor) }}
            >
              {initials(state.localName || 'You')}
            </div>
          </Tip>

          {peers.map((peer) => (
            <Tip
              key={peer.clientId}
              label={
                followingPeer === peer.clientId
                  ? `Following ${peer.name} (click to stop)`
                  : `Click to follow ${peer.name}`
              }
            >
              <div
                data-test-id="collab-peer-avatar"
                className={`flex size-6 cursor-pointer items-center justify-center rounded-full border-2 text-[10px] font-semibold text-white transition-all ${
                  followingPeer === peer.clientId
                    ? 'border-white ring-2 ring-white/40'
                    : 'border-panel'
                }`}
                style={{ background: colorToCSS(peer.color) }}
                onClick={() =>
                  collab?.followPeer(followingPeer === peer.clientId ? null : peer.clientId)
                }
              >
                {initials(peer.name)}
              </div>
            </Tip>
          ))}
        </div>

        <div className="flex-1" />

        <Popover.Root open={popoverOpen} onOpenChange={setPopoverOpen}>
          <Popover.Trigger asChild>
            <button
              type="button"
              data-test-id="collab-share-button"
              className={`flex h-7 cursor-pointer items-center gap-1.5 rounded-md border-none px-3 text-xs font-medium transition-colors ${
                state.connected
                  ? 'bg-green-600 text-white hover:bg-green-700'
                  : isJoining
                    ? 'animate-pulse bg-amber-600 text-white'
                    : 'bg-accent text-white hover:bg-accent/90'
              }`}
            >
              <Share2 className="size-3.5" />
              {state.connected
                ? dialogs.connected
                : isJoining
                  ? dialogs.joinRoom
                  : dialogs.share}
            </button>
          </Popover.Trigger>

          <Popover.Portal>
            <Popover.Content
              data-test-id="collab-popover"
              className={cls.content}
              sideOffset={8}
              side="bottom"
              align="end"
            >
              {state.connected ? (
                <>
                  <div className="mb-3 text-xs font-medium text-surface">{dialogs.roomLink}</div>
                  <div className="mb-3 flex items-center gap-1.5">
                    <input
                      value={shareUrl}
                      readOnly
                      data-test-id="collab-room-link"
                      className="min-w-0 flex-1 rounded border border-border bg-input px-2 py-1 text-xs text-surface"
                      onFocus={(e) => e.currentTarget.select()}
                    />
                    <button
                      type="button"
                      data-test-id="collab-copy-link"
                      className="flex h-7 cursor-pointer items-center gap-1 rounded border-none bg-accent px-2 text-xs text-white hover:bg-accent/90"
                      onClick={() => void copyLink()}
                    >
                      {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
                      {copied ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                  <div className="mb-2 text-xs font-medium text-surface">
                    {peers.length + 1} {peers.length === 0 ? 'person' : 'people'} in this room
                  </div>
                  <button
                    type="button"
                    data-test-id="collab-disconnect"
                    className="flex h-7 w-full cursor-pointer items-center justify-center rounded border border-border bg-transparent text-xs text-muted hover:bg-hover hover:text-surface"
                    onClick={onDisconnect}
                  >
                    Disconnect
                  </button>
                </>
              ) : isJoining ? (
                <>
                  <div className="mb-1 text-xs font-medium text-surface">
                    {dialogs.joinCollaboration}
                  </div>
                  <div className="mb-3 text-[11px] text-muted">
                    Someone shared this file with you. Enter your name to join.
                  </div>
                  <div className="mb-3">
                    <label className="mb-1 block text-xs text-muted">{dialogs.yourName}</label>
                    <input
                      value={nameDraft}
                      data-test-id="collab-name-input"
                      className="w-full rounded border border-border bg-input px-2 py-1 text-xs text-surface"
                      placeholder={dialogs.enterYourName}
                      autoFocus
                      onChange={(e) => setNameDraft(e.currentTarget.value)}
                      onKeyDown={(e) => {
                        if (e.code === 'Enter') onJoin()
                      }}
                    />
                  </div>
                  <button
                    type="button"
                    data-test-id="collab-join-button"
                    className="flex h-8 w-full cursor-pointer items-center justify-center gap-1.5 rounded border-none bg-accent text-xs font-medium text-white hover:bg-accent/90 disabled:opacity-50"
                    disabled={!nameDraft.trim()}
                    onClick={onJoin}
                  >
                    <Users className="size-3.5" />
                    Join room
                  </button>
                </>
              ) : (
                <>
                  <div className="mb-3">
                    <label className="mb-1 block text-xs text-muted">{dialogs.yourName}</label>
                    <input
                      value={nameDraft}
                      data-test-id="collab-name-input"
                      className="w-full rounded border border-border bg-input px-2 py-1 text-xs text-surface"
                      placeholder={dialogs.enterYourName}
                      onChange={(e) => setNameDraft(e.currentTarget.value)}
                      onKeyDown={(e) => {
                        if (e.code === 'Enter') onShare()
                      }}
                    />
                  </div>
                  <button
                    type="button"
                    data-test-id="collab-share-file"
                    className="mb-3 flex h-8 w-full cursor-pointer items-center justify-center gap-1.5 rounded border-none bg-accent text-xs font-medium text-white hover:bg-accent/90 disabled:opacity-50"
                    disabled={!nameDraft.trim()}
                    onClick={onShare}
                  >
                    <Share2 className="size-3.5" />
                    {dialogs.shareThisFile}
                  </button>
                  <div className="mb-2 flex items-center gap-2">
                    <div className="h-px flex-1 bg-border" />
                    <span className="text-[11px] text-muted">{dialogs.orJoinRoom}</span>
                    <div className="h-px flex-1 bg-border" />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <input
                      value={joinInput}
                      data-test-id="collab-join-input"
                      className="min-w-0 flex-1 rounded border border-border bg-input px-2 py-1 text-xs text-surface"
                      placeholder={dialogs.pasteRoomLinkOrId}
                      onChange={(e) => setJoinInput(e.currentTarget.value)}
                      onKeyDown={(e) => {
                        if (e.code === 'Enter') onJoin()
                      }}
                    />
                    <button
                      type="button"
                      data-test-id="collab-join-room-button"
                      className="flex h-7 cursor-pointer items-center rounded border-none bg-accent px-3 text-xs text-white hover:bg-accent/90 disabled:opacity-50"
                      disabled={!joinInput.trim() || !nameDraft.trim()}
                      onClick={onJoin}
                    >
                      Join
                    </button>
                  </div>
                </>
              )}
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>
      </div>
    </TipProvider>
  )
}
