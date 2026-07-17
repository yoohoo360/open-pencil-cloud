import { selectTarget, useI18n } from '@open-pencil/react'

import { AppInput } from '@/components/ui/AppInput'
import { useCollabPanelContext } from '@/components/CollabPanel/context'

import IconLucideCheck from '~icons/lucide/check'
import IconLucideCopy from '~icons/lucide/copy'

export function ConnectedRoom() {
  const collab = useCollabPanelContext()
  const { dialogs } = useI18n()

  return (
    <>
      <div className="mb-3 text-xs font-medium text-surface">{dialogs.roomLink}</div>
      <div className="mb-3 flex items-center gap-1.5">
        <AppInput
          value={collab.shareUrl}
          readOnly
          data-test-id="collab-room-link"
          className="min-w-0 flex-1"
          onFocus={selectTarget}
        />
        <button
          data-test-id="collab-copy-link"
          className="flex h-7 cursor-pointer items-center gap-1 rounded border-none bg-accent px-2 text-xs text-white hover:bg-accent/90"
          onClick={collab.copyLink}
        >
          {collab.copied ? (
            <IconLucideCheck className="size-3" />
          ) : (
            <IconLucideCopy className="size-3" />
          )}
          {collab.copied ? 'Copied' : 'Copy'}
        </button>
      </div>

      <div className="mb-2 text-xs font-medium text-surface">
        {collab.peers.length + 1} {collab.peers.length === 0 ? 'person' : 'people'} in this room
      </div>

      <button
        data-test-id="collab-disconnect"
        className="flex h-7 w-full cursor-pointer items-center justify-center rounded border border-border bg-transparent text-xs text-muted hover:bg-hover hover:text-surface"
        onClick={collab.disconnect}
      >
        Disconnect
      </button>
    </>
  )
}
