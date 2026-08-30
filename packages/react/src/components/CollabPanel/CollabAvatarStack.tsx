import { useCollabPanelContext } from '#react/components/CollabPanel/context'
import { Tip } from '#react/components/ui/Tip'
import { initials } from '#react/constants'
import { useI18n } from '#react/i18n'
import collaborationTheme from '#react/theme/collaboration'
import { tv } from 'tailwind-variants'

import { colorToCSS } from '@open-pencil/core/color'

export function CollabAvatarStack() {
  const collab = useCollabPanelContext()
  const { dialogs } = useI18n()
  const collaboration = tv(collaborationTheme)
  const avatar = collaboration({ size: 'sm', bordered: true })

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
      {collab.peers.map((peer) => {
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
    </div>
  )
}
