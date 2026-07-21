import { memo, useMemo } from 'react'
import { tv } from 'tailwind-variants'

import { colorToCSS } from '@open-pencil/core/color'
import { useI18n } from '@open-pencil/react'
import { initials } from '@/app/shell/ui'
import { useCollabPanelContext } from '@/components/CollabPanel/context'
import Tip from '@/components/ui/Tip'
import collaborationTheme from '@/theme/collaboration'

export const CollabAvatarStack = memo(function CollabAvatarStack() {
  const collab = useCollabPanelContext()
  const { dialogs } = useI18n()
  const collaboration = tv(collaborationTheme)
  const avatar = useMemo(() => collaboration({ size: 'sm', bordered: true }), [collaboration])

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
        const peerAvatarClass = collaboration({ size: 'sm', bordered: true, following }).avatar()
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
              className={[peerAvatarClass, avatar.peerAvatar()].join(' ')}
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
})

CollabAvatarStack.displayName = 'CollabAvatarStack'
export default CollabAvatarStack
