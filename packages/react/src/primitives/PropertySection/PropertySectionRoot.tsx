import { useState, type ReactNode } from 'react'
import * as Collapsible from '@radix-ui/react-collapsible'

import { ProvidePropertySection } from '#react/primitives/PropertySection/context'
import type {
  PropertySectionActionAPI,
  PropertySectionContext,
  PropertySectionRootProps,
  PropertySectionSlotProps,
  PropertySectionStateAttrs
} from '#react/primitives/PropertySection/types'

type PropertySectionRootReactProps = PropertySectionRootProps & {
  children?: ReactNode | ((props: PropertySectionSlotProps) => ReactNode)
  className?: string
  [key: string]: unknown
}

export function PropertySectionRoot({
  open: openProp,
  defaultOpen = true,
  empty = false,
  disabled = false,
  unmountOnHide = false,
  children,
  ...attrs
}: PropertySectionRootReactProps) {
  const controlled = openProp !== undefined
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen)
  const open = openProp !== undefined ? openProp : uncontrolledOpen

  function setOpen(value: boolean) {
    if (!controlled) setUncontrolledOpen(value)
  }

  const stateAttrs: PropertySectionStateAttrs = {
    'data-state': open ? 'open' : 'closed',
    ...(empty ? { 'data-empty': '' as const } : {}),
    ...(disabled ? { 'data-disabled': '' as const } : {})
  }

  const actions: PropertySectionActionAPI = {
    open: () => { if (!disabled) setOpen(true) },
    close: () => { if (!disabled) setOpen(false) },
    toggle: () => { if (!disabled) setOpen(!open) }
  }

  const slotProps: PropertySectionSlotProps = { open, empty, stateAttrs, actions }
  const ctx: PropertySectionContext = { open, empty, disabled, stateAttrs, slotProps, actions }

  return (
    <ProvidePropertySection value={ctx}>
      <Collapsible.Root
        {...attrs}
        {...stateAttrs}
        open={open}
        disabled={disabled}
        onOpenChange={setOpen}
        {...(unmountOnHide ? {} : { forceMount: true as const })}
      >
        {typeof children === 'function' ? children(slotProps) : children}
      </Collapsible.Root>
    </ProvidePropertySection>
  )
}
