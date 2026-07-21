import type { BindingProvider } from '#react/controls/binding-provider/types'
import { createContext } from '#react/internal/create-context'
import { useContext } from 'react'

export const [useRequiredBindingProvider, BindingProviderProvider, BINDING_PROVIDER_KEY] =
  createContext<BindingProvider>('open-pencil-binding-provider')

export function provideBindingProvider(provider: BindingProvider) {
  return provider
}

export function useBindingProvider<V>(): BindingProvider<V> | undefined {
  return useContext(BINDING_PROVIDER_KEY) as BindingProvider<V> | undefined
}
