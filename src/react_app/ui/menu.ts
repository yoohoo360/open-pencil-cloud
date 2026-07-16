import { tv } from 'tailwind-variants'

/** Radix-oriented menu styles mirroring `src/components/ui/menu.ts` (reka-ui). */
export const menu = tv({
  slots: {
    content: 'z-50 rounded-lg border border-border bg-panel p-1 shadow-lg',
    item: 'flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-xs outline-none select-none data-[disabled]:cursor-default data-[disabled]:text-muted/50 data-[highlighted]:bg-hover',
    separator: 'mx-1 my-1 h-px bg-border',
    shortcut: 'text-[11px] text-muted',
    icon: 'size-3 text-muted'
  },
  variants: {
    justify: {
      between: {
        item: 'justify-between gap-6'
      },
      start: {
        item: 'justify-start'
      }
    }
  },
  defaultVariants: {
    justify: 'between'
  }
})

export function menuContent(options?: { class?: string }) {
  return menu().content({ class: options?.class })
}

export function menuItem(options?: { justify?: 'between' | 'start'; class?: string }) {
  return menu(options).item({ class: options?.class })
}

export function menuSeparator(options?: { class?: string }) {
  return menu().separator({ class: options?.class })
}
