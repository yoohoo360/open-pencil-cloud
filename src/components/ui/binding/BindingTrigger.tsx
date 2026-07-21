import { Slot } from '@radix-ui/react-slot'
import IconLucideDiamond from '~icons/lucide/diamond'
import IconLucideDiamondPlus from '~icons/lucide/diamond-plus'
import {
  createElement,
  memo,
  useMemo,
  type ButtonHTMLAttributes,
  type ElementType,
  type ReactNode
} from 'react'
import { twMerge } from 'tailwind-merge'
import type { BindingState } from '@open-pencil/react'

import { useBindingFieldUI, type BindingFieldUI } from '@/components/ui/binding/ui'

export type BindingTriggerProps = {
  as?: ElementType
  asChild?: boolean
  label: string
  state?: BindingState
  open?: boolean
  disabled?: boolean
  derived?: boolean
  className?: string
  ui?: BindingFieldUI
  children?: ReactNode
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'>

export const BindingTrigger = memo(function BindingTrigger({
  as: As = 'button',
  asChild = false,
  label,
  state = 'unbound',
  open = false,
  disabled = false,
  derived = false,
  className,
  ui,
  children,
  ...rest
}: BindingTriggerProps) {
  const styles = useMemo(
    () =>
      useBindingFieldUI(
        { state, open, disabled, derived },
        { ...ui, trigger: twMerge(ui?.trigger, className) }
      ),
    [className, derived, disabled, open, state, ui]
  )

  const content =
    children ??
    (state === 'bound' ? (
      <IconLucideDiamond className="size-3" />
    ) : (
      <IconLucideDiamondPlus className="size-3" />
    ))

  const attrs = {
    ...rest,
    className: styles.trigger,
    type: !asChild && As === 'button' ? ('button' as const) : undefined,
    disabled: !asChild && As === 'button' ? disabled : undefined,
    'aria-label': label,
    'aria-disabled': disabled ? 'true' : undefined,
    'data-state': state,
    'data-open': open ? '' : undefined,
    'data-disabled': disabled ? '' : undefined,
    'data-derived': derived ? '' : undefined,
    'data-slot': 'trigger'
  }

  if (asChild) {
    return <Slot {...attrs}>{content}</Slot>
  }

  return createElement(As, attrs, content)
})

BindingTrigger.displayName = 'BindingTrigger'
export default BindingTrigger
