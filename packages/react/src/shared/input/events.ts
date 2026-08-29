import type { MutableRef } from '#react/shared/input/ref'

export function onTarget(
  target: EventTarget | null,
  type: string,
  listener: EventListener,
  options?: AddEventListenerOptions
): () => void {
  if (!target) return () => {}
  target.addEventListener(type, listener, options)
  return () => target.removeEventListener(type, listener, options)
}

/** VueUse `useEventListener(ref, …)` equivalent: bind to the element currently in the ref. */
export function onRefTarget(
  targetRef: MutableRef<EventTarget | null>,
  type: string,
  listener: EventListener,
  options?: AddEventListenerOptions
): () => void {
  return onTarget(targetRef.current, type, listener, options)
}

export function joinCleanups(...cleanups: Array<(() => void) | void>): () => void {
  return () => {
    for (const cleanup of cleanups) cleanup?.()
  }
}
