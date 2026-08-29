import { tv } from 'tailwind-variants'

import type { LayerDragInstruction } from '#react/components/LayerTree/apply'
import theme from '#react/theme/layer-tree'

export function DropIndicator({
  active,
  instruction,
  level,
  indent
}: {
  active: boolean
  instruction: LayerDragInstruction | null
  level: number
  indent: number
}) {
  if (!active || !instruction) return null
  const position = instruction.type === 'make-child' ? 'child' : instruction.type === 'reorder-above' ? 'above' : 'below'
  const style =
    position === 'child'
      ? { left: `${level * indent}px`, right: '4px' }
      : {
          left: `${Math.max(0, (level - 1) * indent)}px`,
          width: `calc(100% - ${Math.max(0, (level - 1) * indent)}px)`
        }
  return (
    <div
      data-slot="drop-indicator"
      data-drop-position={position}
      className={tv(theme)({ dropPosition: position }).dropIndicator()}
      style={style}
    />
  )
}
