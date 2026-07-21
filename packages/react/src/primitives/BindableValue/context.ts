import { createContext } from '#react/internal/create-context'
import type { BindableValueContext as BindableValueContextValue } from '#react/primitives/BindableValue/types'
import { useContext } from 'react'

export const [useBindableValue, BindableValueProvider, BindableValueReactContext] =
  createContext<BindableValueContextValue>('BindableValue')

export const BINDABLE_VALUE_KEY = BindableValueReactContext

export function provideBindableValue<V>(context: BindableValueContextValue<V>) {
  return context
}

export function useOptionalBindableValue<V>(): BindableValueContextValue<V> | undefined {
  return useContext(BindableValueReactContext) as BindableValueContextValue<V> | undefined
}
