import { useMobileHudContext } from '#react/components/MobileHud/context'

export function MobileActiveToolBadge() {
  const hud = useMobileHudContext()
  const Icon = hud.activeToolIcon
  return (
    <div className="flex size-8 items-center justify-center rounded-full border border-accent/20 bg-panel/70 shadow-md backdrop-blur-xl transition-colors duration-200">
      <Icon className="size-3.5 text-accent" />
    </div>
  )
}
