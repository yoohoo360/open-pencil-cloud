import { memo, useMemo } from 'react'

import { useMobileHudContext } from '@/components/MobileHud/context'
import { useVueRefValue } from '@/shared/useVueRefValue'

export const MobileActiveToolBadge = memo(function MobileActiveToolBadge() {
  const hud = useMobileHudContext()
  const activeTool = useVueRefValue({ get value() { return hud.store.state.activeTool } })
  const ActiveToolIcon = useMemo(() => hud.activeToolIcon, [hud.activeToolIcon])

  return (
    <div className="flex size-8 items-center justify-center rounded-full border border-accent/20 bg-panel/70 shadow-md backdrop-blur-xl transition-colors duration-200">
      <ActiveToolIcon key={activeTool} className="size-3.5 text-accent" />
    </div>
  )
})

MobileActiveToolBadge.displayName = 'MobileActiveToolBadge'
export default MobileActiveToolBadge
