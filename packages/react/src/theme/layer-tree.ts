const layerTreeTheme = {
  slots: {
    row: 'group/row relative flex w-full cursor-pointer items-center gap-1.5 rounded py-0.5 pr-2 text-left text-[11px] text-surface hover:bg-hover data-selected:bg-panel-selected-muted data-selected:hover:bg-panel-selected-muted data-selected:data-focused:bg-panel-selected data-selected:data-focused:text-white data-selected:data-focused:hover:bg-panel-selected data-dragging:opacity-30 data-[drop-position=child]:bg-accent/15 data-[drop-position=child]:hover:bg-accent/15',
    disclosure:
      'flex w-4 shrink-0 cursor-pointer items-center justify-center text-muted transition-transform hover:text-surface data-expanded:rotate-90 group-data-selected/row:group-data-focused/row:text-white',
    disclosurePlaceholder: 'w-4 shrink-0',
    icon: 'size-3 shrink-0 text-muted group-data-selected/row:group-data-focused/row:text-white',
    label: 'min-w-0 flex-1 truncate',
    dropIndicator: 'pointer-events-none absolute bg-accent'
  },
  variants: {
    dropPosition: {
      child: {
        dropIndicator: 'inset-y-1 rounded border border-accent bg-accent/10'
      },
      above: { dropIndicator: 'top-0 h-0.5' },
      below: { dropIndicator: 'bottom-0 h-0.5' }
    }
  }
}

export type LayerTreeTheme = typeof layerTreeTheme
export default layerTreeTheme
