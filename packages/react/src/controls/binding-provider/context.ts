import { createContext } from '#react/internal/create-context'
import type { BindingProvider } from '#react/controls/binding-provider/types'

const [_useBindingProviderCtx, BindingProviderContextProvider, useOptionalBindingProvider] =
  createContext<BindingProvider>('BindingProvider')

export { BindingProviderContextProvider }

export function provideBindingProvider(_provider: BindingProvider) {
  throw new Error(
    '[open-pencil] provideBindingProvider() is Vue-only. Wrap with <BindingProviderContextProvider value={provider}>.'
  )
}

export function useBindingProvider<V>(): BindingProvider<V> | null {
  return useOptionalBindingProvider() as BindingProvider<V> | null
}
