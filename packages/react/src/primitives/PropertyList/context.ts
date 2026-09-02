import { createContext } from '#react/internal/create-context'
import type { PropertyListContext, PropertyListKey } from './types'

const [usePropertyListCtx, PropertyListProvider] = createContext<PropertyListContext>('PropertyList')

export { PropertyListProvider }

export function usePropertyList<K extends PropertyListKey>(): PropertyListContext<K> {
  return usePropertyListCtx() as PropertyListContext<K>
}

export function usePropertyListPart<K extends PropertyListKey>(propKey: K): PropertyListContext<K> {
  const context = usePropertyList<K>()
  if (context.propKey !== propKey) {
    throw new Error(
      `[open-pencil] PropertyList part propKey must match PropertyListRoot (${propKey})`
    )
  }
  return context
}
