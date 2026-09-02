/**
 * Lightweight ref/computed boxes used by SDK helpers that previously relied on
 * Vue reactivity. These are plain getters — React components must subscribe via
 * {@link useEditorStore} / {@link useSceneSnapshot} to re-render.
 */

export type ReactiveRef<T> = { value: T }

export function ref<T>(value: T): ReactiveRef<T> {
  return { value }
}

export function shallowRef<T>(value: T): ReactiveRef<T> {
  return { value }
}

export function computed<T>(fn: () => T): ReactiveRef<T> {
  return {
    get value() {
      return fn()
    },
    set value(_next: T) {
      throw new Error('[open-pencil] computed refs are read-only')
    }
  }
}

export type MaybeRefOrGetter<T> = T | ReactiveRef<T> | (() => T)

export function toValue<T>(source: MaybeRefOrGetter<T>): T {
  if (typeof source === 'function') return (source as () => T)()
  if (source && typeof source === 'object' && 'value' in source) {
    return source.value
  }
  return source
}
