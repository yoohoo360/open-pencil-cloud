import IconLucideShare2 from '~icons/lucide/share-2'
import { memo } from 'react'

import AppInput from '@/components/ui/AppInput'
import { useCollabPanelContext } from '@/components/CollabPanel/context'

export const ShareOrJoinRoom = memo(function ShareOrJoinRoom() {
  const collab = useCollabPanelContext()

  return (
    <>
      <div className="mb-3">
        <label className="mb-1 block text-xs text-muted">{collab.dialogs.yourName}</label>
        <AppInput
          value={collab.nameDraft}
          onValueChange={collab.setNameDraft}
          data-test-id="collab-name-input"
          placeholder={collab.dialogs.enterYourName}
          onEnter={() => collab.share()}
        />
      </div>

      <button
        type="button"
        data-test-id="collab-share-file"
        className="mb-3 flex h-8 w-full cursor-pointer items-center justify-center gap-1.5 rounded border-none bg-accent text-xs font-medium text-white hover:bg-accent/90 disabled:opacity-50"
        disabled={!collab.nameDraft.trim()}
        onClick={collab.share}
      >
        <IconLucideShare2 className="size-3.5" />
        {collab.dialogs.shareThisFile}
      </button>

      <div className="mb-2 flex items-center gap-2">
        <div className="h-px flex-1 bg-border" />
        <span className="text-[11px] text-muted">{collab.dialogs.orJoinRoom}</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      <div className="flex items-center gap-1.5">
        <AppInput
          value={collab.joinInput}
          onValueChange={collab.setJoinInput}
          data-test-id="collab-join-input"
          placeholder={collab.dialogs.pasteRoomLinkOrId}
          className="min-w-0 flex-1"
          onEnter={() => collab.join()}
        />
        <button
          type="button"
          data-test-id="collab-join-room-button"
          className="flex h-7 cursor-pointer items-center rounded border-none bg-accent px-3 text-xs text-white hover:bg-accent/90 disabled:opacity-50"
          disabled={!collab.joinInput.trim() || !collab.nameDraft.trim()}
          onClick={collab.join}
        >
          Join
        </button>
      </div>
    </>
  )
})

ShareOrJoinRoom.displayName = 'ShareOrJoinRoom'
export default ShareOrJoinRoom
