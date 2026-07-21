import MobileActionToast from '@/components/MobileHud/MobileActionToast'
import MobileActiveToolBadge from '@/components/MobileHud/MobileActiveToolBadge'
import MobileFileMenu from '@/components/MobileHud/MobileFileMenu'
import MobilePresencePopover from '@/components/MobileHud/MobilePresencePopover'
import MobileShareButton from '@/components/MobileHud/MobileShareButton'
import MobileUndoRedo from '@/components/MobileHud/MobileUndoRedo'
import { MobileHudProvider } from '@/components/MobileHud/context'
import { memo } from 'react'

export const MobileHud = memo(function MobileHud() {
  return (
    <MobileHudProvider>
      <div
        className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start px-3 pt-3"
        onTouchStart={(event) => event.stopPropagation()}
      >
        <div className="pointer-events-auto flex flex-col items-start gap-1.5">
          <MobileUndoRedo />
          <MobileActiveToolBadge />
        </div>

        <div className="pointer-events-auto relative mx-auto flex flex-col items-center gap-1.5">
          <MobilePresencePopover />
          <MobileActionToast />
        </div>

        <div className="pointer-events-auto flex items-center gap-1.5">
          <MobileShareButton />
          <MobileFileMenu />
        </div>
      </div>
    </MobileHudProvider>
  )
})

MobileHud.displayName = 'MobileHud'
export default MobileHud
