import { memo, useMemo } from 'react'
import { tv } from 'tailwind-variants'

import type { LayerDragInstruction } from '@open-pencil/react'
import { useLayerTreeUI } from '@/components/LayerTree/ui'
import layerTreeTheme from '@/theme/layer-tree'

export type LayerTreeDropIndicatorProps = {
  active: boolean
  instruction: LayerDragInstruction | null
  level: number
  indent: number
}

export const LayerTreeDropIndicator = memo(function LayerTreeDropIndicator({
  active,
  instruction,
  level,
  indent
}: LayerTreeDropIndicatorProps) {
  const ui = useLayerTreeUI()
  const layerTree = tv(layerTreeTheme)

  const position = useMemo(() => {
    if (!instruction) return null
    if (instruction.type === 'make-child') return 'child' as const
    return instruction.type === 'reorder-above' ? ('above' as const) : ('below' as const)
  }, [instruction])

  const indicatorStyle = useMemo(() => {
    if (position === 'child') return { left: `${level * indent}px`, right: '4px' }
    const offset = (level - 1) * indent
    return { left: `${offset}px`, width: `calc(100% - ${offset}px)` }
  }, [indent, level, position])

  const styles = useMemo(
    () => layerTree({ dropPosition: position ?? undefined }),
    [layerTree, position]
  )

  if (!active || !position) return null

  return (
    <div
      data-slot="drop-indicator"
      data-drop-position={position}
      className={styles.dropIndicator({ class: ui?.dropIndicator })}
      style={indicatorStyle}
    />
  )
})

LayerTreeDropIndicator.displayName = 'LayerTreeDropIndicator'
export default LayerTreeDropIndicator
