import IconLucideShare2 from '~icons/lucide/share-2'
import * as Popover from '@radix-ui/react-popover'
import { memo, useMemo } from 'react'
import { tv } from 'tailwind-variants'

import ConnectedRoom from '@/components/CollabPanel/ConnectedRoom'
import JoinRoomPrompt from '@/components/CollabPanel/JoinRoomPrompt'
import ShareOrJoinRoom from '@/components/CollabPanel/ShareOrJoinRoom'
import { useCollabPanelContext } from '@/components/CollabPanel/context'
import { usePopoverUI } from '@/components/ui/popover'
import collaborationTheme from '@/theme/collaboration'

export const CollabSharePopover = memo(function CollabSharePopover() {
  const collab = useCollabPanelContext()
  const cls = usePopoverUI({ content: 'z-50 w-72 p-3' })
  const connection = collab.state.connected ? 'connected' : collab.isJoining ? 'joining' : 'idle'
  const collaboration = tv(collaborationTheme)
  const styles = useMemo(() => collaboration({ connection }), [collaboration, connection])

  return (
    <Popover.Root open={collab.popoverOpen} onOpenChange={collab.setPopoverOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          data-test-id="collab-share-button"
          data-connection={connection}
          className={styles.shareButton()}
        >
          <IconLucideShare2 className="size-3.5" />
          {collab.state.connected
            ? collab.dialogs.connected
            : collab.isJoining
              ? collab.dialogs.joinRoom
              : collab.dialogs.share}
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
          ) : collab.isJoining ? (
            <JoinRoomPrompt />
          ) : (
            <ShareOrJoinRoom />
          )}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
})

CollabSharePopover.displayName = 'CollabSharePopover'
export default CollabSharePopover
