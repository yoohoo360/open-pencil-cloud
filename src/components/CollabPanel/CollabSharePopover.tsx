import * as Popover from '@radix-ui/react-popover'
import { useI18n } from '@open-pencil/react'

import { ConnectedRoom } from '@/components/CollabPanel/ConnectedRoom'
import { JoinRoomPrompt } from '@/components/CollabPanel/JoinRoomPrompt'
import { ShareOrJoinRoom } from '@/components/CollabPanel/ShareOrJoinRoom'
import { useCollabPanelContext } from '@/components/CollabPanel/context'
import { usePopoverUI } from '@/components/ui/popover'

import IconLucideShare2 from '~icons/lucide/share-2'

export function CollabSharePopover() {
  const collab = useCollabPanelContext()
  const { dialogs } = useI18n()
  const cls = usePopoverUI({ content: 'z-50 w-72 p-3' })

  return (
    <Popover.Root open={collab.popoverOpen} onOpenChange={collab.setPopoverOpen}>
      <Popover.Trigger asChild>
        <button
          data-test-id="collab-share-button"
          className={`flex h-7 cursor-pointer items-center gap-1.5 rounded-md border-none px-3 text-xs font-medium transition-colors ${
            collab.state.connected
              ? 'bg-[var(--color-success-bg)] text-white hover:bg-[var(--color-success-bg-hover)]'
              : (collab.isJoining
                ? 'animate-pulse border border-[var(--color-warning-border)] bg-[var(--color-warning-bg)] text-[var(--color-warning-text)]'
                : 'bg-accent text-white hover:bg-accent/90')
          }`}
        >
          <IconLucideShare2 className="size-3.5" />
          {collab.state.connected
            ? dialogs.connected
            : (collab.isJoining ? dialogs.joinRoom : dialogs.share)}
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
          {collab.state.connected ? (
            <ConnectedRoom />
          ) : (collab.isJoining ? (
            <JoinRoomPrompt />
          ) : (
            <ShareOrJoinRoom />
          ))}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
