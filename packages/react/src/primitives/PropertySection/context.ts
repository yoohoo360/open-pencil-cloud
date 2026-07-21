import { createContext } from '#react/internal/create-context'
import type { PropertySectionContext } from '#react/primitives/PropertySection/types'

export const [usePropertySection, PropertySectionProvider] =
  createContext<PropertySectionContext>('PropertySection')
