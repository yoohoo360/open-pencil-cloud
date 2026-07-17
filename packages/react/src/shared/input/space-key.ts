import { useEventListener } from '#react/shared/dom/use-event-listener'
import { ref } from '#react/internal/reactive'
export function useSpaceHeld() {
  const spaceHeld = ref(false)
  useEventListener(window, 'keydown', (event: KeyboardEvent) => {
    if (event.code === 'Space') spaceHeld.value = true
  })
  useEventListener(window, 'keyup', (event: KeyboardEvent) => {
    if (event.code === 'Space') spaceHeld.value = false
  })
  return spaceHeld
}
