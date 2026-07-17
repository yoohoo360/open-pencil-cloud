import { useI18n } from '@open-pencil/react'

import { AppInput } from '@/components/ui/AppInput'
import { useCollabPanelContext } from '@/components/CollabPanel/context'

import IconLucideShare2 from '~icons/lucide/share-2'

export function ShareOrJoinRoom() {
  const collab = useCollabPanelContext()
  const { dialogs } = useI18n()

  return (
    <>
      <div className="mb-3">
        <label className="mb-1 block text-xs text-muted">{dialogs.yourName}</label>
        <AppInput
          value={collab.nameDraft}
          onChange={(e) => collab.setNameDraft(e.target.value)}
          data-test-id="collab-name-input"
          placeholder={dialogs.enterYourName}
          onKeyDown={(e) => e.key === 'Enter' && collab.share()}
        />
      </div>

      <button
        data-test-id="collab-share-file"
        className="mb-3 flex h-8 w-full cursor-pointer items-center justify-center gap-1.5 rounded border-none bg-accent text-xs font-medium text-white hover:bg-accent/90 disabled:opacity-50"
        disabled={!collab.nameDraft.trim()}
        onClick={collab.share}
      >
        <IconLucideShare2 className="size-3.5" />
        {dialogs.shareThisFile}
      </button>

      <div className="mb-2 flex items-center gap-2">
        <div className="h-px flex-1 bg-border" />
        <span className="text-[11px] text-muted">{dialogs.orJoinRoom}</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      <div className="flex items-center gap-1.5">
        <AppInput
          value={collab.joinInput}
          onChange={(e) => collab.setJoinInput(e.target.value)}
          data-test-id="collab-join-input"
          placeholder={dialogs.pasteRoomLinkOrId}
          className="min-w-0 flex-1"
          onKeyDown={(e) => e.key === 'Enter' && collab.joinRoom()}
        />
        <button
          data-test-id="collab-join-room-button"
          className="flex h-7 cursor-pointer items-center rounded border-none bg-accent px-3 text-xs text-white hover:bg-accent/90 disabled:opacity-50"
          disabled={!collab.joinInput.trim() || !collab.nameDraft.trim()}
          onClick={collab.joinRoom}
        >
          Join
        </button>
      </div>
    </>
  )
}
