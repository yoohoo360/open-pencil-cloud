import { twMerge } from 'tailwind-merge'
import { tv } from 'tailwind-variants'

const trigger = tv({
  base: 'flex items-center justify-between border border-border bg-input text-surface outline-none hover:bg-hover'
})

const content = tv({
  base: 'z-[110] min-w-[var(--radix-select-trigger-width)] overflow-hidden border border-border bg-panel',
  variants: {
    radius: {
      md: 'rounded-md',
      lg: 'rounded-lg'
    },
    elevation: {
      lg: 'shadow-lg',
      xl: 'shadow-xl'
    },
    padding: {
      none: '',
      sm: 'p-0.5',
      md: 'p-1'
    }
  },
  defaultVariants: {
    radius: 'md',
    elevation: 'lg',
    padding: 'sm'
  }
})

const item = tv({
  base: 'relative flex cursor-pointer items-center text-surface outline-none data-[highlighted]:bg-hover'
})

interface SelectUi {
  trigger?: string
  content?: string
  item?: string
}

export function useSelectUI(ui?: SelectUi) {
  return {
    trigger: twMerge(trigger(), ui?.trigger),
    content: twMerge(content(), ui?.content),
    item: twMerge(item(), ui?.item)
  }
}

export function selectTrigger(options?: { className?: string }) {
  return twMerge(trigger(), options?.className)
}

export function selectContent(options?: {
  radius?: 'md' | 'lg'
  elevation?: 'lg' | 'xl'
  padding?: 'none' | 'sm' | 'md'
  className?: string
}) {
  return twMerge(content(options), options?.className)
}

export function selectItem(options?: { className?: string }) {
  return twMerge(item(), options?.className)
}
