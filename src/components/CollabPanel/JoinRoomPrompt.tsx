import { useI18n } from '@open-pencil/react'

import { AppInput } from '@/components/ui/AppInput'
import { useCollabPanelContext } from '@/components/CollabPanel/context'

import IconLucideUsers from '~icons/lucide/users'

export function JoinRoomPrompt() {
  const collab = useCollabPanelContext()
  const { dialogs } = useI18n()

  return (
    <>
      <div className="mb-1 text-xs font-medium text-surface">{dialogs.joinCollaboration}</div>
      <div className="mb-3 text-[11px] text-muted">
        Someone shared this file with you. Enter your name to join.
      </div>

      <div className="mb-3">
        <label className="mb-1 block text-xs text-muted">{dialogs.yourName}</label>
        <AppInput
          value={collab.nameDraft}
          onChange={(e) => collab.setNameDraft(e.target.value)}
          data-test-id="collab-name-input"
          placeholder={dialogs.enterYourName}
          autoFocus
          onKeyDown={(e) => e.key === 'Enter' && collab.joinRoom()}
        />
      </div>

      <button
        data-test-id="collab-join-button"
        className="flex h-8 w-full cursor-pointer items-center justify-center gap-1.5 rounded border-none bg-accent text-xs font-medium text-white hover:bg-accent/90 disabled:opacity-50"
        disabled={!collab.nameDraft.trim()}
        onClick={collab.joinRoom}
      >
        <IconLucideUsers className="size-3.5" />
        Join room
      </button>
    </>
  )
}
