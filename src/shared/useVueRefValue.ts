import {
  useSyncExternalStore,
  type MutableRefObject,
  type RefObject
} from 'react'

function isReactRefObject<T>(source: unknown): source is RefObject<T> {
  return typeof source === 'object' && source != null && 'current' in source
}

/**
 * Subscribe to a mutable box from React.
 * Supports React `RefObject` (`.current`) and legacy `{ value }` boxes.
 */
export function useReactiveValue<T>(source: RefObject<T> | { value: T }): T {
  const read = () => (isReactRefObject<T>(source) ? source.current : source.value) as T

  return useSyncExternalStore(
    (onStoreChange) => {
      let prev = read()
      let frame = 0
      const tick = () => {
        const next = read()
        if (!Object.is(next, prev)) {
          prev = next
          onStoreChange()
        }
        frame = requestAnimationFrame(tick)
      }
      frame = requestAnimationFrame(tick)
      return () => cancelAnimationFrame(frame)
    },
    read,
    read
  )
}

/** @deprecated Alias kept for call-site migration. */
export const useVueRefValue = useReactiveValue

/** Bridge a React ref object to a `.value` box for legacy helpers. */
export function useRefValueBridge<T>(reactRef: RefObject<T | null>) {
  return {
    get value() {
      return reactRef.current
    },
    set value(next: T | null) {
      ;(reactRef as MutableRefObject<T | null>).current = next
    }
  } as { value: T | null }
}

/** @deprecated Alias kept for call-site migration. */
export const useVueRefBridge = useRefValueBridge
