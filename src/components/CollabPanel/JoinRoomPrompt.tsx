import IconLucideUsers from '~icons/lucide/users'
import { memo } from 'react'

import AppInput from '@/components/ui/AppInput'
import { useCollabPanelContext } from '@/components/CollabPanel/context'

export const JoinRoomPrompt = memo(function JoinRoomPrompt() {
  const collab = useCollabPanelContext()

  return (
    <>
      <div className="mb-1 text-xs font-medium text-surface">{collab.dialogs.joinCollaboration}</div>
      <div className="mb-3 text-[11px] text-muted">
        Someone shared this file with you. Enter your name to join.
      </div>

      <div className="mb-3">
        <label className="mb-1 block text-xs text-muted">{collab.dialogs.yourName}</label>
        <AppInput
          value={collab.nameDraft}
          onValueChange={collab.setNameDraft}
          data-test-id="collab-name-input"
          placeholder={collab.dialogs.enterYourName}
          autoFocus
          onEnter={() => collab.join()}
        />
      </div>

      <button
        type="button"
        data-test-id="collab-join-button"
        className="flex h-8 w-full cursor-pointer items-center justify-center gap-1.5 rounded border-none bg-accent text-xs font-medium text-white hover:bg-accent/90 disabled:opacity-50"
        disabled={!collab.nameDraft.trim()}
        onClick={collab.join}
      >
        <IconLucideUsers className="size-3.5" />
        Join room
      </button>
    </>
  )
})

JoinRoomPrompt.displayName = 'JoinRoomPrompt'
export default JoinRoomPrompt
