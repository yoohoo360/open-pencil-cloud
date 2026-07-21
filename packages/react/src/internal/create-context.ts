import {
  createContext as createReactContext,
  useContext,
  type Context,
  type Provider,
  type ReactNode
} from 'react'

export function createContext<T>(name: string): readonly [
  () => T,
  Provider<T | null>,
  Context<T | null>
] {
  const Ctx = createReactContext<T | null>(null)
  Ctx.displayName = name

  function useCtx(): T {
    const value = useContext(Ctx)
    if (value == null) {
      throw new Error(
        `[open-pencil] Context \`${name}\` not found. Component must be used within the corresponding Provider.`
      )
    }
    return value
  }

  return [useCtx, Ctx.Provider, Ctx] as const
}

export type ContextProviderProps<T> = {
  value: T
  children?: ReactNode
}
