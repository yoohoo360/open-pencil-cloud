import { memo, useCallback, useMemo, useState, type HTMLAttributes, type ReactNode } from 'react'

import { PropertySectionProvider } from '#react/primitives/PropertySection/context'
import type {
  PropertySectionActionAPI,
  PropertySectionRootProps,
  PropertySectionSlotProps,
  PropertySectionStateAttrs
} from '#react/primitives/PropertySection/types'

export type PropertySectionRootComponentProps = PropertySectionRootProps &
  Omit<HTMLAttributes<HTMLDivElement>, 'children'> & {
    children?: ReactNode | ((props: PropertySectionSlotProps) => ReactNode)
    onOpenChange?: (open: boolean) => void
  }

export const PropertySectionRoot = memo(function PropertySectionRoot({
  open: openProp,
  defaultOpen = true,
  empty = false,
  disabled = false,
  unmountOnHide = false,
  children,
  onOpenChange,
  ...props
}: PropertySectionRootComponentProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen)
  const open = openProp ?? uncontrolledOpen
  const setOpen = useCallback(
    (value: boolean) => {
      if (disabled) return
      if (openProp === undefined) setUncontrolledOpen(value)
      onOpenChange?.(value)
    },
    [disabled, onOpenChange, openProp]
  )
  const actions = useMemo<PropertySectionActionAPI>(
    () => ({ open: () => setOpen(true), close: () => setOpen(false), toggle: () => setOpen(!open) }),
    [open, setOpen]
  )
  const stateAttrs = useMemo<PropertySectionStateAttrs>(
    () => ({
      'data-state': open ? 'open' : 'closed',
      'data-empty': empty ? '' : undefined,
      'data-disabled': disabled ? '' : undefined
    }),
    [disabled, empty, open]
  )
  const slotProps = useMemo<PropertySectionSlotProps>(
    () => ({ open, empty, stateAttrs, actions }),
    [actions, empty, open, stateAttrs]
  )
  const context = useMemo(
    () => ({ open, empty, disabled, unmountOnHide, stateAttrs, slotProps, actions }),
    [actions, disabled, empty, open, stateAttrs, slotProps, unmountOnHide]
  )

  return (
    <PropertySectionProvider value={context}>
      <div {...props} {...stateAttrs}>{typeof children === 'function' ? children(slotProps) : children}</div>
    </PropertySectionProvider>
  )
})

PropertySectionRoot.displayName = 'PropertySectionRoot'
