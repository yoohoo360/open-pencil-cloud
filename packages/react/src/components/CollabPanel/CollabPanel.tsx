import { CollabAvatarStack } from '#react/components/CollabPanel/CollabAvatarStack'
import { CollabSharePopover } from '#react/components/CollabPanel/CollabSharePopover'
import { CollabPanelProvider } from '#react/components/CollabPanel/context'

export function CollabPanel() {
  return (
    <CollabPanelProvider>
      <div className="flex w-full items-center justify-end gap-2">
        <CollabAvatarStack />
        <div className="flex-1" />
        <CollabSharePopover />
      </div>
    </CollabPanelProvider>
  )
}
