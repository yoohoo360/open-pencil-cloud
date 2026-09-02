import { createContext } from '#react/internal/create-context'
import type { BindableValueContext } from '#react/primitives/BindableValue/types'

const [useBindableValueCtx, BindableValueProvider, useOptionalBindableValueCtx] =
  createContext<BindableValueContext>('BindableValue')

export { BindableValueProvider }

export function useBindableValue<V>(): BindableValueContext<V> {
  return useBindableValueCtx() as BindableValueContext<V>
}

export function useOptionalBindableValue<V>(): BindableValueContext<V> | null {
  return useOptionalBindableValueCtx() as BindableValueContext<V> | null
}
