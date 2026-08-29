const layerTreeTheme = {
  slots: {
    row: 'group/row relative flex w-full cursor-pointer items-center gap-1.5 rounded py-0.5 pr-2 text-left text-[11px] text-surface hover:bg-hover',
    icon: 'size-3 shrink-0 text-muted',
    label: 'min-w-0 flex-1 truncate',
    dropIndicator: 'pointer-events-none absolute bg-accent'
  },
  variants: {
    selected: {
      true: { row: 'bg-panel-selected-muted hover:bg-panel-selected-muted' },
      false: {}
    },
    dragging: {
      true: { row: 'opacity-30' },
      false: {}
    },
    childDropTarget: {
      true: { row: 'bg-accent/15 hover:bg-accent/15' },
      false: {}
    },
    dropPosition: {
      child: {
        dropIndicator: 'inset-y-1 rounded border border-accent bg-accent/10'
      },
      above: { dropIndicator: 'top-0 h-0.5' },
      below: { dropIndicator: 'bottom-0 h-0.5' }
    }
  },
  defaultVariants: {
    selected: false,
    dragging: false,
    childDropTarget: false
  }
}

export type LayerTreeTheme = typeof layerTreeTheme
export default layerTreeTheme
