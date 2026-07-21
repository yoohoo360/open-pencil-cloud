import type { ReactNode } from 'react'

export type LayoutControlsRootSlotProps = Record<string, unknown> & { actions: object }

export interface LayoutControlsRootSlots {
  /** Current layout state and mutation actions for the active selection. */
  default(props: LayoutControlsRootSlotProps): ReactNode
}
