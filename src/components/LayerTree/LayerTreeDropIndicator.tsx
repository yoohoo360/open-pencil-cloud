import type { LayerDragInstruction } from '@open-pencil/react'

export interface LayerTreeDropIndicatorProps {
  active: boolean
  instruction: LayerDragInstruction | null
  level: number
  indent: number
}

export function LayerTreeDropIndicator({ active, instruction, level, indent }: LayerTreeDropIndicatorProps) {
  if (!active || !instruction) return null

  if (instruction.type === 'make-child') {
    return (
      <div
        className="pointer-events-none absolute inset-y-1 rounded border border-accent bg-accent/10"
        style={{ left: `${level * indent}px`, right: '4px' }}
      />
    )
  }

  return (
    <div
      className={`pointer-events-none absolute h-0.5 bg-accent ${
        instruction.type === 'reorder-below' ? 'bottom-0' : 'top-0'
      }`}
      style={{
        left: `${(level - 1) * indent}px`,
        width: `calc(100% - ${(level - 1) * indent}px)`
      }}
    />
  )
}
