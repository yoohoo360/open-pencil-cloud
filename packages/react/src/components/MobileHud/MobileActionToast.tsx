import { useMobileHudContext } from '#react/components/MobileHud/context'

export function MobileActionToast() {
  const hud = useMobileHudContext()
  if (!hud.actionToast) return null
  return (
    <div className="flex h-8 items-center rounded-full border border-accent/20 bg-panel/70 px-3 shadow-md backdrop-blur-xl">
      <span className="text-xs whitespace-nowrap text-accent">{hud.actionToast}</span>
    </div>
  )
}
