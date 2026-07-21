import { memo } from 'react'

import { useMobileHudContext } from '@/components/MobileHud/context'

export const MobileActionToast = memo(function MobileActionToast() {
  const hud = useMobileHudContext()

  if (!hud.actionToast) return null

  return (
    <div className="flex h-8 animate-in fade-in items-center rounded-full border border-accent/20 bg-panel/70 px-3 shadow-md backdrop-blur-xl duration-150">
      <span className="text-xs whitespace-nowrap text-accent">{hud.actionToast}</span>
    </div>
  )
})

MobileActionToast.displayName = 'MobileActionToast'
export default MobileActionToast
