import {
  createContext as createReactContext,
  useContext,
  type ReactNode
} from 'react'

/**
 * Reka-style context factory used by headless primitives.
 * Returns `[useContext, Provider]` — Provider is a React component.
 */
export function createContext<T>(name: string) {
  const ReactContext = createReactContext<T | null>(null)
  ReactContext.displayName = name

  function Provider({ value, children }: { value: T; children?: ReactNode }) {
    return <ReactContext.Provider value={value}>{children}</ReactContext.Provider>
  }
  Provider.displayName = `${name}Provider`

  const useInjected = (): T => {
    const value = useContext(ReactContext)
    if (value == null) {
      throw new Error(
        `[open-pencil] Context \`${name}\` not found. Component must be used within the corresponding Root.`
      )
    }
    return value
  }

  /** Optional inject — returns null when outside provider. */
  const useOptional = (): T | null => useContext(ReactContext)

  return [useInjected, Provider, useOptional] as const
}
