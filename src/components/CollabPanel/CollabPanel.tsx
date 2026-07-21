import { memo } from 'react'

import CollabAvatarStack from '@/components/CollabPanel/CollabAvatarStack'
import CollabSharePopover from '@/components/CollabPanel/CollabSharePopover'
import { CollabPanelProvider } from '@/components/CollabPanel/context'

export const CollabPanel = memo(function CollabPanel() {
  return (
    <CollabPanelProvider>
      <div className="flex w-full items-center justify-end gap-2">
        <CollabAvatarStack />
        <div className="flex-1" />
        <CollabSharePopover />
      </div>
    </CollabPanelProvider>
  )
})

CollabPanel.displayName = 'CollabPanel'
export default CollabPanel
