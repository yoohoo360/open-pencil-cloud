import { createContext } from '#react/internal/create-context'
import type { NumberFieldContext } from '#react/primitives/NumberField/types'

export const [useNumberField, provideNumberField] = createContext<NumberFieldContext>('NumberField')

export { provideNumberField as NumberFieldProvider }
