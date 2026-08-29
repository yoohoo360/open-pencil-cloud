import { Share2 } from 'lucide-react'

import { useMobileHudContext } from '#react/components/MobileHud/context'

export function MobileShareButton() {
  const hud = useMobileHudContext()
  return (
    <button
      type="button"
      className="flex h-8 cursor-pointer items-center gap-1.5 rounded-full border border-white/10 bg-panel/70 px-3 shadow-md backdrop-blur-xl select-none active:bg-hover"
      onClick={hud.share}
    >
      <Share2 className="size-3.5 text-surface" />
      <span className="text-xs text-surface">{hud.dialogs.share}</span>
    </button>
  )
}
