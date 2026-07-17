import { createContext } from '#react/internal/create-context'
import type { SegmentedControlContext } from '#react/primitives/SegmentedControl/types'

export const [useSegmentedControl, ProvideSegmentedControl] =
  createContext<SegmentedControlContext>('SegmentedControl')
