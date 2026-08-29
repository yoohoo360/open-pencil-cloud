import { createContext, useContext, type Context, type ReactNode } from 'react'

import type { BindableValueContext } from '#react/primitives/BindableValue/types'

export const BINDABLE_VALUE_KEY: Context<BindableValueContext | null> =
  createContext<BindableValueContext | null>(null)

export function useBindableValue<V>(): BindableValueContext<V> {
  const context = useContext(BINDABLE_VALUE_KEY)
  if (!context) {
    throw new Error('[open-pencil] BindableValue part must be used inside BindableValueRoot')
  }
  return context as BindableValueContext<V>
}

export function useOptionalBindableValue<V>(): BindableValueContext<V> | undefined {
  const context = useContext(BINDABLE_VALUE_KEY)
  return (context as BindableValueContext<V> | null) ?? undefined
}

/** Nested numeric fields (fill opacity) must not inherit a sibling color binding. */
export function IsolatedFromBinding({ children }: { children: ReactNode }) {
  return <BINDABLE_VALUE_KEY.Provider value={null}>{children}</BINDABLE_VALUE_KEY.Provider>
}
