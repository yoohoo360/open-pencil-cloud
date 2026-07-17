import type { ReactNode, ElementType } from 'react'

export interface PropertySectionRootProps {
  /** Controlled expanded state. */
  open?: boolean
  /** Initial expanded state when uncontrolled. @default true */
  defaultOpen?: boolean
  /** Marks the section as having no current items. @default false */
  empty?: boolean
  /** Prevents the section from being toggled. @default false */
  disabled?: boolean
  /** Keep collapsed content mounted in the DOM. @default false */
  unmountOnHide?: boolean
}

export interface PropertySectionPartProps {
  as?: ElementType
  asChild?: boolean
}

export interface PropertySectionStateAttrs {
  'data-state': 'open' | 'closed'
  'data-empty'?: ''
  'data-disabled'?: ''
}

export interface PropertySectionActionAPI {
  open(): void
  close(): void
  toggle(): void
}

export interface PropertySectionSlotProps {
  open: boolean
  empty: boolean
  stateAttrs: PropertySectionStateAttrs
  actions: PropertySectionActionAPI
}

export interface PropertySectionRootSlots {
  children?: ReactNode | ((props: PropertySectionSlotProps) => ReactNode)
}

export interface PropertySectionContext {
  open: boolean
  empty: boolean
  disabled: boolean
  stateAttrs: PropertySectionStateAttrs
  slotProps: PropertySectionSlotProps
  actions: PropertySectionActionAPI
}
