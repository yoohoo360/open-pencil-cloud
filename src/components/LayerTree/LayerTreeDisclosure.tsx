import IconLucideChevronRight from '~icons/lucide/chevron-right'

export interface LayerTreeDisclosureProps {
  expanded: boolean
  visible: boolean
  onToggle?: () => void
}

export function LayerTreeDisclosure({ expanded, visible, onToggle }: LayerTreeDisclosureProps) {
  if (!visible) return <span className="w-4 shrink-0" />
  return (
    <button
      type="button"
      className={`flex w-4 shrink-0 cursor-pointer items-center justify-center text-muted transition-transform hover:text-surface ${expanded ? 'rotate-90' : 'rotate-0'}`}
      onClick={(e) => { e.stopPropagation(); onToggle?.() }}
    >
      <IconLucideChevronRight className="size-3" />
    </button>
  )
}
