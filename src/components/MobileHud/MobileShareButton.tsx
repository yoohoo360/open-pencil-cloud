import IconLucideShare2 from '~icons/lucide/share-2'
import { memo } from 'react'

import { useMobileHudContext } from '@/components/MobileHud/context'

export const MobileShareButton = memo(function MobileShareButton() {
  const hud = useMobileHudContext()

  return (
    <button
      type="button"
      className="flex h-8 cursor-pointer items-center gap-1.5 rounded-full border border-white/10 bg-panel/70 px-3 shadow-md backdrop-blur-xl select-none active:bg-hover"
      onClick={hud.share}
    >
      <IconLucideShare2 className="size-3.5 text-surface" />
      <span className="text-xs text-surface">{hud.dialogs.share}</span>
    </button>
  )
})

MobileShareButton.displayName = 'MobileShareButton'
export default MobileShareButton
