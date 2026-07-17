import { colorToCSS } from '@open-pencil/core/color'
import { useI18n } from '@open-pencil/react'

import { initials } from '@/app/shell/ui'
import { Tip } from '@/components/ui/Tip'
import { useCollabPanelContext } from '@/components/CollabPanel/context'

export function CollabAvatarStack() {
  const collab = useCollabPanelContext()
  const { dialogs } = useI18n()

  return (
    <div className="flex -space-x-1.5">
      <Tip label={`${collab.state.localName || dialogs.you} (${dialogs.youSuffix})`}>
        <div
          data-test-id="collab-local-avatar"
          className="flex size-6 items-center justify-center rounded-full border-2 border-panel text-[10px] font-semibold text-white"
          style={{ background: colorToCSS(collab.state.localColor) }}
        >
          {initials(collab.state.localName || dialogs.you)}
        </div>
      </Tip>

      {collab.peers.map((peer) => (
        <Tip
          key={peer.clientId}
          label={
            collab.followingPeer === peer.clientId
              ? dialogs.followingPeerStop({ name: peer.name })
              : dialogs.clickToFollowPeer({ name: peer.name })
          }
        >
          <div
            data-test-id="collab-peer-avatar"
            className={`flex size-6 cursor-pointer items-center justify-center rounded-full border-2 text-[10px] font-semibold text-white transition-all ${
              collab.followingPeer === peer.clientId
                ? 'border-white ring-2 ring-white/40'
                : 'border-panel'
            }`}
            style={{ background: colorToCSS(peer.color) }}
            onClick={() => collab.toggleFollowPeer(peer.clientId)}
          >
            {initials(peer.name)}
          </div>
        </Tip>
      ))}
    </div>
  )
}
