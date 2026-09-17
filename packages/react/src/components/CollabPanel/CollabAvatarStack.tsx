import { useCollabPanelContext } from '#react/components/CollabPanel/context'
import { Tip } from '#react/components/ui/Tip'
import { initials } from '#react/constants'
import { useI18n } from '#react/i18n'
import collaborationTheme from '#react/theme/collaboration'
import { tv } from 'tailwind-variants'

import { colorToCSS } from '@open-pencil/core/color'

const DEFAULT_MAX_VISIBLE = 3

export function CollabAvatarStack({ maxVisible = DEFAULT_MAX_VISIBLE }: { maxVisible?: number }) {
  const collab = useCollabPanelContext()
  const { dialogs } = useI18n()
  const collaboration = tv(collaborationTheme)
  const avatar = collaboration({ size: 'sm', bordered: true })

  const peers = collab.peers
  const total = 1 + peers.length
  const needsOverflow = total > maxVisible
  const peerSlots = needsOverflow ? Math.max(0, maxVisible - 2) : peers.length
  const visiblePeers = peers.slice(0, peerSlots)
  const hiddenCount = needsOverflow ? peers.length - visiblePeers.length : 0

  return (
    <div className="flex -space-x-1.5">
      <Tip label={`${collab.state.localName || dialogs.you} (${dialogs.youSuffix})`}>
        <div
          data-test-id="collab-local-avatar"
          className={avatar.avatar()}
          style={{ background: colorToCSS(collab.state.localColor) }}
        >
          {initials(collab.state.localName || dialogs.you)}
        </div>
      </Tip>
      {visiblePeers.map((peer) => {
        const following = collab.followingPeer === peer.clientId
        const peerAvatar = collaboration({ size: 'sm', bordered: true, following })
        return (
          <Tip
            key={peer.clientId}
            label={
              following
                ? dialogs.followingPeerStop({ name: peer.name })
                : dialogs.clickToFollowPeer({ name: peer.name })
            }
          >
            <div
              data-test-id="collab-peer-avatar"
              data-following={following || undefined}
              className={`${peerAvatar.avatar()} ${avatar.peerAvatar()}`}
              style={{ background: colorToCSS(peer.color) }}
              onClick={() => collab.toggleFollowPeer(peer.clientId)}
            >
              {initials(peer.name)}
            </div>
          </Tip>
        )
      })}
      {hiddenCount > 0 ? (
        <Tip
          label={peers
            .slice(visiblePeers.length)
            .map((peer) => peer.name)
            .join(', ')}
        >
          <div
            data-test-id="collab-overflow-avatar"
            className={`${avatar.avatar()} bg-[#085ca0] text-[9px] font-semibold text-white`}
          >
            +{hiddenCount}
          </div>
        </Tip>
      ) : null}
    </div>
  )
}
