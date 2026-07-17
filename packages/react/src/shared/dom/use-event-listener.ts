import { useEffect, useRef, type RefObject } from 'react'

type Target = Window | Document | HTMLElement | null | undefined

/**
 * Attach a DOM listener. Accepts a React ref, reactive-style `{ value }`, or a
 * direct target. Handler identity can change every render without resubscribing
 * when `deps` is omitted (uses latest-handler ref).
 */
export function useEventListener<K extends keyof HTMLElementEventMap>(
  target: RefObject<HTMLElement | null> | { value: HTMLElement | null } | Target | (() => Target),
  type: K,
  handler: (event: HTMLElementEventMap[K]) => void,
  options?: boolean | AddEventListenerOptions
): void
export function useEventListener(
  target: RefObject<EventTarget | null> | { value: EventTarget | null } | Target | (() => Target),
  type: string,
  handler: (event: Event) => void,
  options?: boolean | AddEventListenerOptions
): void {
  const handlerRef = useRef(handler)
  handlerRef.current = handler

  useEffect(() => {
    const resolve = (): EventTarget | null | undefined => {
      if (typeof target === 'function') return target() as EventTarget | null
      if (target && typeof target === 'object' && 'current' in target) return target.current
      if (target && typeof target === 'object' && 'value' in target) return target.value
      return target as EventTarget | null | undefined
    }

    const el = resolve()
    if (!el) return undefined

    const listener = (event: Event) => {
      handlerRef.current(event)
    }
    el.addEventListener(type, listener, options)
    return () => {
      el.removeEventListener(type, listener, options)
    }
  }, [target, type, options])
}
