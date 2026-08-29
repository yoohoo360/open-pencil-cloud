import { joinCleanups, onTarget } from '#react/shared/input/events'
import type { MutableRef } from '#react/shared/input/ref'

export function setupSpaceHeld(spaceHeld: MutableRef<boolean>): () => void {
  function onKeyDown(event: KeyboardEvent) {
    if (event.code === 'Space') spaceHeld.current = true
  }
  function onKeyUp(event: KeyboardEvent) {
    if (event.code === 'Space') spaceHeld.current = false
  }
  return joinCleanups(
    onTarget(window, 'keydown', onKeyDown as EventListener),
    onTarget(window, 'keyup', onKeyUp as EventListener),
    () => {
      spaceHeld.current = false
    }
  )
}
