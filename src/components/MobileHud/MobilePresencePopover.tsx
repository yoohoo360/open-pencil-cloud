import * as Popover from '@radix-ui/react-popover'
import { memo, useMemo } from 'react'
import { tv } from 'tailwind-variants'

import { colorToCSS } from '@open-pencil/core/color'
import { initials } from '@/app/shell/ui'
import { useMobileHudContext } from '@/components/MobileHud/context'
import collaborationTheme from '@/theme/collaboration'

export const MobilePresencePopover = memo(function MobilePresencePopover() {
  const hud = useMobileHudContext()
  const collaboration = tv(collaborationTheme)
  const styles = useMemo(() => collaboration({ size: 'md' }), [collaboration])

  if (!hud.collabState.connected) return null

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button type="button" className={styles.presenceTrigger()}>
          <span className={styles.presenceDot()} />
          <span className="text-xs text-surface">Online: {hud.onlineCount}</span>
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          modal={false}
          sideOffset={8}
          side="bottom"
          align="center"
          className={styles.presenceContent()}
        >
          <div className="mb-2 text-[11px] tracking-wider text-muted uppercase">In this room</div>
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <div
                className={styles.avatar()}
                style={{ background: colorToCSS(hud.collabState.localColor) }}
              >
                {initials(hud.collabState.localName || 'You')}
              </div>
              <span className="min-w-0 flex-1 truncate text-xs text-surface">
                {hud.collabState.localName || 'You'}
              </span>
              <span className="text-[10px] text-muted">you</span>
            </div>

            {hud.collabPeers.map((peer) => {
              const following = hud.followingPeer === peer.clientId
              const peerAvatarClass = collaboration({ size: 'md', following }).avatar()
              return (
                <div
                  key={peer.clientId}
                  data-following={following || undefined}
                  className={styles.peerRow()}
                  onClick={() => hud.toggleFollowPeer(peer.clientId)}
                >
                  <div
                    className={[peerAvatarClass, styles.peerAvatar()].join(' ')}
                    style={{ background: colorToCSS(peer.color) }}
                  >
                    {initials(peer.name)}
                  </div>
                  <span className="min-w-0 flex-1 truncate text-xs text-surface">{peer.name}</span>
                  {following ? <span className="text-[10px] text-accent">following</span> : null}
                </div>
              )
            })}
          </div>

          <button type="button" className={styles.disconnect()} onClick={hud.disconnect}>
            Disconnect
          </button>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
})

MobilePresencePopover.displayName = 'MobilePresencePopover'
export default MobilePresencePopover
