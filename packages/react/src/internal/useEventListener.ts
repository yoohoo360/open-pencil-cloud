import { useEffect, type RefObject } from 'react'

type Target = Window | Document | HTMLElement | null | undefined
type TargetRef = RefObject<HTMLElement | null> | { current: HTMLElement | null }

function resolveTarget(target: Target | TargetRef | (() => Target)): Target {
  if (typeof target === 'function') return target()
  if (target && typeof target === 'object' && 'current' in target) return target.current
  return target
}

/**
 * Attach a DOM event listener, re-binding when the target element changes.
 * Drop-in replacement for VueUse's useEventListener without Vue deps.
 */
export function useEventListener<K extends keyof HTMLElementEventMap>(
  target: Target | TargetRef | (() => Target),
  event: K,
  listener: (ev: HTMLElementEventMap[K]) => void,
  options?: boolean | AddEventListenerOptions
): void
export function useEventListener<K extends keyof WindowEventMap>(
  target: Window | (() => Window | null | undefined),
  event: K,
  listener: (ev: WindowEventMap[K]) => void,
  options?: boolean | AddEventListenerOptions
): void
export function useEventListener<K extends keyof DocumentEventMap>(
  target: Document | (() => Document | null | undefined),
  event: K,
  listener: (ev: DocumentEventMap[K]) => void,
  options?: boolean | AddEventListenerOptions
): void
export function useEventListener(
  target: Target | TargetRef | (() => Target),
  event: string,
  listener: (ev: Event) => void,
  options?: boolean | AddEventListenerOptions
): void {
  useEffect(() => {
    const el = resolveTarget(target)
    if (!el) return
    el.addEventListener(event, listener, options)
    return () => el.removeEventListener(event, listener, options)
  })
}

/** Imperative (non-hook) event listener — returns a disposer. */
export function addEventListener(
  target: Target,
  event: string,
  listener: (ev: Event) => void,
  options?: boolean | AddEventListenerOptions
): () => void {
  if (!target) return () => {}
  target.addEventListener(event, listener, options)
  return () => target.removeEventListener(event, listener, options)
}
