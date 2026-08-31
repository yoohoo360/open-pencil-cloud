import { CollabAvatarStack } from '#react/components/CollabPanel/CollabAvatarStack'
import { useOptionalComments } from '#react/components/Comments/context'
import { IconButton } from '#react/components/ui/IconButton'
import { useI18n } from '#react/i18n'
import { MessageSquare } from 'lucide-react'

export function CollabPanel() {
  const comments = useOptionalComments()
  const { dialogs } = useI18n()
  return (
    <div className="flex w-full items-center justify-end gap-2">
      {comments ? (
        <IconButton
          active={comments.open}
          label={dialogs.comments}
          data-test-id="comments-toggle"
          onClick={() => comments.toggle()}
        >
          <MessageSquare className="size-3.5" />
        </IconButton>
      ) : null}
      <CollabAvatarStack />
    </div>
  )
}
