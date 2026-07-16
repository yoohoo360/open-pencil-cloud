import { twMerge } from 'tailwind-merge'
import { tv } from 'tailwind-variants'

const iconButtonStyles = tv({
  base: 'flex cursor-pointer items-center justify-center rounded border-none bg-transparent text-muted hover:bg-hover hover:text-surface',
  variants: {
    size: {
      sm: 'size-5 text-sm leading-none',
      md: 'size-7 border border-border bg-input'
    }
  },
  defaultVariants: { size: 'sm' }
})

export function iconButton(options?: { size?: 'sm' | 'md'; className?: string }): string {
  return twMerge(iconButtonStyles({ size: options?.size }), options?.className)
}
