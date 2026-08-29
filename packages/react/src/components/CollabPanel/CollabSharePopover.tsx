import { Share2 } from 'lucide-react'
import { tv } from 'tailwind-variants'

import { useCollabPanelContext } from '#react/components/CollabPanel/context'
import { usePopoverUI } from '#react/components/ui/popover'
import collaborationTheme from '#react/theme/collaboration'

export function CollabSharePopover() {
  const collab = useCollabPanelContext()
  const cls = usePopoverUI({ content: 'z-50 w-72 p-3' })
  const connection = collab.state.connected ? 'connected' : collab.isJoining ? 'joining' : 'idle'
  const styles = tv(collaborationTheme)({ connection })
  const label = collab.state.connected
    ? collab.dialogs.connected
    : collab.isJoining
      ? collab.dialogs.joinRoom
      : collab.dialogs.share

  return (
    <div className="relative">
      <button
        type="button"
        data-test-id="collab-share-button"
        data-connection={connection}
        className={styles.shareButton()}
        onClick={() => collab.setPopoverOpen(!collab.popoverOpen)}
      >
        <Share2 className="size-3.5" />
        {label}
      </button>
      {collab.popoverOpen ? (
        <div data-test-id="collab-popover" className={`absolute right-0 z-20 mt-2 ${cls.content}`}>
          <p className="text-[11px] text-muted">{collab.dialogs.share}</p>
        </div>
      ) : null}
    </div>
  )
}
