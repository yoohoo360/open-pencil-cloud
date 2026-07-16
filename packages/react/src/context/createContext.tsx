import { createContext as createReactContext, useContext, type ReactNode } from 'react'

export function createContext<T>(name: string) {
  const Ctx = createReactContext<T | null>(null)
  Ctx.displayName = name

  function Provider({ value, children }: { value: T; children: ReactNode }) {
    return <Ctx.Provider value={value}>{children}</Ctx.Provider>
  }

  function useCtx(): T {
    const value = useContext(Ctx)
    if (value == null) {
      throw new Error(
        `[open-pencil] Context \`${name}\` not found. Component must be used within the corresponding Provider.`
      )
    }
    return value
  }

  return [useCtx, Provider] as const
}
