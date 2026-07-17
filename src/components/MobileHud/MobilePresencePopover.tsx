import * as Popover from '@radix-ui/react-popover'

import { colorToCSS } from '@open-pencil/core/color'
import { initials } from '@/app/shell/ui'
import { useMobileHudContext } from '@/components/MobileHud/context'

export function MobilePresencePopover() {
  const hud = useMobileHudContext()

  if (!hud.collabState.connected) return null

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button className="flex h-8 cursor-pointer items-center gap-1.5 rounded-full border border-white/10 bg-panel/70 px-3 shadow-md backdrop-blur-xl select-none active:bg-hover">
          <span className="size-2 rounded-full bg-green-500" />
          <span className="text-xs text-surface">Online: {hud.onlineCount}</span>
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          sideOffset={8}
          side="bottom"
          align="center"
          className="z-50 w-56 rounded-xl border border-border bg-panel p-3 shadow-xl"
        >
          <div className="mb-2 text-[11px] tracking-wider text-muted uppercase">In this room</div>
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <div
                className="flex size-7 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold text-white"
                style={{ background: colorToCSS(hud.collabState.localColor) }}
              >
                {initials(hud.collabState.localName || 'You')}
              </div>
              <span className="min-w-0 flex-1 truncate text-xs text-surface">
                {hud.collabState.localName || 'You'}
              </span>
              <span className="text-[10px] text-muted">you</span>
            </div>

            {hud.collabPeers.map((peer) => (
              <div
                key={peer.clientId}
                className="flex cursor-pointer items-center gap-2 rounded-md px-0.5 py-0.5 select-none active:bg-hover"
                onClick={() => hud.toggleFollowPeer(peer.clientId)}
              >
                <div
                  className={`flex size-7 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold text-white ${hud.followingPeer === peer.clientId ? 'ring-2 ring-white/40' : ''}`}
                  style={{ background: colorToCSS(peer.color) }}
                >
                  {initials(peer.name)}
                </div>
                <span className="min-w-0 flex-1 truncate text-xs text-surface">{peer.name}</span>
                {hud.followingPeer === peer.clientId && (
                  <span className="text-[10px] text-accent">following</span>
                )}
              </div>
            ))}
          </div>

          <button
            className="mt-3 flex h-7 w-full cursor-pointer items-center justify-center rounded border border-border bg-transparent text-xs text-muted select-none active:bg-hover"
            onClick={hud.disconnect}
          >
            Disconnect
          </button>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
