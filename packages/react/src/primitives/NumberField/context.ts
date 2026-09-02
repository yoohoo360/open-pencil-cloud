import { createContext } from '#react/internal/create-context'
import type { NumberFieldContext } from '#react/primitives/NumberField/types'

export const [useNumberField, NumberFieldProvider] = createContext<NumberFieldContext>('NumberField')

/** @deprecated Use NumberFieldProvider */
export const provideNumberField = NumberFieldProvider
