import { tv } from 'tailwind-variants'

export const popover = tv({
  slots: {
    content: 'z-[100] rounded-lg border border-border bg-panel shadow-xl',
    header: '',
    body: '',
    footer: ''
  }
})

interface PopoverUi {
  content?: string
  header?: string
  body?: string
  footer?: string
}

export function usePopoverUI(ui?: PopoverUi) {
  const cls = popover()
  return {
    content: cls.content({ class: ui?.content }),
    header: cls.header({ class: ui?.header }),
    body: cls.body({ class: ui?.body }),
    footer: cls.footer({ class: ui?.footer })
  }
}
