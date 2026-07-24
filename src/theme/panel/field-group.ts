const panelFieldGroupTheme = {
  slots: {
    root: 'min-w-0',
    label: 'mb-1 block truncate text-[11px] leading-none text-muted',
    container: 'flex min-w-0 flex-col gap-1.5',
    actions:
      'flex h-7 w-[26px] shrink-0 items-center justify-end gap-0.5 [&_[data-slot=icon-button]]:size-6 [&_[data-slot=icon-button]]:rounded'
  }
}

export type PanelFieldGroupTheme = typeof panelFieldGroupTheme
export default panelFieldGroupTheme
