import { tv } from 'tailwind-variants'

import { useMobileHudContext } from '#react/components/MobileHud/context'
import collaborationTheme from '#react/theme/collaboration'

export function MobilePresencePopover() {
  const hud = useMobileHudContext()
  const styles = tv(collaborationTheme)({ size: 'md' })
  if (!hud.collabState.connected) return null
  return (
    <button type="button" className={styles.presenceTrigger()}>
      <span className={styles.presenceDot()} />
      <span className="text-xs text-surface">Online: {hud.onlineCount}</span>
    </button>
  )
}
