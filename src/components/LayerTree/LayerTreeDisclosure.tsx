import IconLucideChevronRight from '~icons/lucide/chevron-right'
import { memo, useMemo } from 'react'
import { tv } from 'tailwind-variants'

import { useLayerTreeUI } from '@/components/LayerTree/ui'
import layerTreeTheme from '@/theme/layer-tree'

export type LayerTreeDisclosureProps = {
  expanded: boolean
  visible: boolean
  onToggle: () => void
}

export const LayerTreeDisclosure = memo(function LayerTreeDisclosure({
  expanded,
  visible,
  onToggle
}: LayerTreeDisclosureProps) {
  const ui = useLayerTreeUI()
  const layerTree = tv(layerTreeTheme)
  const styles = useMemo(() => layerTree({ expanded }), [expanded, layerTree])

  if (!visible) {
    return (
      <span
        data-slot="disclosure-placeholder"
        className={styles.disclosurePlaceholder({ class: ui?.disclosurePlaceholder })}
      />
    )
  }

  return (
    <button
      type="button"
      data-slot="disclosure"
      data-expanded={expanded || undefined}
      className={styles.disclosure({ class: ui?.disclosure })}
      onClick={(event) => {
        event.stopPropagation()
        onToggle()
      }}
    >
      <IconLucideChevronRight className="size-3" />
    </button>
  )
})

LayerTreeDisclosure.displayName = 'LayerTreeDisclosure'
export default LayerTreeDisclosure
