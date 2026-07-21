import { createContext } from '#react/internal/create-context'

import type { PropertyListContext, PropertyListKey } from './types'

const [usePropertyListContext, PropertyListProvider] =
  createContext<PropertyListContext>('PropertyList')

export function providePropertyList<K extends PropertyListKey>(context: PropertyListContext<K>) {
  return context
}

export function usePropertyList<K extends PropertyListKey>(): PropertyListContext<K> {
  return usePropertyListContext() as PropertyListContext<K>
}

export { PropertyListProvider }

export function usePropertyListPart<K extends PropertyListKey>(propKey: K): PropertyListContext<K> {
  const context = usePropertyList<K>()
  if (context.propKey !== propKey) {
    throw new Error(
      `[open-pencil] PropertyList part propKey must match PropertyListRoot (${propKey})`
    )
  }
  return context
}
