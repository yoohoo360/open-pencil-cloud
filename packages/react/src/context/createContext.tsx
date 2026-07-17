import {
  createContext as createReactContext,
  useContext,
  type ReactNode
} from 'react'

/**
 * Reka-style context factory for headless primitives.
 *
 * Returns `[useContext, Provider]` — call use* inside descendants of Provider.
 */
export function createContext<ContextValue>(name: string) {
  const Ctx = createReactContext<ContextValue | null>(null)
  Ctx.displayName = name

  function Provider({ value, children }: { value: ContextValue; children: ReactNode }) {
    return <Ctx.Provider value={value}>{children}</Ctx.Provider>
  }
  Provider.displayName = `${name}Provider`

  function useInjectedContext(): ContextValue {
    const value = useContext(Ctx)
    if (value == null) {
      throw new Error(
        `[open-pencil] Injection \`${name}\` not found. Component must be used within the corresponding Root.`
      )
    }
    return value
  }

  return [useInjectedContext, Provider] as const
}
